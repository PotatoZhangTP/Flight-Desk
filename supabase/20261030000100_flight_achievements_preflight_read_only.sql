-- Flight Desk Achievement migration preflight (READ ONLY)
-- Run this entire file in Supabase SQL Editor before running
-- 20261030000100_enable_all_flight_achievements.sql.
-- A successful run ends with: FLIGHT_ACHIEVEMENTS_PREFLIGHT_OK

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

DO $preflight$
DECLARE
  v_table text;
  v_column text;
BEGIN
  IF current_setting('server_version_num')::integer < 150000 THEN
    RAISE EXCEPTION 'PostgreSQL 15 or newer is required (found %)', version();
  END IF;

  IF to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'Required function auth.uid() is missing';
  END IF;

  IF to_regprocedure('public.is_site_admin()') IS NULL THEN
    RAISE EXCEPTION 'Required function public.is_site_admin() is missing';
  END IF;

  FOREACH v_table IN ARRAY ARRAY[
    'flights', 'airports', 'daily_challenge_completions',
    'memorial_participation', 'achievement_categories',
    'achievement_definitions', 'achievement_levels', 'user_achievements'
  ] LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      RAISE EXCEPTION 'Required table public.% is missing', v_table;
    END IF;
  END LOOP;

  FOR v_table, v_column IN
    SELECT required.table_name, required.column_name
    FROM (VALUES
      ('flights', 'id'), ('flights', 'user_id'), ('flights', 'status'),
      ('flights', 'flight_date'), ('flights', 'created_at'),
      ('flights', 'actual_duration_minutes'),
      ('flights', 'scheduled_duration_minutes'), ('flights', 'duration_minutes'),
      ('flights', 'aircraft_type'), ('flights', 'departure_airport'),
      ('flights', 'arrival_airport'), ('flights', 'departure_airport_iata'),
      ('flights', 'arrival_airport_iata'), ('flights', 'departure_airport_icao'),
      ('flights', 'arrival_airport_icao'), ('flights', 'departure_country_code'),
      ('flights', 'arrival_country_code'),
      ('airports', 'id'), ('airports', 'status'), ('airports', 'icao_code'),
      ('airports', 'iata_code'), ('airports', 'ident'), ('airports', 'gps_code'),
      ('airports', 'country_code'), ('airports', 'municipality'),
      ('airports', 'latitude'), ('airports', 'longitude'),
      ('airports', 'scheduled_service'),
      ('daily_challenge_completions', 'id'),
      ('daily_challenge_completions', 'user_id'),
      ('daily_challenge_completions', 'challenge_date'),
      ('daily_challenge_completions', 'category'),
      ('daily_challenge_completions', 'completed_at'),
      ('memorial_participation', 'id'), ('memorial_participation', 'event_id'),
      ('memorial_participation', 'user_id'),
      ('memorial_participation', 'flight_id'),
      ('memorial_participation', 'marked_at'),
      ('achievement_categories', 'id'), ('achievement_categories', 'slug'),
      ('achievement_categories', 'is_active'),
      ('achievement_definitions', 'id'), ('achievement_definitions', 'slug'),
      ('achievement_definitions', 'category_id'),
      ('achievement_definitions', 'badge_type'),
      ('achievement_definitions', 'unlock_rule_type'),
      ('achievement_definitions', 'unlock_rule_config'),
      ('achievement_definitions', 'is_active'),
      ('achievement_definitions', 'is_hidden'),
      ('achievement_levels', 'id'),
      ('achievement_levels', 'achievement_definition_id'),
      ('achievement_levels', 'level_key'), ('achievement_levels', 'level_order'),
      ('achievement_levels', 'threshold_value'),
      ('achievement_levels', 'threshold_unit'),
      ('user_achievements', 'id'), ('user_achievements', 'user_id'),
      ('user_achievements', 'achievement_definition_id'),
      ('user_achievements', 'achievement_level_id'),
      ('user_achievements', 'achieved_at'),
      ('user_achievements', 'unlocked_at')
    ) AS required(table_name, column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = to_regclass('public.' || required.table_name)
        AND attribute.attname = required.column_name
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    )
  LOOP
    RAISE EXCEPTION 'Required column public.%.% is missing', v_table, v_column;
  END LOOP;

  IF EXISTS (
    WITH expected(table_name, column_name, type_family) AS (
      VALUES
        ('flights', 'id', 'uuid'), ('flights', 'user_id', 'uuid'),
        ('flights', 'status', 'text'),
        ('flights', 'actual_duration_minutes', 'numeric'),
        ('flights', 'scheduled_duration_minutes', 'numeric'),
        ('flights', 'duration_minutes', 'numeric'),
        ('airports', 'id', 'numeric'), ('airports', 'status', 'text'),
        ('airports', 'latitude', 'numeric'), ('airports', 'longitude', 'numeric'),
        ('airports', 'scheduled_service', 'boolean'),
        ('daily_challenge_completions', 'id', 'uuid'),
        ('daily_challenge_completions', 'user_id', 'uuid'),
        ('daily_challenge_completions', 'challenge_date', 'date'),
        ('daily_challenge_completions', 'category', 'text'),
        ('memorial_participation', 'id', 'uuid'),
        ('memorial_participation', 'event_id', 'uuid'),
        ('memorial_participation', 'user_id', 'uuid'),
        ('memorial_participation', 'flight_id', 'uuid'),
        ('achievement_definitions', 'unlock_rule_config', 'jsonb'),
        ('achievement_levels', 'threshold_value', 'numeric'),
        ('user_achievements', 'user_id', 'uuid')
    )
    SELECT 1
    FROM expected
    INNER JOIN pg_catalog.pg_attribute AS attribute
      ON attribute.attrelid = to_regclass('public.' || expected.table_name)
      AND attribute.attname = expected.column_name
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
    INNER JOIN pg_catalog.pg_type AS data_type ON data_type.oid = attribute.atttypid
    WHERE CASE expected.type_family
      WHEN 'uuid' THEN data_type.oid <> 'uuid'::regtype
      WHEN 'text' THEN data_type.oid NOT IN ('text'::regtype, 'varchar'::regtype, 'bpchar'::regtype)
      WHEN 'numeric' THEN data_type.typcategory <> 'N'
      WHEN 'boolean' THEN data_type.oid <> 'boolean'::regtype
      WHEN 'date' THEN data_type.oid <> 'date'::regtype
      WHEN 'jsonb' THEN data_type.oid <> 'jsonb'::regtype
      ELSE true
    END
  ) THEN
    RAISE EXCEPTION 'One or more required columns have incompatible types; inspect the column report below';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS relation
    INNER JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = ANY (ARRAY[
        'flights', 'airports', 'daily_challenge_completions',
        'memorial_participation', 'achievement_categories',
        'achievement_definitions', 'achievement_levels', 'user_achievements'
      ])
      AND NOT relation.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS must be enabled on every required public table';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.daily_challenge_completions
    WHERE category NOT IN ('quick', 'regional', 'medium', 'long')
  ) THEN
    RAISE EXCEPTION 'daily_challenge_completions contains an unsupported category';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.daily_challenge_completions
    GROUP BY user_id, challenge_date, category HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'daily_challenge_completions contains duplicate user/date/category rows';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_index AS index_record
    WHERE index_record.indrelid = 'public.daily_challenge_completions'::regclass
      AND index_record.indisunique
      AND ARRAY(
        SELECT attribute.attname::text
        FROM unnest(index_record.indkey) WITH ORDINALITY AS indexed(attnum, position)
        INNER JOIN pg_catalog.pg_attribute AS attribute
          ON attribute.attrelid = index_record.indrelid
          AND attribute.attnum = indexed.attnum
        ORDER BY indexed.position
      ) = ARRAY['user_id', 'challenge_date', 'category']::text[]
  ) THEN
    RAISE EXCEPTION 'daily_challenge_completions requires UNIQUE(user_id, challenge_date, category)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.memorial_participation
    GROUP BY event_id, user_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'memorial_participation contains duplicate event/user rows';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_index AS index_record
    WHERE index_record.indrelid = 'public.memorial_participation'::regclass
      AND index_record.indisunique
      AND ARRAY(
        SELECT attribute.attname::text
        FROM unnest(index_record.indkey) WITH ORDINALITY AS indexed(attnum, position)
        INNER JOIN pg_catalog.pg_attribute AS attribute
          ON attribute.attrelid = index_record.indrelid
          AND attribute.attnum = indexed.attnum
        ORDER BY indexed.position
      ) = ARRAY['event_id', 'user_id']::text[]
  ) THEN
    RAISE EXCEPTION 'memorial_participation requires UNIQUE(event_id, user_id)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.memorial_participation AS participation
    INNER JOIN public.flights AS flight ON flight.id = participation.flight_id
    WHERE participation.flight_id IS NOT NULL
      AND participation.user_id <> flight.user_id
  ) THEN
    RAISE EXCEPTION 'A Memorial participation row references another user''s flight';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_achievements AS award
    LEFT JOIN public.achievement_definitions AS definition
      ON definition.id = award.achievement_definition_id
    LEFT JOIN public.achievement_levels AS level
      ON level.id = award.achievement_level_id
    WHERE definition.id IS NULL
       OR (definition.badge_type = 'progressive' AND level.id IS NULL)
       OR (definition.badge_type = 'standalone' AND level.id IS NOT NULL)
       OR (level.id IS NOT NULL
         AND level.achievement_definition_id <> award.achievement_definition_id)
  ) THEN
    RAISE EXCEPTION 'user_achievements contains an invalid definition/level relationship';
  END IF;

  IF has_table_privilege('authenticated', 'public.user_achievements', 'INSERT')
     OR has_table_privilege('authenticated', 'public.user_achievements', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.user_achievements', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated must not have direct write privileges on user_achievements';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polrelid = 'public.achievement_categories'::regclass
      AND polname = 'achievement_categories_read_active'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polrelid = 'public.achievement_definitions'::regclass
      AND polname = 'achievement_definitions_read_visible'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polrelid = 'public.achievement_levels'::regclass
      AND polname = 'achievement_levels_read_visible_definition'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polrelid = 'public.user_achievements'::regclass
      AND polname = 'user_achievements_read_own'
  ) THEN
    RAISE EXCEPTION 'One or more required Achievement RLS policies are missing';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.is_site_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated requires EXECUTE on public.is_site_admin() for existing RLS policies';
  END IF;

  IF has_function_privilege('anon', 'public.is_site_admin()', 'EXECUTE')
     OR (SELECT prosecdef FROM pg_catalog.pg_proc
         WHERE oid = 'public.is_site_admin()'::regprocedure) THEN
    RAISE EXCEPTION 'public.is_site_admin() has an unsafe execution configuration';
  END IF;
