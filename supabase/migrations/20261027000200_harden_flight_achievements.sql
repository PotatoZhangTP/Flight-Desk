BEGIN;

-- This migration depends on Flight Desk's existing flight, Daily Challenge and Memorial Flight schema.
DO $preflight$
DECLARE
  required_column text;
BEGIN
  IF to_regclass('public.flights') IS NULL
     OR to_regclass('public.daily_challenge_completions') IS NULL
     OR to_regclass('public.memorial_participation') IS NULL
     OR to_regclass('public.memorial_events') IS NULL THEN
    RAISE EXCEPTION 'Apply the Flight Desk flights, Daily Challenge and Memorial Flight migrations before this migration.';
  END IF;

  FOREACH required_column IN ARRAY ARRAY['id', 'user_id', 'status', 'actual_duration_minutes', 'scheduled_duration_minutes'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'flights' AND column_name = required_column
    ) THEN
      RAISE EXCEPTION 'public.flights.% is required by Flight Achievements', required_column;
    END IF;
  END LOOP;

  FOREACH required_column IN ARRAY ARRAY['user_id', 'category'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'daily_challenge_completions' AND column_name = required_column
    ) THEN
      RAISE EXCEPTION 'public.daily_challenge_completions.% is required by Flight Achievements', required_column;
    END IF;
  END LOOP;

  FOREACH required_column IN ARRAY ARRAY['user_id', 'event_id', 'flight_id'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'memorial_participation' AND column_name = required_column
    ) THEN
      RAISE EXCEPTION 'public.memorial_participation.% is required by Flight Achievements', required_column;
    END IF;
  END LOOP;

  IF to_regprocedure('public.is_site_admin()') IS NULL THEN
    RAISE EXCEPTION 'public.is_site_admin() is required by the achievement RLS policies.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.daily_challenge_completions'::regclass
      AND c.conname = 'daily_challenge_completions_user_date_category_key'
      AND c.contype = 'u'
      AND ARRAY(
        SELECT a.attname::text
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        ORDER BY array_position(c.conkey, a.attnum)
      ) = ARRAY['user_id', 'challenge_date', 'category']::text[]
  ) THEN
    RAISE EXCEPTION 'Required UNIQUE(user_id, challenge_date, category) constraint is missing from public.daily_challenge_completions.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.memorial_participation'::regclass
      AND c.conname = 'memorial_participation_event_user_key'
      AND c.contype = 'u'
      AND ARRAY(
        SELECT a.attname::text
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        ORDER BY array_position(c.conkey, a.attnum)
      ) = ARRAY['event_id', 'user_id']::text[]
  ) THEN
    RAISE EXCEPTION 'Required UNIQUE(event_id, user_id) constraint is missing from public.memorial_participation.';
  END IF;
END;
$preflight$;

CREATE TABLE IF NOT EXISTS public.achievement_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9_]+$'),
  name_en text NOT NULL, name_zh text NOT NULL,
  description_en text NOT NULL DEFAULT '', description_zh text NOT NULL DEFAULT '',
  display_order integer NOT NULL CHECK (display_order > 0), icon_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  category_id uuid NOT NULL REFERENCES public.achievement_categories(id) ON DELETE RESTRICT,
  name_en text NOT NULL, name_zh text NOT NULL,
  description_en text NOT NULL DEFAULT '', description_zh text NOT NULL DEFAULT '',
  badge_type text NOT NULL CHECK (badge_type IN ('progressive', 'standalone')),
  icon_key text NOT NULL, artwork_url text,
  unlock_rule_type text NOT NULL, unlock_rule_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  is_hidden boolean NOT NULL DEFAULT false, source_type text, source_reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievement_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_definition_id uuid NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  level_key text NOT NULL CHECK (level_key IN ('bronze','silver','gold','platinum')),
  level_order smallint NOT NULL CHECK (level_order BETWEEN 1 AND 4),
  threshold_value numeric NOT NULL CHECK (threshold_value >= 0), threshold_unit text NOT NULL,
  name_en text NOT NULL, name_zh text NOT NULL, artwork_url text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT achievement_levels_definition_level_key UNIQUE (achievement_definition_id,level_key),
  CONSTRAINT achievement_levels_definition_level_order_key UNIQUE (achievement_definition_id,level_order)
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_definition_id uuid NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE RESTRICT,
  achievement_level_id uuid REFERENCES public.achievement_levels(id) ON DELETE RESTRICT,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  related_flight_id uuid REFERENCES public.flights(id) ON DELETE SET NULL,
  related_event_id uuid REFERENCES public.memorial_events(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_achievements_user_definition_level_key UNIQUE (user_id,achievement_definition_id,achievement_level_id)
);

-- CREATE TABLE IF NOT EXISTS does not repair an incompatible partial prior attempt.
-- Fail inside this transaction instead of silently creating a mixed schema.
DO $achievement_schema$
DECLARE
  required_column text;
BEGIN
  FOREACH required_column IN ARRAY ARRAY['id','slug','name_en','name_zh','display_order','is_active','updated_at'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievement_categories' AND column_name = required_column) THEN
      RAISE EXCEPTION 'public.achievement_categories.% is required; existing table is incompatible', required_column;
    END IF;
  END LOOP;

  FOREACH required_column IN ARRAY ARRAY['id','slug','category_id','badge_type','unlock_rule_type','unlock_rule_config','is_active','is_hidden','updated_at'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievement_definitions' AND column_name = required_column) THEN
      RAISE EXCEPTION 'public.achievement_definitions.% is required; existing table is incompatible', required_column;
    END IF;
  END LOOP;

  FOREACH required_column IN ARRAY ARRAY['id','achievement_definition_id','level_key','level_order','threshold_value','threshold_unit','updated_at'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievement_levels' AND column_name = required_column) THEN
      RAISE EXCEPTION 'public.achievement_levels.% is required; existing table is incompatible', required_column;
    END IF;
  END LOOP;

  FOREACH required_column IN ARRAY ARRAY['id','user_id','achievement_definition_id','achievement_level_id','unlocked_at'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = required_column) THEN
      RAISE EXCEPTION 'public.user_achievements.% is required; existing table is incompatible', required_column;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.achievement_definitions'::regclass
      AND c.contype = 'f' AND c.confrelid = 'public.achievement_categories'::regclass
      AND c.conkey = ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid = c.conrelid AND a.attname = 'category_id' AND NOT a.attisdropped)]::smallint[]
  ) THEN
    RAISE EXCEPTION 'public.achievement_definitions.category_id foreign key is missing or incompatible.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.achievement_levels'::regclass
      AND c.contype = 'f' AND c.confrelid = 'public.achievement_definitions'::regclass
      AND c.conkey = ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid = c.conrelid AND a.attname = 'achievement_definition_id' AND NOT a.attisdropped)]::smallint[]
  ) THEN
    RAISE EXCEPTION 'public.achievement_levels.achievement_definition_id foreign key is missing or incompatible.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.user_achievements'::regclass
      AND c.contype = 'f' AND c.confrelid = 'public.achievement_definitions'::regclass
      AND c.conkey = ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid = c.conrelid AND a.attname = 'achievement_definition_id' AND NOT a.attisdropped)]::smallint[]
  ) THEN
    RAISE EXCEPTION 'public.user_achievements.achievement_definition_id foreign key is missing or incompatible.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.user_achievements'::regclass
      AND c.contype = 'f' AND c.confrelid = 'public.achievement_levels'::regclass
      AND c.conkey = ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid = c.conrelid AND a.attname = 'achievement_level_id' AND NOT a.attisdropped)]::smallint[]
  ) THEN
    RAISE EXCEPTION 'public.user_achievements.achievement_level_id foreign key is missing or incompatible.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.user_achievements'::regclass
      AND c.contype = 'f' AND c.confrelid = 'auth.users'::regclass
      AND c.conkey = ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid = c.conrelid AND a.attname = 'user_id' AND NOT a.attisdropped)]::smallint[]
  ) THEN
    RAISE EXCEPTION 'public.user_achievements.user_id foreign key to auth.users is missing or incompatible.';
  END IF;
END;
$achievement_schema$;

-- Existing data is never deleted. Fail with a clear diagnostic before adding
-- uniqueness protections rather than allowing a generic index-build error.
DO $achievement_duplicate_check$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_achievements
    WHERE achievement_level_id IS NULL
    GROUP BY user_id, achievement_definition_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add standalone achievement uniqueness: duplicate (user_id, achievement_definition_id) rows exist in public.user_achievements.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_achievements
    WHERE achievement_level_id IS NOT NULL
    GROUP BY user_id, achievement_definition_id, achievement_level_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add progressive achievement uniqueness: duplicate user/definition/level rows exist in public.user_achievements.';
  END IF;
END;
$achievement_duplicate_check$;

CREATE INDEX IF NOT EXISTS achievement_definitions_category_display_idx ON public.achievement_definitions(category_id,display_order,slug);
CREATE INDEX IF NOT EXISTS achievement_levels_definition_order_idx ON public.achievement_levels(achievement_definition_id,level_order);
CREATE INDEX IF NOT EXISTS user_achievements_user_unlocked_idx ON public.user_achievements(user_id,unlocked_at DESC);

