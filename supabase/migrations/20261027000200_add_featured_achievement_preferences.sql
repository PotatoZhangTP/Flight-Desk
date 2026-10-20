BEGIN;

CREATE OR REPLACE FUNCTION public.uuid_array_is_unique(values uuid[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = pg_catalog
AS $function$
  SELECT cardinality(values) = cardinality(ARRAY(SELECT DISTINCT value FROM unnest(values) AS value));
$function$;

CREATE TABLE IF NOT EXISTS public.user_achievement_featured_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  featured_definition_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_achievement_featured_preferences_max_five
    CHECK (cardinality(featured_definition_ids) <= 5),
  CONSTRAINT user_achievement_featured_preferences_unique_ids
    CHECK (public.uuid_array_is_unique(featured_definition_ids))
);

ALTER TABLE public.user_achievement_featured_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_achievement_featured_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_achievement_featured_preferences TO authenticated;

DROP POLICY IF EXISTS user_achievement_featured_preferences_read_own ON public.user_achievement_featured_preferences;
CREATE POLICY user_achievement_featured_preferences_read_own
  ON public.user_achievement_featured_preferences
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_achievement_featured_preferences_insert_own ON public.user_achievement_featured_preferences;
CREATE POLICY user_achievement_featured_preferences_insert_own
  ON public.user_achievement_featured_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_achievement_featured_preferences_update_own ON public.user_achievement_featured_preferences;
CREATE POLICY user_achievement_featured_preferences_update_own
  ON public.user_achievement_featured_preferences
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_achievement_featured_preferences_delete_own ON public.user_achievement_featured_preferences;
CREATE POLICY user_achievement_featured_preferences_delete_own
  ON public.user_achievement_featured_preferences
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

COMMIT;
