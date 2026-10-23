-- Reconcile current achievement state from current source data and preserve
-- lifecycle events separately. This migration is intentionally additive.
BEGIN;

CREATE TABLE IF NOT EXISTS public.achievement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_definition_id uuid NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  achievement_level_id uuid REFERENCES public.achievement_levels(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('unlocked', 'upgraded', 'revoked', 'downgraded', 're_unlocked')),
  previous_level_id uuid REFERENCES public.achievement_levels(id) ON DELETE SET NULL,
  new_level_id uuid REFERENCES public.achievement_levels(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS achievement_events_user_time_idx
  ON public.achievement_events (user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.achievement_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL UNIQUE REFERENCES public.achievement_events(id) ON DELETE CASCADE,
  achievement_definition_id uuid NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  achievement_level_id uuid REFERENCES public.achievement_levels(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS achievement_notifications_user_unread_idx
  ON public.achievement_notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.achievement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.achievement_events, public.achievement_notifications FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.achievement_events, public.achievement_notifications TO authenticated;
GRANT UPDATE (is_read, read_at) ON TABLE public.achievement_notifications TO authenticated;

DROP POLICY IF EXISTS achievement_events_read_own ON public.achievement_events;
CREATE POLICY achievement_events_read_own ON public.achievement_events
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS achievement_notifications_read_own ON public.achievement_notifications;
CREATE POLICY achievement_notifications_read_own ON public.achievement_notifications
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS achievement_notifications_mark_own_read ON public.achievement_notifications;
CREATE POLICY achievement_notifications_mark_own_read ON public.achievement_notifications
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.refresh_achievements_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'A user is required to refresh achievements'; END IF;

  -- Serialize refreshes for one user, including concurrent browser tabs and triggers.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  DROP TABLE IF EXISTS _achievement_before;
  DROP TABLE IF EXISTS _achievement_eligible;
  DROP TABLE IF EXISTS _achievement_inserted;
  CREATE TEMP TABLE _achievement_before ON COMMIT DROP AS
  SELECT ua.achievement_definition_id, max(level.level_order)::smallint AS level_order,
         (array_agg(ua.achievement_level_id ORDER BY level.level_order DESC NULLS LAST))[1] AS level_id
  FROM public.user_achievements ua
  LEFT JOIN public.achievement_levels level ON level.id = ua.achievement_level_id
  WHERE ua.user_id = p_user_id
  GROUP BY ua.achievement_definition_id;

  CREATE TEMP TABLE _achievement_eligible ON COMMIT DROP AS
  SELECT definition.id AS achievement_definition_id, level.id AS achievement_level_id
  FROM public.achievement_metrics_for_user(p_user_id) metric
  JOIN public.achievement_definitions definition ON definition.unlock_rule_type = metric.metric_type
  JOIN public.achievement_categories category ON category.id = definition.category_id AND category.is_active
  JOIN public.achievement_levels level ON level.achievement_definition_id = definition.id
    AND level.threshold_value <= metric.metric_value
  WHERE definition.is_active AND NOT definition.is_hidden;
  INSERT INTO _achievement_eligible (achievement_definition_id, achievement_level_id)
  SELECT definition.id, NULL
  FROM public.achievement_metrics_for_user(p_user_id) metric
  JOIN public.achievement_definitions definition ON definition.unlock_rule_type = metric.metric_type
  JOIN public.achievement_categories category ON category.id = definition.category_id AND category.is_active
  WHERE definition.badge_type = 'standalone' AND definition.is_active AND NOT definition.is_hidden
    AND metric.metric_value > 0
    AND NOT EXISTS (SELECT 1 FROM public.achievement_levels level WHERE level.achievement_definition_id = definition.id);

  -- Current state is derived, so levels no longer supported by current data are removed.
  DELETE FROM public.user_achievements ua
  WHERE ua.user_id = p_user_id
    AND NOT EXISTS (SELECT 1 FROM _achievement_eligible e
                    WHERE e.achievement_definition_id = ua.achievement_definition_id
                      AND e.achievement_level_id IS NOT DISTINCT FROM ua.achievement_level_id);

  CREATE TEMP TABLE _achievement_inserted (
    achievement_definition_id uuid,
    achievement_level_id uuid
  ) ON COMMIT DROP;

  WITH inserted AS (
    INSERT INTO public.user_achievements (user_id, achievement_definition_id, achievement_level_id, achieved_at, unlocked_at)
    SELECT p_user_id, e.achievement_definition_id, e.achievement_level_id, now(), now()
    FROM _achievement_eligible e
    ON CONFLICT (user_id, achievement_definition_id, achievement_level_id) DO NOTHING
    RETURNING achievement_definition_id, achievement_level_id
  ) INSERT INTO _achievement_inserted SELECT * FROM inserted;

  -- Record loss of a series or a high tier, but never create a celebration notification for it.
  INSERT INTO public.achievement_events (user_id, achievement_definition_id, event_type, previous_level_id, new_level_id, metadata)
  SELECT p_user_id, before.achievement_definition_id,
    CASE WHEN after_state.level_id IS NULL THEN 'revoked' ELSE 'downgraded' END,
    before.level_id, after_state.level_id,
    jsonb_build_object('previous_level_order', before.level_order,
      'new_level_order', coalesce(after_state.level_order, 0))
  FROM _achievement_before before
  LEFT JOIN LATERAL (
    SELECT max(level.level_order)::smallint AS level_order,
           (array_agg(ua.achievement_level_id ORDER BY level.level_order DESC NULLS LAST))[1] AS level_id
    FROM public.user_achievements ua
    LEFT JOIN public.achievement_levels level ON level.id = ua.achievement_level_id
    WHERE ua.user_id = p_user_id AND ua.achievement_definition_id = before.achievement_definition_id
  ) after_state ON true
  WHERE before.level_order IS NOT NULL
    AND (after_state.level_order IS NULL OR after_state.level_order < before.level_order);

  INSERT INTO public.achievement_events (
    user_id, achievement_definition_id, achievement_level_id, event_type,
    previous_level_id, new_level_id, metadata
  )
  SELECT p_user_id, inserted.achievement_definition_id, inserted.achievement_level_id,
    CASE
      WHEN before.achievement_definition_id IS NULL AND EXISTS (
        SELECT 1 FROM public.achievement_events old
        WHERE old.user_id = p_user_id AND old.achievement_definition_id = inserted.achievement_definition_id
          AND old.event_type IN ('unlocked', 'upgraded', 're_unlocked')
      ) THEN 're_unlocked'
      WHEN before.level_order IS NULL THEN 'unlocked'
      ELSE 'upgraded'
    END,
    before.level_id, inserted.achievement_level_id,
    jsonb_build_object('level_order', level.level_order)
  FROM _achievement_inserted inserted
  LEFT JOIN public.achievement_levels level ON level.id = inserted.achievement_level_id
  LEFT JOIN _achievement_before before ON before.achievement_definition_id = inserted.achievement_definition_id;

  INSERT INTO public.achievement_notifications (
    user_id, event_id, achievement_definition_id, achievement_level_id, event_type
  )
  SELECT event.user_id, event.id, event.achievement_definition_id,
    event.achievement_level_id, event.event_type
  FROM public.achievement_events event
  LEFT JOIN public.achievement_notifications notification ON notification.event_id = event.id
  WHERE event.user_id = p_user_id
    AND notification.id IS NULL
    AND event.event_type IN ('unlocked', 'upgraded', 're_unlocked');

  -- Remove featured entries for revoked series and safely fall back display levels.
  UPDATE public.user_achievement_featured_preferences preference
  SET featured_definition_ids = coalesce((
      SELECT array_agg(id ORDER BY position)
      FROM unnest(preference.featured_definition_ids) WITH ORDINALITY AS featured(id, position)
      WHERE EXISTS (SELECT 1 FROM public.user_achievements ua
                    WHERE ua.user_id = p_user_id AND ua.achievement_definition_id = featured.id)
    ), '{}'::uuid[]),
    display_level_keys = coalesce((
      SELECT jsonb_object_agg(entry.key, entry.value)
      FROM jsonb_each_text(preference.display_level_keys) entry
      WHERE EXISTS (
        SELECT 1 FROM public.user_achievements ua
        JOIN public.achievement_levels level ON level.id = ua.achievement_level_id
        WHERE ua.user_id = p_user_id AND ua.achievement_definition_id = entry.key::uuid
          AND level.level_key::text = entry.value
      )
    ), '{}'::jsonb),
    updated_at = now()
  WHERE preference.user_id = p_user_id;
END;
$function$;

ALTER FUNCTION public.refresh_achievements_for_user(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.refresh_achievements_for_user(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_my_achievements()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required to refresh achievements' USING ERRCODE = '42501'; END IF;
  PERFORM public.refresh_achievements_for_user(auth.uid());
END;
$function$;
ALTER FUNCTION public.refresh_my_achievements() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.refresh_my_achievements() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_my_achievements() TO authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_achievement_user_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_achievements_for_user(OLD.user_id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.refresh_achievements_for_user(OLD.user_id);
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN PERFORM public.refresh_achievements_for_user(NEW.user_id); END IF;
  ELSE
    PERFORM public.refresh_achievements_for_user(NEW.user_id);
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$function$;
ALTER FUNCTION public.reconcile_achievement_user_trigger() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reconcile_achievement_user_trigger() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS flights_reconcile_achievements ON public.flights;
CREATE TRIGGER flights_reconcile_achievements AFTER INSERT OR UPDATE OR DELETE ON public.flights
FOR EACH ROW EXECUTE FUNCTION public.reconcile_achievement_user_trigger();
DROP TRIGGER IF EXISTS daily_challenge_reconcile_achievements ON public.daily_challenge_completions;
CREATE TRIGGER daily_challenge_reconcile_achievements AFTER INSERT OR UPDATE OR DELETE ON public.daily_challenge_completions
FOR EACH ROW EXECUTE FUNCTION public.reconcile_achievement_user_trigger();
DROP TRIGGER IF EXISTS memorial_reconcile_achievements ON public.memorial_participation;
CREATE TRIGGER memorial_reconcile_achievements AFTER INSERT OR UPDATE OR DELETE ON public.memorial_participation
FOR EACH ROW EXECUTE FUNCTION public.reconcile_achievement_user_trigger();

COMMIT;