-- A normal UNIQUE constraint permits more than one NULL. Keep standalone badges idempotent too.
CREATE UNIQUE INDEX IF NOT EXISTS user_achievements_one_standalone_per_user_idx
  ON public.user_achievements(user_id, achievement_definition_id)
  WHERE achievement_level_id IS NULL;

-- Keep a compatible existing unique constraint intact. Older PostgreSQL 15
-- installations may already use UNIQUE NULLS NOT DISTINCT here; that is
-- stricter than needed and remains valid. Never drop/rebuild it blindly.
DO $achievement_unique_constraint$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.user_achievements'::regclass
      AND c.conname = 'user_achievements_user_definition_level_key'
      AND (
        c.contype <> 'u'
        OR ARRAY(
          SELECT a.attname::text
          FROM pg_catalog.pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ORDER BY array_position(c.conkey, a.attnum)
        ) <> ARRAY['user_id', 'achievement_definition_id', 'achievement_level_id']::text[]
      )
  ) THEN
    RAISE EXCEPTION 'Existing user_achievements_user_definition_level_key has an incompatible definition; do not drop it automatically.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.user_achievements'::regclass
      AND c.conname = 'user_achievements_user_definition_level_key'
      AND c.contype = 'u'
  ) THEN
    ALTER TABLE public.user_achievements
      ADD CONSTRAINT user_achievements_user_definition_level_key
      UNIQUE (user_id, achievement_definition_id, achievement_level_id);
  END IF;
END;
$achievement_unique_constraint$;


ALTER TABLE public.achievement_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.achievement_categories,public.achievement_definitions,public.achievement_levels,public.user_achievements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.achievement_categories,public.achievement_definitions,public.achievement_levels,public.user_achievements TO authenticated;

DROP POLICY IF EXISTS achievement_categories_read_active ON public.achievement_categories;
CREATE POLICY achievement_categories_read_active ON public.achievement_categories FOR SELECT TO authenticated USING (is_active OR (SELECT public.is_site_admin()));
DROP POLICY IF EXISTS achievement_definitions_read_visible ON public.achievement_definitions;
CREATE POLICY achievement_definitions_read_visible ON public.achievement_definitions FOR SELECT TO authenticated USING ((is_active AND NOT is_hidden) OR (SELECT public.is_site_admin()));
DROP POLICY IF EXISTS achievement_levels_read ON public.achievement_levels;
DROP POLICY IF EXISTS achievement_levels_read_visible ON public.achievement_levels;
CREATE POLICY achievement_levels_read_visible ON public.achievement_levels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.achievement_definitions d
      WHERE d.id = achievement_levels.achievement_definition_id
        AND ((d.is_active AND NOT d.is_hidden) OR (SELECT public.is_site_admin()))
    )
  );
DROP POLICY IF EXISTS user_achievements_read_own ON public.user_achievements;
CREATE POLICY user_achievements_read_own ON public.user_achievements FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()) OR (SELECT public.is_site_admin()));


-- A foreign key cannot express that a level must belong to the selected definition.
-- This trigger keeps progressive and standalone achievements structurally valid.
CREATE OR REPLACE FUNCTION public.enforce_user_achievement_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $achievement_integrity$
DECLARE
  v_badge_type text;
BEGIN
  SELECT d.badge_type
    INTO v_badge_type
    FROM public.achievement_definitions d
   WHERE d.id = NEW.achievement_definition_id;

  IF v_badge_type IS NULL THEN
    RAISE EXCEPTION 'Unknown achievement definition %', NEW.achievement_definition_id
      USING ERRCODE = '23503';
  END IF;

  IF v_badge_type = 'progressive' THEN
    IF NEW.achievement_level_id IS NULL THEN
      RAISE EXCEPTION 'A progressive achievement requires an achievement level'
        USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.achievement_levels l
      WHERE l.id = NEW.achievement_level_id
        AND l.achievement_definition_id = NEW.achievement_definition_id
    ) THEN
      RAISE EXCEPTION 'Achievement level % does not belong to definition %',
        NEW.achievement_level_id, NEW.achievement_definition_id
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_badge_type = 'standalone' AND NEW.achievement_level_id IS NOT NULL THEN
    RAISE EXCEPTION 'A standalone achievement cannot reference an achievement level'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$achievement_integrity$;

DROP TRIGGER IF EXISTS user_achievements_integrity_trigger ON public.user_achievements;
CREATE TRIGGER user_achievements_integrity_trigger
  BEFORE INSERT OR UPDATE OF achievement_definition_id, achievement_level_id
  ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_achievement_integrity();

