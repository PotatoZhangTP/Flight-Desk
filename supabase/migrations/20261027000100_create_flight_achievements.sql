-- Flight Achievements: phase one
-- Only Flight Milestones / Frequent Flyer is enabled in this migration.

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.flights') IS NULL THEN
    RAISE EXCEPTION 'Flight Achievements requires public.flights';
  END IF;

  IF to_regprocedure('public.is_site_admin()') IS NULL THEN
    RAISE EXCEPTION 'Flight Achievements requires public.is_site_admin()';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(ARRAY['user_id', 'status', 'flight_date', 'created_at']) AS required_column(column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = 'public.flights'::regclass
        AND attribute.attname = required_column.column_name
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    )
  ) THEN
    RAISE EXCEPTION 'public.flights is missing a required Flight Achievements column';
  END IF;
END;
$preflight$;

CREATE TABLE IF NOT EXISTS public.achievement_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_zh text NOT NULL,
  description_en text NOT NULL DEFAULT '',
  description_zh text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  icon_key text NOT NULL DEFAULT 'achievement',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  category_id uuid NOT NULL REFERENCES public.achievement_categories(id) ON DELETE RESTRICT,
  name_en text NOT NULL,
  name_zh text NOT NULL,
  description_en text NOT NULL DEFAULT '',
  description_zh text NOT NULL DEFAULT '',
  badge_type text NOT NULL CHECK (badge_type IN ('progressive', 'standalone')),
  icon_key text NOT NULL DEFAULT 'achievement',
  unlock_rule_type text NOT NULL,
  unlock_rule_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievement_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_definition_id uuid NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  level_key text NOT NULL CHECK (level_key IN ('bronze', 'silver', 'gold', 'platinum')),
  level_order smallint NOT NULL CHECK (level_order BETWEEN 1 AND 4),
  threshold_value numeric NOT NULL CHECK (threshold_value >= 0),
  threshold_unit text NOT NULL,
  name_en text NOT NULL,
  name_zh text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT achievement_levels_definition_level_key UNIQUE (achievement_definition_id, level_key),
  CONSTRAINT achievement_levels_definition_level_order_key UNIQUE (achievement_definition_id, level_order),
  CONSTRAINT achievement_levels_tier_order_check CHECK (
    (level_key = 'bronze' AND level_order = 1)
    OR (level_key = 'silver' AND level_order = 2)
    OR (level_key = 'gold' AND level_order = 3)
    OR (level_key = 'platinum' AND level_order = 4)
  )
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_definition_id uuid NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE RESTRICT,
  achievement_level_id uuid REFERENCES public.achievement_levels(id) ON DELETE RESTRICT,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_achievements_user_definition_level_key UNIQUE (user_id, achievement_definition_id, achievement_level_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_achievements_one_standalone_badge_idx
  ON public.user_achievements (user_id, achievement_definition_id)
  WHERE achievement_level_id IS NULL;
CREATE INDEX IF NOT EXISTS achievement_definitions_category_display_idx
  ON public.achievement_definitions (category_id, display_order, slug);
CREATE INDEX IF NOT EXISTS achievement_levels_definition_order_idx
  ON public.achievement_levels (achievement_definition_id, level_order);
CREATE INDEX IF NOT EXISTS user_achievements_user_unlocked_idx
  ON public.user_achievements (user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS flights_user_completed_idx
  ON public.flights (user_id)
  WHERE status = 'completed';

CREATE OR REPLACE FUNCTION public.enforce_user_achievement_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_badge_type text;
  v_level_definition_id uuid;
BEGIN
  SELECT badge_type INTO v_badge_type
  FROM public.achievement_definitions
  WHERE id = NEW.achievement_definition_id;

  IF v_badge_type IS NULL THEN
    RAISE EXCEPTION 'Unknown achievement definition: %', NEW.achievement_definition_id;
  END IF;

  IF v_badge_type = 'progressive' AND NEW.achievement_level_id IS NULL THEN
    RAISE EXCEPTION 'Progressive achievements require an achievement level';
  END IF;

  IF v_badge_type = 'standalone' AND NEW.achievement_level_id IS NOT NULL THEN
    RAISE EXCEPTION 'Standalone achievements cannot have an achievement level';
  END IF;

  IF NEW.achievement_level_id IS NOT NULL THEN
    SELECT achievement_definition_id INTO v_level_definition_id
    FROM public.achievement_levels
    WHERE id = NEW.achievement_level_id;

    IF v_level_definition_id IS DISTINCT FROM NEW.achievement_definition_id THEN
      RAISE EXCEPTION 'Achievement level must belong to its achievement definition';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS user_achievements_integrity_trigger ON public.user_achievements;
CREATE TRIGGER user_achievements_integrity_trigger
  BEFORE INSERT OR UPDATE OF achievement_definition_id, achievement_level_id
  ON public.user_achievements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_achievement_integrity();

ALTER TABLE public.achievement_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.achievement_categories, public.achievement_definitions, public.achievement_levels, public.user_achievements FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.achievement_categories, public.achievement_definitions, public.achievement_levels, public.user_achievements TO authenticated;

DROP POLICY IF EXISTS achievement_categories_read_active ON public.achievement_categories;
CREATE POLICY achievement_categories_read_active ON public.achievement_categories
  FOR SELECT TO authenticated
  USING (is_active OR (SELECT public.is_site_admin()));

DROP POLICY IF EXISTS achievement_definitions_read_visible ON public.achievement_definitions;
CREATE POLICY achievement_definitions_read_visible ON public.achievement_definitions
  FOR SELECT TO authenticated
  USING (
    (is_active AND NOT is_hidden AND EXISTS (
      SELECT 1
      FROM public.achievement_categories AS category
      WHERE category.id = achievement_definitions.category_id
        AND category.is_active
    ))
    OR (SELECT public.is_site_admin())
  );

DROP POLICY IF EXISTS achievement_levels_read_visible_definition ON public.achievement_levels;
CREATE POLICY achievement_levels_read_visible_definition ON public.achievement_levels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.achievement_definitions AS definition
      INNER JOIN public.achievement_categories AS category
        ON category.id = definition.category_id
      WHERE definition.id = achievement_levels.achievement_definition_id
        AND (
          (definition.is_active AND NOT definition.is_hidden AND category.is_active)
          OR (SELECT public.is_site_admin())
        )
    )
  );
