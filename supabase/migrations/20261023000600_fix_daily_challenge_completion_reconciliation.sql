-- Keep Daily Challenge completion writes independent from malformed legacy
-- display-level preference keys. The reconciliation trigger runs in the same
-- transaction as the completion write, so an unsafe UUID cast here would roll
-- back an otherwise valid INSERT or DELETE.
BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_achievements_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'A user is required to refresh achievements';
  END IF;

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
    AND NOT EXISTS (
      SELECT 1 FROM public.achievement_levels level
      WHERE level.achievement_definition_id = definition.id
    );

  DELETE FROM public.user_achievements ua
  WHERE ua.user_id = p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM _achievement_eligible e
      WHERE e.achievement_definition_id = ua.achievement_definition_id
        AND e.achievement_level_id IS NOT DISTINCT FROM ua.achievement_level_id
    );

  CREATE TEMP TABLE _achievement_inserted (
    achievement_definition_id uuid,
    achievement_level_id uuid
  ) ON COMMIT DROP;

  WITH inserted AS (
    INSERT INTO public.user_achievements (user_id, achievement_definition_id, achievement_level_id, achieved_at, unlocked_at)
    SELECT p_user_id, e.achievement_definition_id, e.achievement_level_id, now(), now()
    FROM _achievement_eligible e
    ON CONFLICT DO NOTHING
    RETURNING achievement_definition_id, achievement_level_id
  )
  INSERT INTO _achievement_inserted SELECT * FROM inserted;

  INSERT INTO public.achievement_events (
    user_id, achievement_definition_id, event_type, previous_level_id, new_level_id, metadata
  )
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
    WHERE ua.user_id = p_user_id
      AND ua.achievement_definition_id = before.achievement_definition_id
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
        WHERE old.user_id = p_user_id
          AND old.achievement_definition_id = inserted.achievement_definition_id
          AND old.event_type IN ('unlocked', 'upgraded', 're_unlocked')
      ) THEN 're_unlocked'
      WHEN before.level_order IS NULL THEN 'unlocked'
      ELSE 'upgraded'
    END,
    before.level_id, inserted.achievement_level_id,
    jsonb_build_object('level_order', level.level_order)
  FROM _achievement_inserted inserted
  LEFT JOIN public.achievement_levels level ON level.id = inserted.achievement_level_id
  LEFT JOIN _achievement_before before
    ON before.achievement_definition_id = inserted.achievement_definition_id;

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

  UPDATE public.user_achievement_featured_preferences preference
  SET featured_definition_ids = coalesce((
      SELECT array_agg(id ORDER BY position)
      FROM unnest(preference.featured_definition_ids) WITH ORDINALITY AS featured(id, position)
      WHERE EXISTS (
        SELECT 1 FROM public.user_achievements ua
        WHERE ua.user_id = p_user_id AND ua.achievement_definition_id = featured.id
      )
    ), '{}'::uuid[]),
    display_level_keys = coalesce((
      SELECT jsonb_object_agg(entry.key, entry.value)
      FROM jsonb_each_text(preference.display_level_keys) entry
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN entry.key ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
          THEN entry.key::uuid
          ELSE NULL::uuid
        END AS definition_id
      ) parsed
      WHERE EXISTS (
        SELECT 1
        FROM public.user_achievements ua
        JOIN public.achievement_levels level ON level.id = ua.achievement_level_id
        WHERE ua.user_id = p_user_id
          AND ua.achievement_definition_id = parsed.definition_id
          AND level.level_key::text = entry.value
      )
    ), '{}'::jsonb),
    updated_at = now()
  WHERE preference.user_id = p_user_id;
END;
$function$;

ALTER FUNCTION public.refresh_achievements_for_user(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.refresh_achievements_for_user(uuid) FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