DO $achievement_integrity_check$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_achievements ua
    JOIN public.achievement_definitions d ON d.id = ua.achievement_definition_id
    LEFT JOIN public.achievement_levels l ON l.id = ua.achievement_level_id
    WHERE (d.badge_type = 'progressive' AND (ua.achievement_level_id IS NULL OR l.achievement_definition_id <> d.id))
       OR (d.badge_type = 'standalone' AND ua.achievement_level_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Existing user_achievements rows violate achievement definition/level integrity; correct them before applying this migration.';
  END IF;
END;
$achievement_integrity_check$;

CREATE OR REPLACE FUNCTION public.refresh_my_achievements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $achievement_refresh$
DECLARE
  v_user uuid := auth.uid();
  v_completed integer := 0;
  v_actual_minutes integer := 0;
  v_challenges integer := 0;
  v_memorials integer := 0;
  v_has_long_haul boolean := false;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  SELECT count(*), coalesce(sum(f.actual_duration_minutes), 0), coalesce(bool_or(coalesce(f.scheduled_duration_minutes, 0) >= 420), false)
    INTO v_completed, v_actual_minutes, v_has_long_haul
    FROM public.flights f WHERE f.user_id = v_user AND f.status = 'completed';
  SELECT count(*) INTO v_challenges FROM public.daily_challenge_completions c WHERE c.user_id = v_user;
  -- memorial_participation is unique per (event_id, user_id), so the stable
  -- Memorial Flight event is the current product's completed participation unit.
  SELECT count(DISTINCT p.event_id) INTO v_memorials FROM public.memorial_participation p
    JOIN public.flights f ON f.id = p.flight_id AND f.user_id = v_user AND f.status = 'completed'
    WHERE p.user_id = v_user;

  INSERT INTO public.user_achievements (user_id, achievement_definition_id, achievement_level_id)
  SELECT v_user, d.id, l.id
  FROM public.achievement_definitions d
  JOIN public.achievement_levels l ON l.achievement_definition_id = d.id
  WHERE d.is_active AND (d.unlock_rule_config->>'implementation') = 'available_for_evaluation'
    AND ((d.unlock_rule_type = 'completed_flight_count' AND l.threshold_value <= v_completed)
      OR (d.unlock_rule_type = 'actual_duration_minutes' AND (l.threshold_value * 60) <= v_actual_minutes)
      OR (d.unlock_rule_type = 'daily_challenge_count' AND l.threshold_value <= v_challenges)
      OR (d.unlock_rule_type = 'memorial_flight_count' AND l.threshold_value <= v_memorials))
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_achievements (user_id, achievement_definition_id)
  SELECT v_user, d.id FROM public.achievement_definitions d
  WHERE d.is_active AND d.badge_type = 'standalone' AND (d.unlock_rule_config->>'implementation') = 'available_for_evaluation'
    AND ((d.unlock_rule_type = 'first_completed_flight' AND v_completed > 0)
      OR (d.unlock_rule_type = 'first_daily_challenge' AND v_challenges > 0)
      OR (d.unlock_rule_type = 'first_challenge_quick' AND EXISTS (SELECT 1 FROM public.daily_challenge_completions c WHERE c.user_id = v_user AND c.category = 'quick'))
      OR (d.unlock_rule_type = 'first_challenge_regional' AND EXISTS (SELECT 1 FROM public.daily_challenge_completions c WHERE c.user_id = v_user AND c.category = 'regional'))
      OR (d.unlock_rule_type = 'first_challenge_medium' AND EXISTS (SELECT 1 FROM public.daily_challenge_completions c WHERE c.user_id = v_user AND c.category = 'medium'))
      OR (d.unlock_rule_type = 'first_challenge_long' AND EXISTS (SELECT 1 FROM public.daily_challenge_completions c WHERE c.user_id = v_user AND c.category = 'long'))
      OR (d.unlock_rule_type = 'first_memorial_flight' AND v_memorials > 0)
      OR (d.unlock_rule_type = 'long_haul_scheduled_minutes' AND v_has_long_haul))
  ON CONFLICT DO NOTHING;
END;
$achievement_refresh$;

ALTER FUNCTION public.refresh_my_achievements() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.refresh_my_achievements() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_my_achievements() TO authenticated;

-- Browser clients cannot write arbitrary achievements. This function awards only rules derived below.
-- Only rules marked available_for_evaluation have database sources that exist in this project.
WITH category_seed(slug,name_en,name_zh,description_en,description_zh,display_order,icon_key) AS (VALUES
  ('flight_milestones', 'Flight Milestones', '飞行里程碑', 'Build your flight history one completed journey at a time.', '用每一次完成的旅程积累你的飞行历史。', 1, 'takeoff'),
  ('world_explorer', 'World Explorer', '世界探索者', 'Discover airports, cities, countries, and continents.', '探索机场、城市、国家与大洲。', 2, 'globe'),
  ('aircraft_collector', 'Aircraft Collector', '机型收藏家', 'Collect the aircraft that shape your journeys.', '收藏塑造你旅程的机型。', 3, 'aircraft'),
  ('route_explorer', 'Route Explorer', '航线探索者', 'Expand the routes that connect your world.', '拓展连接你世界的航线。', 4, 'route'),
  ('flight_challenges', 'Flight Challenges', '飞行挑战', 'Complete Daily Challenges and discover new routes.', '完成每日挑战，探索新的航线。', 5, 'challenge'),
  ('aviation_heritage', 'Aviation Heritage', '航空历史与纪念', 'Remember the stories that shaped aviation.', '铭记塑造航空历史的故事。', 6, 'heritage'),
  ('flight_experiences', 'Flight Experiences', '飞行经历', 'Celebrate the defining moments of your flying life.', '纪念飞行生涯中的重要时刻。', 7, 'experience')
)
INSERT INTO public.achievement_categories (slug,name_en,name_zh,description_en,description_zh,display_order,icon_key)
SELECT * FROM category_seed
ON CONFLICT (slug) DO UPDATE
SET name_en = EXCLUDED.name_en,
    name_zh = EXCLUDED.name_zh,
    description_en = EXCLUDED.description_en,
    description_zh = EXCLUDED.description_zh,
    display_order = EXCLUDED.display_order,
    icon_key = EXCLUDED.icon_key,
    is_active = true,
    updated_at = now()
WHERE (public.achievement_categories.name_en,
       public.achievement_categories.name_zh,
       public.achievement_categories.description_en,
       public.achievement_categories.description_zh,
       public.achievement_categories.display_order,
       public.achievement_categories.icon_key,
       public.achievement_categories.is_active)
  IS DISTINCT FROM
      (EXCLUDED.name_en,
       EXCLUDED.name_zh,
       EXCLUDED.description_en,
       EXCLUDED.description_zh,
       EXCLUDED.display_order,
       EXCLUDED.icon_key,
       true);

WITH definition_seed AS (
  SELECT * FROM jsonb_to_recordset($achievement_definitions$
[
  {
    "slug": "frequent-flyer",
    "category_slug": "flight_milestones",
    "name_en": "Frequent Flyer",
    "name_zh": "常旅客",
    "description_en": "Complete at least 10 flights.",
    "description_zh": "累计完成至少 10 段航班。",
    "badge_type": "progressive",
    "icon_key": "frequent-flyer",
    "unlock_rule_type": "completed_flight_count",
    "unlock_rule_config": {
      "rule_key": "completed_flight_count",
      "source": "Completed Flights",
      "dedupe": "每条航班记录只计一次；Planned 不计入。",
      "notes": "建议使用唯一 flight ID 去重。",
      "implementation": "available_for_evaluation"
    },
    "display_order": 1,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights"
  },
  {
    "slug": "time-aloft",
    "category_slug": "flight_milestones",
    "name_en": "Time Aloft",
    "name_zh": "云端时光",
    "description_en": "Accumulate at least 10 hours of actual flight time.",
    "description_zh": "累计实际飞行时间达到 10 小时。",
    "badge_type": "progressive",
    "icon_key": "time-aloft",
    "unlock_rule_type": "actual_duration_minutes",
    "unlock_rule_config": {
      "rule_key": "actual_duration_minutes",
      "source": "Completed Flights；actual_duration_minutes",
      "dedupe": "按每条已完成航班的实际时长累计。",
      "notes": "没有实际时长的数据不要直接当作实际时长；需明确是否允许用计划时长作为后备。",
      "implementation": "available_for_evaluation"
    },
    "display_order": 5,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；actual_duration_minutes"
  },
  {
    "slug": "distance-traveller",
    "category_slug": "flight_milestones",
    "name_en": "Distance Traveller",
    "name_zh": "飞行旅者",
    "description_en": "Accumulate at least 10,000 km of flight distance.",
    "description_zh": "累计飞行距离达到 10,000 km。",
    "badge_type": "progressive",
    "icon_key": "distance-traveller",
    "unlock_rule_type": "distance_km",
    "unlock_rule_config": {
      "rule_key": "distance_km",
      "source": "Completed Flights；机场坐标或已保存航段距离",
      "dedupe": "每条已完成航班只累计一次；距离采用统一内部单位。",
      "notes": "建议优先使用机场大圆距离；需明确缺失坐标时的处理方式。",
      "implementation": "reserved"
    },
    "display_order": 9,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；机场坐标或已保存航段距离"
  },
  {
    "slug": "country-collector",
    "category_slug": "world_explorer",
    "name_en": "Country Collector",
    "name_zh": "国家收藏家",
    "description_en": "Visit at least 5 unique countries or regions.",
    "description_zh": "累计到访至少 5 个国家/地区。",
    "badge_type": "progressive",
    "icon_key": "country-collector",
    "unlock_rule_type": "unique_country_count",
    "unlock_rule_config": {
      "rule_key": "unique_country_count",
      "source": "Completed Flights；机场数据库；国家/城市/大洲映射",
      "dedupe": "按标准化国家、机场、城市或大洲去重；只统计已完成航班涉及的起降机场。",
      "notes": "规范化机场国家映射；与 Aviation Passport 共用规则。",
      "implementation": "reserved"
    },
    "display_order": 13,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；机场数据库；国家/城市/大洲映射"
  },
  {
    "slug": "airport-explorer",
    "category_slug": "world_explorer",
    "name_en": "Airport Explorer",
    "name_zh": "机场探索者",
    "description_en": "Visit at least 10 unique airports.",
    "description_zh": "累计到访至少 10 个不同机场。",
    "badge_type": "progressive",
    "icon_key": "airport-explorer",
    "unlock_rule_type": "unique_airport_count",
    "unlock_rule_config": {
      "rule_key": "unique_airport_count",
      "source": "Completed Flights；机场数据库；国家/城市/大洲映射",
      "dedupe": "按标准化国家、机场、城市或大洲去重；只统计已完成航班涉及的起降机场。",
      "notes": "使用机场唯一 ID 或标准 ICAO/IATA 映射；避免同一机场重复。",
      "implementation": "reserved"
    },
    "display_order": 17,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；机场数据库；国家/城市/大洲映射"
  },
  {
    "slug": "continental-explorer",
    "category_slug": "world_explorer",
    "name_en": "Continental Explorer",
    "name_zh": "大洲探索者",
    "description_en": "Visit at least 2 unique continents.",
    "description_zh": "累计到访至少 2 个大洲。",
    "badge_type": "progressive",
    "icon_key": "continental-explorer",
    "unlock_rule_type": "unique_continent_count",
    "unlock_rule_config": {
      "rule_key": "unique_continent_count",
      "source": "Completed Flights；机场数据库；国家/城市/大洲映射",
      "dedupe": "按标准化国家、机场、城市或大洲去重；只统计已完成航班涉及的起降机场。",
      "notes": "使用项目统一的大洲映射规则；跨洲国家按机场所在地归属。",
      "implementation": "reserved"
    },
    "display_order": 21,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；机场数据库；国家/城市/大洲映射"
  },
  {
    "slug": "city-hopper",
    "category_slug": "world_explorer",
    "name_en": "City Hopper",
    "name_zh": "城市穿梭者",
    "description_en": "Visit at least 10 unique cities.",
    "description_zh": "累计到访至少 10 个不同城市。",
    "badge_type": "progressive",
    "icon_key": "city-hopper",
    "unlock_rule_type": "unique_city_count",
    "unlock_rule_config": {
      "rule_key": "unique_city_count",
      "source": "Completed Flights；机场数据库；国家/城市/大洲映射",
      "dedupe": "按标准化国家、机场、城市或大洲去重；只统计已完成航班涉及的起降机场。",
      "notes": "基于机场数据库规范化城市字段，不直接对自由文本去重。",
      "implementation": "reserved"
    },
    "display_order": 25,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；机场数据库；国家/城市/大洲映射"
  },
  {
    "slug": "fleet-collector",
    "category_slug": "aircraft_collector",
    "name_en": "Fleet Collector",
    "name_zh": "机队收藏家",
    "description_en": "Complete flights on at least 3 unique aircraft types.",
    "description_zh": "累计完成至少 3 种不同的机型飞行体验。",
    "badge_type": "progressive",
    "icon_key": "fleet-collector",
    "unlock_rule_type": "unique_aircraft_count",
    "unlock_rule_config": {
      "rule_key": "unique_aircraft_count",
      "source": "Completed Flights；规范化机型代码；制造商映射",
      "dedupe": "同一标准机型只计一次；同机型重复飞行不增加数量。",
      "notes": "机型需规范化，例如 B77W 与 Boeing 777-300ER 应映射到同一标准机型。",
      "implementation": "reserved"
    },
    "display_order": 29,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；规范化机型代码；制造商映射"
  },
  {
    "slug": "boeing-explorer",
    "category_slug": "aircraft_collector",
    "name_en": "Boeing Explorer",
    "name_zh": "波音探索者",
    "description_en": "Complete flights on at least 2 unique aircraft types.",
    "description_zh": "累计完成至少 2 种不同的波音机型飞行体验。",
    "badge_type": "progressive",
    "icon_key": "boeing-explorer",
    "unlock_rule_type": "unique_boeing_aircraft_count",
    "unlock_rule_config": {
      "rule_key": "unique_boeing_aircraft_count",
      "source": "Completed Flights；规范化机型代码；制造商映射",
      "dedupe": "同一标准机型只计一次；同机型重复飞行不增加数量。",
      "notes": "需要可靠的标准机型及制造商映射。",
      "implementation": "reserved"
    },
    "display_order": 33,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；规范化机型代码；制造商映射"
  },
  {
    "slug": "airbus-explorer",
    "category_slug": "aircraft_collector",
    "name_en": "Airbus Explorer",
    "name_zh": "空客探索者",
    "description_en": "Complete flights on at least 2 unique aircraft types.",
    "description_zh": "累计完成至少 2 种不同的空客机型飞行体验。",
    "badge_type": "progressive",
    "icon_key": "airbus-explorer",
    "unlock_rule_type": "unique_airbus_aircraft_count",
    "unlock_rule_config": {
      "rule_key": "unique_airbus_aircraft_count",
      "source": "Completed Flights；规范化机型代码；制造商映射",
      "dedupe": "同一标准机型只计一次；同机型重复飞行不增加数量。",
      "notes": "需要可靠的标准机型及制造商映射。",
      "implementation": "reserved"
    },
    "display_order": 37,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；规范化机型代码；制造商映射"
  },
  {
    "slug": "route-collector",
    "category_slug": "route_explorer",
    "name_en": "Route Collector",
    "name_zh": "航线收藏家",
    "description_en": "Complete at least 5 unique routes.",
    "description_zh": "累计完成至少 5 条不同航线。",
    "badge_type": "progressive",
    "icon_key": "route-collector",
    "unlock_rule_type": "unique_route_count",
    "unlock_rule_config": {
      "rule_key": "unique_route_count",
      "source": "Completed Flights；标准化起降机场；机场国家映射",
      "dedupe": "重复飞行同一航线不增加不同航线数。",
      "notes": "建议把 A→B 与 B→A 视为同一条无方向航线。",
      "implementation": "reserved"
    },
    "display_order": 41,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；标准化起降机场；机场国家映射"
  },
  {
    "slug": "international-routes",
    "category_slug": "route_explorer",
    "name_en": "International Routes",
    "name_zh": "国际航线",
    "description_en": "Complete at least 3 unique routes.",
    "description_zh": "累计完成至少 3 条不同国际航线。",
    "badge_type": "progressive",
    "icon_key": "international-routes",
    "unlock_rule_type": "unique_international_route_count",
    "unlock_rule_config": {
      "rule_key": "unique_international_route_count",
      "source": "Completed Flights；标准化起降机场；机场国家映射",
      "dedupe": "重复飞行同一航线不增加不同航线数。",
      "notes": "根据起降机场国家映射判断是否为国际航线。",
      "implementation": "reserved"
    },
    "display_order": 45,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；标准化起降机场；机场国家映射"
  },
  {
    "slug": "challenge-pilot",
    "category_slug": "flight_challenges",
    "name_en": "Challenge Pilot",
    "name_zh": "挑战飞行员",
    "description_en": "Complete at least 3 challenges.",
    "description_zh": "累计完成至少 3 次挑战。",
    "badge_type": "progressive",
    "icon_key": "challenge-pilot",
    "unlock_rule_type": "daily_challenge_count",
    "unlock_rule_config": {
      "rule_key": "daily_challenge_count",
      "source": "Daily Challenge 完成记录；挑战航线数据",
      "dedupe": "仅用户执行 Mark as Completed 后计数；同一挑战实例不可重复计数。",
      "notes": "Bronze 从 3 次开始，避免与首次挑战独立徽章重复奖励。 Add to My Flights 或跳转 SimBrief 不算完成。",
      "implementation": "available_for_evaluation"
    },
    "display_order": 49,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Daily Challenge 完成记录；挑战航线数据"
  },
  {
    "slug": "route-adventurer",
    "category_slug": "flight_challenges",
    "name_en": "Route Adventurer",
    "name_zh": "航线冒险家",
    "description_en": "Complete at least 5 unique challenge routes.",
    "description_zh": "累计完成至少 5 条不同挑战航线。",
    "badge_type": "progressive",
    "icon_key": "route-adventurer",
    "unlock_rule_type": "unique_daily_challenge_route_count",
    "unlock_rule_config": {
      "rule_key": "unique_daily_challenge_route_count",
      "source": "Daily Challenge 完成记录；挑战航线数据",
      "dedupe": "仅用户执行 Mark as Completed 后计数；同一挑战实例不可重复计数。",
      "notes": "以挑战的标准化起降机场组合去重。 Add to My Flights 或跳转 SimBrief 不算完成。",
      "implementation": "reserved"
    },
    "display_order": 53,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Daily Challenge 完成记录；挑战航线数据"
  },
  {
    "slug": "challenge-accepted",
    "category_slug": "flight_experiences",
    "name_en": "Challenge Accepted",
    "name_zh": "挑战接受者",
    "description_en": "Complete the first Daily Challenge.",
    "description_zh": "首次完成一项 Daily Challenge。",
    "badge_type": "standalone",
    "icon_key": "challenge-accepted",
    "unlock_rule_type": "first_daily_challenge",
    "unlock_rule_config": {
      "rule_key": "first_daily_challenge",
      "source": "Daily Challenge 完成记录",
      "dedupe": "同一徽章只解锁一次。",
      "notes": "只解锁一次；必须是用户主动标记完成。",
      "implementation": "available_for_evaluation"
    },
    "display_order": 57,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Daily Challenge 完成记录"
  },
  {
    "slug": "quick-flight",
    "category_slug": "flight_experiences",
    "name_en": "Quick Flight",
    "name_zh": "快速飞行",
    "description_en": "Complete a Quick Flight challenge for the first time.",
    "description_zh": "首次完成 Quick Flight 档挑战。",
    "badge_type": "standalone",
    "icon_key": "quick-flight",
    "unlock_rule_type": "first_challenge_quick",
    "unlock_rule_config": {
      "rule_key": "first_challenge_quick",
      "source": "挑战类别与完成记录",
      "dedupe": "同一徽章只解锁一次。",
      "notes": "复用 Daily Challenge 现有时长分类。",
      "implementation": "available_for_evaluation"
    },
    "display_order": 58,
    "is_active": true,
    "is_hidden": false,
    "source_type": "挑战类别与完成记录"
  },
  {
    "slug": "regional-flight",
    "category_slug": "flight_experiences",
    "name_en": "Regional Flight",
    "name_zh": "区域飞行",
    "description_en": "Complete a Regional Flight challenge for the first time.",
    "description_zh": "首次完成 Regional Flight 档挑战。",
    "badge_type": "standalone",
    "icon_key": "regional-flight",
    "unlock_rule_type": "first_challenge_regional",
    "unlock_rule_config": {
      "rule_key": "first_challenge_regional",
      "source": "挑战类别与完成记录",
      "dedupe": "同一徽章只解锁一次。",
      "notes": "复用 Daily Challenge 现有时长分类。",
      "implementation": "available_for_evaluation"
    },
    "display_order": 59,
    "is_active": true,
    "is_hidden": false,
    "source_type": "挑战类别与完成记录"
  },
  {
    "slug": "medium-haul",
    "category_slug": "flight_experiences",
    "name_en": "Medium Haul",
    "name_zh": "中程飞行",
    "description_en": "Complete a Medium Haul challenge for the first time.",
    "description_zh": "首次完成 Medium Haul 档挑战。",
    "badge_type": "standalone",
    "icon_key": "medium-haul",
    "unlock_rule_type": "first_challenge_medium",
    "unlock_rule_config": {
      "rule_key": "first_challenge_medium",
      "source": "挑战类别与完成记录",
      "dedupe": "同一徽章只解锁一次。",
      "notes": "复用 Daily Challenge 现有时长分类。",
      "implementation": "available_for_evaluation"
    },
    "display_order": 60,
    "is_active": true,
    "is_hidden": false,
    "source_type": "挑战类别与完成记录"
  },
  {
    "slug": "long-haul",
    "category_slug": "flight_experiences",
    "name_en": "Long Haul",
    "name_zh": "长程飞行",
    "description_en": "Complete a Long Haul challenge for the first time.",
    "description_zh": "首次完成 Long Haul 档挑战。",
    "badge_type": "standalone",
    "icon_key": "long-haul",
    "unlock_rule_type": "first_challenge_long",
    "unlock_rule_config": {
      "rule_key": "first_challenge_long",
      "source": "挑战类别与完成记录",
      "dedupe": "同一徽章只解锁一次。",
      "notes": "复用 Daily Challenge 现有时长分类。",
      "implementation": "available_for_evaluation"
    },
    "display_order": 61,
    "is_active": true,
    "is_hidden": false,
    "source_type": "挑战类别与完成记录"
  },
  {
    "slug": "heritage-keeper",
    "category_slug": "aviation_heritage",
    "name_en": "Heritage Keeper",
    "name_zh": "航空传承守护者",
    "description_en": "Complete at least 3 memorial flights.",
    "description_zh": "累计完成至少 3 条纪念航线。",
    "badge_type": "progressive",
    "icon_key": "heritage-keeper",
    "unlock_rule_type": "memorial_flight_count",
    "unlock_rule_config": {
      "rule_key": "memorial_flight_count",
      "source": "Memorial Flight 完成记录",
      "dedupe": "同一纪念航线/挑战实例不得重复计数；需以稳定事件 ID 或完成记录 ID 去重。",
      "notes": "Bronze 从 3 次开始。首次纪念飞行独立徽章归入 Flight Experiences。",
      "implementation": "available_for_evaluation"
    },
    "display_order": 62,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Memorial Flight 完成记录"
  },
  {
    "slug": "first-flight",
    "category_slug": "flight_experiences",
    "name_en": "First Flight",
    "name_zh": "首次飞行",
    "description_en": "Complete the first flight.",
    "description_zh": "首次完成一段航班。",
    "badge_type": "standalone",
    "icon_key": "first-flight",
    "unlock_rule_type": "first_completed_flight",
    "unlock_rule_config": {
      "rule_key": "first_completed_flight",
      "source": "Completed Flights；历史航班记录",
      "dedupe": "只解锁一次；导入的历史已完成航班也应纳入首次判断。",
      "notes": "如已导入历史航班，首次解锁应基于全量历史记录，而非注册后的第一段。",
      "implementation": "available_for_evaluation"
    },
    "display_order": 66,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；历史航班记录"
  },
  {
    "slug": "first-international-flight",
    "category_slug": "flight_experiences",
    "name_en": "First International Flight",
    "name_zh": "首次国际飞行",
    "description_en": "Complete the first international flight.",
    "description_zh": "首次完成跨国家/地区的航班。",
    "badge_type": "standalone",
    "icon_key": "first-international-flight",
    "unlock_rule_type": "first_international_flight",
    "unlock_rule_config": {
      "rule_key": "first_international_flight",
      "source": "Completed Flights；起降机场国家映射",
      "dedupe": "以起降机场所属国家/地区不同判定。",
      "notes": "国家/地区映射应与 World Explorer、Passport 一致。",
      "implementation": "reserved"
    },
    "display_order": 67,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；起降机场国家映射"
  },
  {
    "slug": "widebody-debut",
    "category_slug": "flight_experiences",
    "name_en": "Widebody Debut",
    "name_zh": "宽体机初体验",
    "description_en": "Complete a flight on a widebody aircraft for the first time.",
    "description_zh": "首次乘坐宽体客机。",
    "badge_type": "standalone",
    "icon_key": "widebody-debut",
    "unlock_rule_type": "first_widebody",
    "unlock_rule_config": {
      "rule_key": "first_widebody",
      "source": "Completed Flights；机型分类映射",
      "dedupe": "只解锁一次。",
      "notes": "需要维护标准机型到宽体/窄体分类的可靠映射。",
      "implementation": "reserved"
    },
    "display_order": 68,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；机型分类映射"
  },
  {
    "slug": "narrowbody-debut",
    "category_slug": "flight_experiences",
    "name_en": "Narrowbody Debut",
    "name_zh": "窄体机初体验",
    "description_en": "Complete a flight on a narrowbody aircraft for the first time.",
    "description_zh": "首次乘坐窄体客机。",
    "badge_type": "standalone",
    "icon_key": "narrowbody-debut",
    "unlock_rule_type": "first_narrowbody",
    "unlock_rule_config": {
      "rule_key": "first_narrowbody",
      "source": "Completed Flights；机型分类映射",
      "dedupe": "只解锁一次。",
      "notes": "需要维护标准机型到宽体/窄体分类的可靠映射。",
      "implementation": "reserved"
    },
    "display_order": 69,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；机型分类映射"
  },
  {
    "slug": "queen-of-the-skies",
    "category_slug": "flight_experiences",
    "name_en": "Queen of the Skies",
    "name_zh": "空中女王",
    "description_en": "Complete a flight on a Boeing 747 for the first time.",
    "description_zh": "首次乘坐 Boeing 747。",
    "badge_type": "standalone",
    "icon_key": "queen-of-the-skies",
    "unlock_rule_type": "first_boeing_747",
    "unlock_rule_config": {
      "rule_key": "first_boeing_747",
      "source": "Completed Flights；标准机型代码",
      "dedupe": "识别机型族/子型号并统一映射。",
      "notes": "不可仅凭自由文本标题判断。",
      "implementation": "reserved"
    },
    "display_order": 70,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；标准机型代码"
  },
  {
    "slug": "superjumbo-experience",
    "category_slug": "flight_experiences",
    "name_en": "Superjumbo Experience",
    "name_zh": "超级巨无霸体验",
    "description_en": "Complete a flight on an Airbus A380 for the first time.",
    "description_zh": "首次乘坐 Airbus A380。",
    "badge_type": "standalone",
    "icon_key": "superjumbo-experience",
    "unlock_rule_type": "first_airbus_a380",
    "unlock_rule_config": {
      "rule_key": "first_airbus_a380",
      "source": "Completed Flights；标准机型代码",
      "dedupe": "识别 A380 标准机型。",
      "notes": "不可仅凭自由文本标题判断。",
      "implementation": "reserved"
    },
    "display_order": 71,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；标准机型代码"
  },
  {
    "slug": "triple-seven",
    "category_slug": "flight_experiences",
    "name_en": "Triple Seven",
    "name_zh": "三重七体验",
    "description_en": "Complete a flight on a Boeing 777 for the first time.",
    "description_zh": "首次乘坐 Boeing 777。",
    "badge_type": "standalone",
    "icon_key": "triple-seven",
    "unlock_rule_type": "first_boeing_777",
    "unlock_rule_config": {
      "rule_key": "first_boeing_777",
      "source": "Completed Flights；标准机型代码",
      "dedupe": "识别 777 系列标准机型。",
      "notes": "不可仅凭自由文本标题判断。",
      "implementation": "reserved"
    },
    "display_order": 72,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；标准机型代码"
  },
  {
    "slug": "across-the-atlantic",
    "category_slug": "flight_experiences",
    "name_en": "Across the Atlantic",
    "name_zh": "跨越大西洋",
    "description_en": "Complete a transatlantic flight for the first time.",
    "description_zh": "首次完成跨大西洋航线。",
    "badge_type": "standalone",
    "icon_key": "across-the-atlantic",
    "unlock_rule_type": "transatlantic_flight",
    "unlock_rule_config": {
      "rule_key": "transatlantic_flight",
      "source": "Completed Flights；机场坐标/地理路线规则",
      "dedupe": "按预定义跨大西洋地理判定规则。",
      "notes": "不能仅凭起降机场分别位于不同大洲就直接判定。",
      "implementation": "reserved"
    },
    "display_order": 73,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；机场坐标/地理路线规则"
  },
  {
    "slug": "across-the-pacific",
    "category_slug": "flight_experiences",
    "name_en": "Across the Pacific",
    "name_zh": "跨越太平洋",
    "description_en": "Complete a transpacific flight for the first time.",
    "description_zh": "首次完成跨太平洋航线。",
    "badge_type": "standalone",
    "icon_key": "across-the-pacific",
    "unlock_rule_type": "transpacific_flight",
    "unlock_rule_config": {
      "rule_key": "transpacific_flight",
      "source": "Completed Flights；机场坐标/地理路线规则",
      "dedupe": "按预定义跨太平洋地理判定规则。",
      "notes": "不能仅凭起降机场分别位于不同大洲就直接判定。",
      "implementation": "reserved"
    },
    "display_order": 74,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；机场坐标/地理路线规则"
  },
  {
    "slug": "around-the-world",
    "category_slug": "flight_experiences",
    "name_en": "Around the World",
    "name_zh": "环游世界",
    "description_en": "Accumulate approximately 40,075 km of flight distance.",
    "description_zh": "累计飞行距离达到约 40,075 km。",
    "badge_type": "standalone",
    "icon_key": "around-the-world",
    "unlock_rule_type": "cumulative_distance_km",
    "unlock_rule_config": {
      "rule_key": "cumulative_distance_km",
      "source": "Completed Flights；机场坐标或已保存航段距离",
      "dedupe": "累计距离达到地球周长阈值。",
      "notes": "这是累计距离成就，不代表完成真实环球航线。",
      "implementation": "reserved"
    },
    "display_order": 75,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；机场坐标或已保存航段距离"
  },
  {
    "slug": "capital-connector",
    "category_slug": "flight_experiences",
    "name_en": "Capital Connector",
    "name_zh": "首都连线者",
    "description_en": "Complete a qualifying route between airports serving two national capitals.",
    "description_zh": "首次完成两个国家首都之间的符合条件的航线。",
    "badge_type": "standalone",
    "icon_key": "capital-connector",
    "unlock_rule_type": "capital_connector",
    "unlock_rule_config": {
      "rule_key": "capital_connector",
      "source": "Completed Flights；机场—城市映射；首都数据",
      "dedupe": "根据维护的首都及机场映射判定。",
      "notes": "需要明确机场是否服务于首都，避免仅用城市字符串判断。",
      "implementation": "reserved"
    },
    "display_order": 76,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；机场—城市映射；首都数据"
  },
  {
    "slug": "polar-explorer",
    "category_slug": "flight_experiences",
    "name_en": "Polar Explorer",
    "name_zh": "极地探索者",
    "description_en": "Complete a route that meets the predefined polar-flight criteria.",
    "description_zh": "首次完成符合预定义极地地理规则的航线。",
    "badge_type": "standalone",
    "icon_key": "polar-explorer",
    "unlock_rule_type": "polar_route",
    "unlock_rule_config": {
      "rule_key": "polar_route",
      "source": "Completed Flights；机场坐标或航迹数据",
      "dedupe": "根据预设极地圈/航迹规则判定。",
      "notes": "只有起降机场坐标可能不足以证明实际航迹经过极地；应明确采用的规则。",
      "implementation": "reserved"
    },
    "display_order": 77,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；机场坐标或航迹数据"
  },
  {
    "slug": "long-haul-pioneer",
    "category_slug": "flight_experiences",
    "name_en": "Long-Haul Pioneer",
    "name_zh": "长途飞行先锋",
    "description_en": "Complete a flight with a scheduled duration of at least 7 hours.",
    "description_zh": "首次完成计划时长至少 7 小时的航班。",
    "badge_type": "standalone",
    "icon_key": "long-haul-pioneer",
    "unlock_rule_type": "long_haul_scheduled_minutes",
    "unlock_rule_config": {
      "rule_key": "long_haul_scheduled_minutes",
      "source": "Completed Flights；scheduled_duration_minutes",
      "dedupe": "计划时长 ≥ 420 分钟。",
      "notes": "按既定规则使用计划时长；若计划时长缺失则不授予。",
      "implementation": "available_for_evaluation"
    },
    "display_order": 78,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；scheduled_duration_minutes"
  },
  {
    "slug": "night-owl",
    "category_slug": "flight_experiences",
    "name_en": "Night Owl",
    "name_zh": "夜航者",
    "description_en": "Complete a qualifying night flight for the first time.",
    "description_zh": "首次完成符合定义的夜间飞行。",
    "badge_type": "standalone",
    "icon_key": "night-owl",
    "unlock_rule_type": "night_flight",
    "unlock_rule_config": {
      "rule_key": "night_flight",
      "source": "Completed Flights；实际时间、机场时区",
      "dedupe": "使用明确的夜间起飞/飞行时间窗口。",
      "notes": "须定义夜间窗口；数据不足时不自动授予。",
      "implementation": "reserved"
    },
    "display_order": 79,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；实际时间、机场时区"
  },
  {
    "slug": "sunrise-chaser",
    "category_slug": "flight_experiences",
    "name_en": "Sunrise Chaser",
    "name_zh": "追逐日出者",
    "description_en": "Complete a flight whose time window overlaps the local sunrise window.",
    "description_zh": "首次完成飞行时段覆盖当地日出时间窗口的航班。",
    "badge_type": "standalone",
    "icon_key": "sunrise-chaser",
    "unlock_rule_type": "sunrise_flight",
    "unlock_rule_config": {
      "rule_key": "sunrise_flight",
      "source": "Completed Flights；实际时间；机场时区；日出数据",
      "dedupe": "按预定义日出窗口判断。",
      "notes": "需要可靠的日出数据源或可维护算法。",
      "implementation": "reserved"
    },
    "display_order": 80,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；实际时间；机场时区；日出数据"
  },
  {
    "slug": "red-eye-traveller",
    "category_slug": "flight_experiences",
    "name_en": "Red-Eye Traveller",
    "name_zh": "红眼航班旅者",
    "description_en": "Complete a qualifying overnight flight departing at night and arriving the next day.",
    "description_zh": "首次完成夜间出发、次日到达的航班。",
    "badge_type": "standalone",
    "icon_key": "red-eye-traveller",
    "unlock_rule_type": "red_eye",
    "unlock_rule_config": {
      "rule_key": "red_eye",
      "source": "Completed Flights；实际时间；机场时区",
      "dedupe": "按起降机场当地时间与明确夜间窗口判断。",
      "notes": "与 Night Owl 区分：必须跨当地日期并符合过夜规则。",
      "implementation": "reserved"
    },
    "display_order": 81,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；实际时间；机场时区"
  },
  {
    "slug": "new-year-in-the-sky",
    "category_slug": "flight_experiences",
    "name_en": "New Year in the Sky",
    "name_zh": "云端跨年",
    "description_en": "Be airborne across a qualifying local New Year transition.",
    "description_zh": "航班实际飞行时段跨越当地新年时刻。",
    "badge_type": "standalone",
    "icon_key": "new-year-in-the-sky",
    "unlock_rule_type": "new_year_in_sky",
    "unlock_rule_config": {
      "rule_key": "new_year_in_sky",
      "source": "Completed Flights；实际起降时间；时区",
      "dedupe": "飞行时间区间跨越预先定义的当地 1 月 1 日 00:00。",
      "notes": "需明确采用出发地、到达地还是航班所在时区；建议先选定一种统一规则。",
      "implementation": "reserved"
    },
    "display_order": 82,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；实际起降时间；时区"
  },
  {
    "slug": "one-day-three-flights",
    "category_slug": "flight_experiences",
    "name_en": "One Day, Three Flights",
    "name_zh": "一日三飞",
    "description_en": "Complete at least three flights within one defined calendar day.",
    "description_zh": "同一个统计日完成至少三段航班。",
    "badge_type": "standalone",
    "icon_key": "one-day-three-flights",
    "unlock_rule_type": "three_flights_same_day",
    "unlock_rule_config": {
      "rule_key": "three_flights_same_day",
      "source": "Completed Flights；日期/时区规则",
      "dedupe": "同一统计日 ≥ 3 段。",
      "notes": "建议采用用户设置的时区或统一 UTC 规则，并在产品中固定。",
      "implementation": "reserved"
    },
    "display_order": 83,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；日期/时区规则"
  },
  {
    "slug": "home-again",
    "category_slug": "flight_experiences",
    "name_en": "Home Again",
    "name_zh": "回到原点",
    "description_en": "Complete a journey that returns to its original departure airport.",
    "description_zh": "完成一段或多段旅程后返回最初的出发机场。",
    "badge_type": "standalone",
    "icon_key": "home-again",
    "unlock_rule_type": "home_again",
    "unlock_rule_config": {
      "rule_key": "home_again",
      "source": "Completed Flights；按时间排序的航段",
      "dedupe": "旅程从机场 A 出发，经一段或多段后回到 A。",
      "notes": "需要定义旅程分段和时间窗口；不要把任意相隔多年的返程航班自动拼成一趟旅程。",
      "implementation": "reserved"
    },
    "display_order": 84,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Completed Flights；按时间排序的航段"
  },
  {
    "slug": "first-memorial-flight",
    "category_slug": "flight_experiences",
    "name_en": "First Memorial Flight",
    "name_zh": "首次纪念飞行",
    "description_en": "Complete a Memorial Flight for the first time.",
    "description_zh": "首次完成一条 Memorial Flight。",
    "badge_type": "standalone",
    "icon_key": "first-memorial-flight",
    "unlock_rule_type": "first_memorial_flight",
    "unlock_rule_config": {
      "rule_key": "first_memorial_flight",
      "source": "Memorial Flight 完成记录",
      "dedupe": "只解锁一次。",
      "notes": "独立徽章归入 Flight Experiences；Heritage Keeper 仍按纪念飞行总次数升级。",
      "implementation": "available_for_evaluation"
    },
    "display_order": 85,
    "is_active": true,
    "is_hidden": false,
    "source_type": "Memorial Flight 完成记录"
  },
  {
    "slug": "round-tripper",
    "category_slug": "flight_experiences",
    "name_en": "Round Tripper",
    "name_zh": "往返飞行家",
    "description_en": "Complete both directions of the same route.",
    "description_zh": "完成同一条航线的两个方向 A→B 与 B→A。",
    "badge_type": "standalone",
    "icon_key": "round-tripper",
    "unlock_rule_type": "round_trip",
    "unlock_rule_config": {
      "rule_key": "round_trip",
      "source": "Completed Flights；标准化起降机场",
      "dedupe": "需要一条航线两个方向都至少完成一次。",
      "notes": "可作为扩展徽章；如 V1 不纳入，可暂时关闭配置。",
      "implementation": "reserved"
    },
    "display_order": 86,
    "is_active": false,
    "is_hidden": false,
    "source_type": "Completed Flights；标准化起降机场"
  },
  {
    "slug": "admin-defined-memorial-badges",
    "category_slug": "flight_experiences",
    "name_en": "Admin-defined Memorial Badges",
    "name_zh": "管理员纪念徽章",
    "description_en": "Unlock an admin-configured commemorative badge by completing its linked Memorial Flight.",
    "description_zh": "由管理员为特定 Memorial Flight 配置专属徽章；用户完成对应纪念航线后解锁。",
    "badge_type": "standalone",
    "icon_key": "admin-defined-memorial-badges",
    "unlock_rule_type": "admin_memorial_badge",
    "unlock_rule_config": {
      "rule_key": "admin_memorial_badge",
      "source": "Memorial Flight 稳定事件 ID；徽章配置",
      "dedupe": "每个用户对每个徽章最多解锁一次。",
      "notes": "徽章名称、图案、多语言文案、发布状态及关联纪念事件由管理员配置；不在代码中硬编码具体事故/事件。",
      "implementation": "reserved"
    },
    "display_order": 87,
    "is_active": false,
    "is_hidden": true,
    "source_type": "Memorial Flight 稳定事件 ID；徽章配置"
  }
]
$achievement_definitions$::jsonb)
  AS x(slug text,category_slug text,name_en text,name_zh text,description_en text,description_zh text,badge_type text,icon_key text,unlock_rule_type text,unlock_rule_config jsonb,display_order integer,is_active boolean,is_hidden boolean,source_type text)
)
INSERT INTO public.achievement_definitions (slug,category_id,name_en,name_zh,description_en,description_zh,badge_type,icon_key,unlock_rule_type,unlock_rule_config,display_order,is_active,is_hidden,source_type)
SELECT x.slug,c.id,x.name_en,x.name_zh,x.description_en,x.description_zh,x.badge_type,x.icon_key,x.unlock_rule_type,x.unlock_rule_config,x.display_order,x.is_active,x.is_hidden,x.source_type
FROM definition_seed x JOIN public.achievement_categories c ON c.slug=x.category_slug
ON CONFLICT (slug) DO UPDATE
SET category_id = EXCLUDED.category_id,
    name_en = EXCLUDED.name_en,
    name_zh = EXCLUDED.name_zh,
    description_en = EXCLUDED.description_en,
    description_zh = EXCLUDED.description_zh,
    badge_type = EXCLUDED.badge_type,
    icon_key = EXCLUDED.icon_key,
    unlock_rule_type = EXCLUDED.unlock_rule_type,
    unlock_rule_config = EXCLUDED.unlock_rule_config,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    is_hidden = EXCLUDED.is_hidden,
    source_type = EXCLUDED.source_type,
    updated_at = now()
WHERE (public.achievement_definitions.category_id,
       public.achievement_definitions.name_en,
       public.achievement_definitions.name_zh,
       public.achievement_definitions.description_en,
       public.achievement_definitions.description_zh,
       public.achievement_definitions.badge_type,
       public.achievement_definitions.icon_key,
       public.achievement_definitions.unlock_rule_type,
       public.achievement_definitions.unlock_rule_config,
       public.achievement_definitions.display_order,
       public.achievement_definitions.is_active,
       public.achievement_definitions.is_hidden,
       public.achievement_definitions.source_type)
  IS DISTINCT FROM
      (EXCLUDED.category_id,
       EXCLUDED.name_en,
       EXCLUDED.name_zh,
       EXCLUDED.description_en,
       EXCLUDED.description_zh,
       EXCLUDED.badge_type,
       EXCLUDED.icon_key,
       EXCLUDED.unlock_rule_type,
       EXCLUDED.unlock_rule_config,
       EXCLUDED.display_order,
       EXCLUDED.is_active,
       EXCLUDED.is_hidden,
       EXCLUDED.source_type);

WITH level_seed AS (
  SELECT * FROM jsonb_to_recordset($achievement_levels$
[
  {
    "definition_slug": "frequent-flyer",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 10,
    "threshold_unit": "段航班",
    "name_en": "Frequent Flyer Bronze",
    "name_zh": "常旅客 铜"
  },
  {
    "definition_slug": "frequent-flyer",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 50,
    "threshold_unit": "段航班",
    "name_en": "Frequent Flyer Silver",
    "name_zh": "常旅客 银"
  },
  {
    "definition_slug": "frequent-flyer",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 100,
    "threshold_unit": "段航班",
    "name_en": "Frequent Flyer Gold",
    "name_zh": "常旅客 金"
  },
  {
    "definition_slug": "frequent-flyer",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 500,
    "threshold_unit": "段航班",
    "name_en": "Frequent Flyer Platinum",
    "name_zh": "常旅客 铂金"
  },
  {
    "definition_slug": "time-aloft",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 10,
    "threshold_unit": "小时",
    "name_en": "Time Aloft Bronze",
    "name_zh": "云端时光 铜"
  },
  {
    "definition_slug": "time-aloft",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 100,
    "threshold_unit": "小时",
    "name_en": "Time Aloft Silver",
    "name_zh": "云端时光 银"
  },
  {
    "definition_slug": "time-aloft",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 500,
    "threshold_unit": "小时",
    "name_en": "Time Aloft Gold",
    "name_zh": "云端时光 金"
  },
  {
    "definition_slug": "time-aloft",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 1000,
    "threshold_unit": "小时",
    "name_en": "Time Aloft Platinum",
    "name_zh": "云端时光 铂金"
  },
  {
    "definition_slug": "distance-traveller",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 10000,
    "threshold_unit": "km",
    "name_en": "Distance Traveller Bronze",
    "name_zh": "飞行旅者 铜"
  },
  {
    "definition_slug": "distance-traveller",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 50000,
    "threshold_unit": "km",
    "name_en": "Distance Traveller Silver",
    "name_zh": "飞行旅者 银"
  },
  {
    "definition_slug": "distance-traveller",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 250000,
    "threshold_unit": "km",
    "name_en": "Distance Traveller Gold",
    "name_zh": "飞行旅者 金"
  },
  {
    "definition_slug": "distance-traveller",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 1000000,
    "threshold_unit": "km",
    "name_en": "Distance Traveller Platinum",
    "name_zh": "飞行旅者 铂金"
  },
  {
    "definition_slug": "country-collector",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 5,
    "threshold_unit": "国家/地区",
    "name_en": "Country Collector Bronze",
    "name_zh": "国家收藏家 铜"
  },
  {
    "definition_slug": "country-collector",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 10,
    "threshold_unit": "国家/地区",
    "name_en": "Country Collector Silver",
    "name_zh": "国家收藏家 银"
  },
  {
    "definition_slug": "country-collector",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 25,
    "threshold_unit": "国家/地区",
    "name_en": "Country Collector Gold",
    "name_zh": "国家收藏家 金"
  },
  {
    "definition_slug": "country-collector",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 50,
    "threshold_unit": "国家/地区",
    "name_en": "Country Collector Platinum",
    "name_zh": "国家收藏家 铂金"
  },
  {
    "definition_slug": "airport-explorer",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 10,
    "threshold_unit": "不同机场",
    "name_en": "Airport Explorer Bronze",
    "name_zh": "机场探索者 铜"
  },
  {
    "definition_slug": "airport-explorer",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 25,
    "threshold_unit": "不同机场",
    "name_en": "Airport Explorer Silver",
    "name_zh": "机场探索者 银"
  },
  {
    "definition_slug": "airport-explorer",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 50,
    "threshold_unit": "不同机场",
    "name_en": "Airport Explorer Gold",
    "name_zh": "机场探索者 金"
  },
  {
    "definition_slug": "airport-explorer",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 100,
    "threshold_unit": "不同机场",
    "name_en": "Airport Explorer Platinum",
    "name_zh": "机场探索者 铂金"
  },
  {
    "definition_slug": "continental-explorer",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 2,
    "threshold_unit": "大洲",
    "name_en": "Continental Explorer Bronze",
    "name_zh": "大洲探索者 铜"
  },
  {
    "definition_slug": "continental-explorer",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 3,
    "threshold_unit": "大洲",
    "name_en": "Continental Explorer Silver",
    "name_zh": "大洲探索者 银"
  },
  {
    "definition_slug": "continental-explorer",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 4,
    "threshold_unit": "大洲",
    "name_en": "Continental Explorer Gold",
    "name_zh": "大洲探索者 金"
  },
  {
    "definition_slug": "continental-explorer",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 6,
    "threshold_unit": "大洲",
    "name_en": "Continental Explorer Platinum",
    "name_zh": "大洲探索者 铂金"
  },
  {
    "definition_slug": "city-hopper",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 10,
    "threshold_unit": "不同城市",
    "name_en": "City Hopper Bronze",
    "name_zh": "城市穿梭者 铜"
  },
  {
    "definition_slug": "city-hopper",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 25,
    "threshold_unit": "不同城市",
    "name_en": "City Hopper Silver",
    "name_zh": "城市穿梭者 银"
  },
  {
    "definition_slug": "city-hopper",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 50,
    "threshold_unit": "不同城市",
    "name_en": "City Hopper Gold",
    "name_zh": "城市穿梭者 金"
  },
  {
    "definition_slug": "city-hopper",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 100,
    "threshold_unit": "不同城市",
    "name_en": "City Hopper Platinum",
    "name_zh": "城市穿梭者 铂金"
  },
  {
    "definition_slug": "fleet-collector",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 3,
    "threshold_unit": "种不同机型",
    "name_en": "Fleet Collector Bronze",
    "name_zh": "机队收藏家 铜"
  },
  {
    "definition_slug": "fleet-collector",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 5,
    "threshold_unit": "种不同机型",
    "name_en": "Fleet Collector Silver",
    "name_zh": "机队收藏家 银"
  },
  {
    "definition_slug": "fleet-collector",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 10,
    "threshold_unit": "种不同机型",
    "name_en": "Fleet Collector Gold",
    "name_zh": "机队收藏家 金"
  },
  {
    "definition_slug": "fleet-collector",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 25,
    "threshold_unit": "种不同机型",
    "name_en": "Fleet Collector Platinum",
    "name_zh": "机队收藏家 铂金"
  },
  {
    "definition_slug": "boeing-explorer",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 2,
    "threshold_unit": "种不同波音机型",
    "name_en": "Boeing Explorer Bronze",
    "name_zh": "波音探索者 铜"
  },
  {
    "definition_slug": "boeing-explorer",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 4,
    "threshold_unit": "种不同波音机型",
    "name_en": "Boeing Explorer Silver",
    "name_zh": "波音探索者 银"
  },
  {
    "definition_slug": "boeing-explorer",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 6,
    "threshold_unit": "种不同波音机型",
    "name_en": "Boeing Explorer Gold",
    "name_zh": "波音探索者 金"
  },
  {
    "definition_slug": "boeing-explorer",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 10,
    "threshold_unit": "种不同波音机型",
    "name_en": "Boeing Explorer Platinum",
    "name_zh": "波音探索者 铂金"
  },
  {
    "definition_slug": "airbus-explorer",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 2,
    "threshold_unit": "种不同空客机型",
    "name_en": "Airbus Explorer Bronze",
    "name_zh": "空客探索者 铜"
  },
  {
    "definition_slug": "airbus-explorer",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 4,
    "threshold_unit": "种不同空客机型",
    "name_en": "Airbus Explorer Silver",
    "name_zh": "空客探索者 银"
  },
  {
    "definition_slug": "airbus-explorer",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 6,
    "threshold_unit": "种不同空客机型",
    "name_en": "Airbus Explorer Gold",
    "name_zh": "空客探索者 金"
  },
  {
    "definition_slug": "airbus-explorer",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 10,
    "threshold_unit": "种不同空客机型",
    "name_en": "Airbus Explorer Platinum",
    "name_zh": "空客探索者 铂金"
  },
  {
    "definition_slug": "route-collector",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 5,
    "threshold_unit": "条不同航线",
    "name_en": "Route Collector Bronze",
    "name_zh": "航线收藏家 铜"
  },
  {
    "definition_slug": "route-collector",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 20,
    "threshold_unit": "条不同航线",
    "name_en": "Route Collector Silver",
    "name_zh": "航线收藏家 银"
  },
  {
    "definition_slug": "route-collector",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 50,
    "threshold_unit": "条不同航线",
    "name_en": "Route Collector Gold",
    "name_zh": "航线收藏家 金"
  },
  {
    "definition_slug": "route-collector",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 100,
    "threshold_unit": "条不同航线",
    "name_en": "Route Collector Platinum",
    "name_zh": "航线收藏家 铂金"
  },
  {
    "definition_slug": "international-routes",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 3,
    "threshold_unit": "条不同国际航线",
    "name_en": "International Routes Bronze",
    "name_zh": "国际航线 铜"
  },
  {
    "definition_slug": "international-routes",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 10,
    "threshold_unit": "条不同国际航线",
    "name_en": "International Routes Silver",
    "name_zh": "国际航线 银"
  },
  {
    "definition_slug": "international-routes",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 25,
    "threshold_unit": "条不同国际航线",
    "name_en": "International Routes Gold",
    "name_zh": "国际航线 金"
  },
  {
    "definition_slug": "international-routes",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 50,
    "threshold_unit": "条不同国际航线",
    "name_en": "International Routes Platinum",
    "name_zh": "国际航线 铂金"
  },
  {
    "definition_slug": "challenge-pilot",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 3,
    "threshold_unit": "次挑战",
    "name_en": "Challenge Pilot Bronze",
    "name_zh": "挑战飞行员 铜"
  },
  {
    "definition_slug": "challenge-pilot",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 10,
    "threshold_unit": "次挑战",
    "name_en": "Challenge Pilot Silver",
    "name_zh": "挑战飞行员 银"
  },
  {
    "definition_slug": "challenge-pilot",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 25,
    "threshold_unit": "次挑战",
    "name_en": "Challenge Pilot Gold",
    "name_zh": "挑战飞行员 金"
  },
  {
    "definition_slug": "challenge-pilot",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 50,
    "threshold_unit": "次挑战",
    "name_en": "Challenge Pilot Platinum",
    "name_zh": "挑战飞行员 铂金"
  },
  {
    "definition_slug": "route-adventurer",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 5,
    "threshold_unit": "条不同挑战航线",
    "name_en": "Route Adventurer Bronze",
    "name_zh": "航线冒险家 铜"
  },
  {
    "definition_slug": "route-adventurer",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 15,
    "threshold_unit": "条不同挑战航线",
    "name_en": "Route Adventurer Silver",
    "name_zh": "航线冒险家 银"
  },
  {
    "definition_slug": "route-adventurer",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 30,
    "threshold_unit": "条不同挑战航线",
    "name_en": "Route Adventurer Gold",
    "name_zh": "航线冒险家 金"
  },
  {
    "definition_slug": "route-adventurer",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 75,
    "threshold_unit": "条不同挑战航线",
    "name_en": "Route Adventurer Platinum",
    "name_zh": "航线冒险家 铂金"
  },
  {
    "definition_slug": "heritage-keeper",
    "level_key": "bronze",
    "level_order": 1,
    "threshold_value": 3,
    "threshold_unit": "条纪念航线",
    "name_en": "Heritage Keeper Bronze",
    "name_zh": "航空传承守护者 铜"
  },
  {
    "definition_slug": "heritage-keeper",
    "level_key": "silver",
    "level_order": 2,
    "threshold_value": 10,
    "threshold_unit": "条纪念航线",
    "name_en": "Heritage Keeper Silver",
    "name_zh": "航空传承守护者 银"
  },
  {
    "definition_slug": "heritage-keeper",
    "level_key": "gold",
    "level_order": 3,
    "threshold_value": 25,
    "threshold_unit": "条纪念航线",
    "name_en": "Heritage Keeper Gold",
    "name_zh": "航空传承守护者 金"
  },
  {
    "definition_slug": "heritage-keeper",
    "level_key": "platinum",
    "level_order": 4,
    "threshold_value": 50,
    "threshold_unit": "条纪念航线",
    "name_en": "Heritage Keeper Platinum",
    "name_zh": "航空传承守护者 铂金"
  }
]
$achievement_levels$::jsonb)
  AS x(definition_slug text,level_key text,level_order smallint,threshold_value numeric,threshold_unit text,name_en text,name_zh text)
)
INSERT INTO public.achievement_levels (achievement_definition_id,level_key,level_order,threshold_value,threshold_unit,name_en,name_zh)
SELECT d.id,x.level_key,x.level_order,x.threshold_value,x.threshold_unit,x.name_en,x.name_zh
FROM level_seed x JOIN public.achievement_definitions d ON d.slug=x.definition_slug
ON CONFLICT (achievement_definition_id,level_key) DO UPDATE
SET level_order = EXCLUDED.level_order,
    threshold_value = EXCLUDED.threshold_value,
    threshold_unit = EXCLUDED.threshold_unit,
    name_en = EXCLUDED.name_en,
    name_zh = EXCLUDED.name_zh,
    updated_at = now()
WHERE (public.achievement_levels.level_order,
       public.achievement_levels.threshold_value,
       public.achievement_levels.threshold_unit,
       public.achievement_levels.name_en,
       public.achievement_levels.name_zh)
  IS DISTINCT FROM
      (EXCLUDED.level_order,
       EXCLUDED.threshold_value,
       EXCLUDED.threshold_unit,
       EXCLUDED.name_en,
       EXCLUDED.name_zh);

-- Seed upserts may upgrade metadata in an existing installation. Validate again
-- after they run so an incompatible historic row cannot survive unnoticed.
DO $achievement_post_seed_integrity$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.achievement_definitions d
    LEFT JOIN public.achievement_levels l ON l.achievement_definition_id = d.id
    WHERE d.badge_type = 'progressive'
    GROUP BY d.id
    HAVING count(l.id) <> 4
  ) THEN
    RAISE EXCEPTION 'Each progressive achievement must have exactly four persisted levels.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.achievement_definitions d
    JOIN public.achievement_levels l ON l.achievement_definition_id = d.id
    WHERE d.badge_type = 'standalone'
  ) THEN
    RAISE EXCEPTION 'Standalone achievements must not have persisted achievement_levels rows.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_achievements ua
    JOIN public.achievement_definitions d ON d.id = ua.achievement_definition_id
    LEFT JOIN public.achievement_levels l ON l.id = ua.achievement_level_id
    WHERE (d.badge_type = 'progressive' AND (ua.achievement_level_id IS NULL OR l.achievement_definition_id <> d.id))
       OR (d.badge_type = 'standalone' AND ua.achievement_level_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Achievement definition seed upgrade would leave inconsistent public.user_achievements rows; correct the existing rows before retrying.';
  END IF;
END;
$achievement_post_seed_integrity$;

COMMIT;