DROP POLICY IF EXISTS achievement_levels_read ON public.achievement_levels;

DROP POLICY IF EXISTS user_achievements_read_own ON public.user_achievements;
CREATE POLICY user_achievements_read_own ON public.user_achievements
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_site_admin()));

-- The browser cannot write awards. This function identifies the caller via
-- auth.uid() and derives awards only from that user's completed flights.
CREATE OR REPLACE FUNCTION public.refresh_my_achievements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_completed_flight_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to refresh achievements';
  END IF;

  SELECT count(*)::integer
    INTO v_completed_flight_count
  FROM public.flights
  WHERE user_id = v_user_id
    AND status = 'completed';

  WITH completed_flights AS (
    SELECT
      flight.flight_date,
      row_number() OVER (ORDER BY flight.flight_date, flight.created_at, flight.id) AS completion_rank
    FROM public.flights AS flight
    WHERE flight.user_id = v_user_id
      AND flight.status = 'completed'
  )
  INSERT INTO public.user_achievements (user_id, achievement_definition_id, achievement_level_id, achieved_at)
  SELECT
    v_user_id,
    definition.id,
    level.id,
    (
      SELECT (completed.flight_date::timestamp AT TIME ZONE 'UTC')
      FROM completed_flights AS completed
      WHERE completed.completion_rank = level.threshold_value
    )
  FROM public.achievement_definitions AS definition
  INNER JOIN public.achievement_levels AS level
    ON level.achievement_definition_id = definition.id
  INNER JOIN public.achievement_categories AS category
    ON category.id = definition.category_id
  WHERE definition.slug = 'frequent-flyer'
    AND definition.badge_type = 'progressive'
    AND definition.is_active
    AND NOT definition.is_hidden
    AND category.is_active
    AND level.threshold_value <= v_completed_flight_count
  ON CONFLICT (user_id, achievement_definition_id, achievement_level_id) DO NOTHING;
END;
$function$;

ALTER FUNCTION public.refresh_my_achievements() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.refresh_my_achievements() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_my_achievements() TO authenticated;

INSERT INTO public.achievement_categories (
  slug, name_en, name_zh, description_en, description_zh, display_order, icon_key
) VALUES (
  'flight_milestones',
  'Flight Milestones',
  '飞行里程碑',
  'Celebrate the completed flights that shape your journey.',
  '记录每一次已完成飞行所汇聚成的旅程。',
  1,
  'milestone'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.achievement_definitions (
  slug, category_id, name_en, name_zh, description_en, description_zh,
  badge_type, icon_key, unlock_rule_type, unlock_rule_config, display_order, is_active, is_hidden
)
SELECT
  'frequent-flyer',
  category.id,
  'Frequent Flyer',
  '常旅客',
  'Earn each tier by completing flights in Flight Desk.',
  '在 Flight Desk 中完成航班，即可逐级解锁徽章。',
  'progressive',
  'frequent-flyer',
  'completed_flight_count',
  '{"source":"public.flights","status":"completed","implementation":"phase_one"}'::jsonb,
  1,
  true,
  false
FROM public.achievement_categories AS category
WHERE category.slug = 'flight_milestones'
ON CONFLICT (slug) DO NOTHING;

WITH level_seed (level_key, level_order, threshold_value, name_en, name_zh) AS (
  VALUES
    ('bronze'::text, 1::smallint, 10::numeric, 'Frequent Flyer Bronze', '常旅客・铜'),
    ('silver'::text, 2::smallint, 50::numeric, 'Frequent Flyer Silver', '常旅客・银'),
    ('gold'::text, 3::smallint, 100::numeric, 'Frequent Flyer Gold', '常旅客・金'),
    ('platinum'::text, 4::smallint, 500::numeric, 'Frequent Flyer Platinum', '常旅客・铂金')
)
INSERT INTO public.achievement_levels (
  achievement_definition_id, level_key, level_order, threshold_value, threshold_unit, name_en, name_zh
)
SELECT definition.id, seed.level_key, seed.level_order, seed.threshold_value, 'flights', seed.name_en, seed.name_zh
FROM level_seed AS seed
INNER JOIN public.achievement_definitions AS definition ON definition.slug = 'frequent-flyer'
ON CONFLICT (achievement_definition_id, level_key) DO NOTHING;

COMMIT;