END;
$preflight$;

-- Reviewable compatibility report. All rows should match the repository schema.
SELECT
  namespace.nspname AS schema_name,
  relation.relname AS table_name,
  attribute.attname AS column_name,
  pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) AS data_type,
  attribute.attnotnull AS not_null
FROM pg_catalog.pg_attribute AS attribute
INNER JOIN pg_catalog.pg_class AS relation ON relation.oid = attribute.attrelid
INNER JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relname = ANY (ARRAY[
    'flights', 'airports', 'daily_challenge_completions',
    'memorial_participation', 'achievement_categories',
    'achievement_definitions', 'achievement_levels', 'user_achievements'
  ])
  AND attribute.attnum > 0
  AND NOT attribute.attisdropped
ORDER BY relation.relname, attribute.attnum;

SELECT
  (SELECT count(*) FROM public.flights) AS flight_rows,
  (SELECT count(*) FROM public.flights WHERE status = 'completed') AS completed_flight_rows,
  (SELECT count(*) FROM public.airports) AS airport_rows,
  (SELECT count(*) FROM public.daily_challenge_completions) AS challenge_completion_rows,
  (SELECT count(*) FROM public.memorial_participation) AS memorial_participation_rows,
  (SELECT count(*) FROM public.user_achievements) AS existing_award_rows;

SELECT
  'FLIGHT_ACHIEVEMENTS_PREFLIGHT_OK' AS result,
  version() AS database_version,
  pg_get_userbyid(function_record.proowner) AS is_site_admin_owner,
  function_record.prosecdef AS is_site_admin_security_definer,
  function_record.proconfig AS is_site_admin_configuration
FROM pg_catalog.pg_proc AS function_record
WHERE function_record.oid = 'public.is_site_admin()'::regprocedure;

SELECT
  relation.relname AS table_name,
  policy.polname AS policy_name,
  pg_get_expr(policy.polqual, policy.polrelid) AS using_expression,
  pg_get_expr(policy.polwithcheck, policy.polrelid) AS check_expression
FROM pg_catalog.pg_policy AS policy
INNER JOIN pg_catalog.pg_class AS relation ON relation.oid = policy.polrelid
WHERE policy.polrelid = ANY (ARRAY[
  'public.achievement_categories'::regclass,
  'public.achievement_definitions'::regclass,
  'public.achievement_levels'::regclass,
  'public.user_achievements'::regclass
]::oid[])
ORDER BY relation.relname, policy.polname;

COMMIT;
