-- Flight Desk Achievement migration postflight (READ ONLY)
-- Run after 20261030000100_enable_all_flight_achievements.sql.
-- A successful run ends with: FLIGHT_ACHIEVEMENTS_POSTFLIGHT_OK

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

DO $postflight$
BEGIN
  IF to_regprocedure('public.achievement_metrics_for_user(uuid)') IS NULL
     OR to_regprocedure('public.get_my_achievement_progress()') IS NULL
     OR to_regprocedure('public.refresh_achievements_for_user(uuid)') IS NULL
     OR to_regprocedure('public.refresh_my_achievements()') IS NULL THEN
    RAISE EXCEPTION 'One or more required Achievement functions are missing';
  END IF;

  IF (
    SELECT count(*)
    FROM public.achievement_definitions
    WHERE slug = ANY (ARRAY[
      'frequent-flyer', 'time-aloft', 'distance-traveller',
      'country-collector', 'airport-explorer', 'continental-explorer',
      'city-hopper', 'fleet-collector', 'boeing-explorer',
      'airbus-explorer', 'route-collector', 'international-routes',
      'challenge-pilot', 'heritage-keeper'
    ])
  ) <> 14 THEN
    RAISE EXCEPTION 'Expected exactly 14 target Achievement definitions';
  END IF;

  IF EXISTS (
    WITH expected(slug, level_key, level_order, threshold_value) AS (
      VALUES
        ('frequent-flyer', 'bronze', 1, 10::numeric),
        ('frequent-flyer', 'silver', 2, 50),
        ('frequent-flyer', 'gold', 3, 100),
        ('frequent-flyer', 'platinum', 4, 500),
        ('time-aloft', 'bronze', 1, 10),
        ('time-aloft', 'silver', 2, 100),
        ('time-aloft', 'gold', 3, 500),
        ('time-aloft', 'platinum', 4, 1000),
        ('distance-traveller', 'bronze', 1, 10000),
        ('distance-traveller', 'silver', 2, 50000),
        ('distance-traveller', 'gold', 3, 250000),
        ('distance-traveller', 'platinum', 4, 1000000),
        ('country-collector', 'bronze', 1, 5),
        ('country-collector', 'silver', 2, 10),
        ('country-collector', 'gold', 3, 25),
        ('country-collector', 'platinum', 4, 50),
        ('airport-explorer', 'bronze', 1, 10),
        ('airport-explorer', 'silver', 2, 25),
        ('airport-explorer', 'gold', 3, 50),
        ('airport-explorer', 'platinum', 4, 100),
        ('continental-explorer', 'bronze', 1, 2),
        ('continental-explorer', 'silver', 2, 3),
        ('continental-explorer', 'gold', 3, 4),
        ('continental-explorer', 'platinum', 4, 6),
        ('city-hopper', 'bronze', 1, 10),
        ('city-hopper', 'silver', 2, 25),
        ('city-hopper', 'gold', 3, 50),
        ('city-hopper', 'platinum', 4, 100),
        ('fleet-collector', 'bronze', 1, 3),
        ('fleet-collector', 'silver', 2, 5),
        ('fleet-collector', 'gold', 3, 10),
        ('fleet-collector', 'platinum', 4, 25),
        ('boeing-explorer', 'bronze', 1, 2),
        ('boeing-explorer', 'silver', 2, 4),
        ('boeing-explorer', 'gold', 3, 6),
        ('boeing-explorer', 'platinum', 4, 10),
        ('airbus-explorer', 'bronze', 1, 2),
        ('airbus-explorer', 'silver', 2, 4),
        ('airbus-explorer', 'gold', 3, 6),
        ('airbus-explorer', 'platinum', 4, 10),
        ('route-collector', 'bronze', 1, 5),
        ('route-collector', 'silver', 2, 20),
        ('route-collector', 'gold', 3, 50),
        ('route-collector', 'platinum', 4, 100),
        ('international-routes', 'bronze', 1, 3),
        ('international-routes', 'silver', 2, 10),
        ('international-routes', 'gold', 3, 25),
        ('international-routes', 'platinum', 4, 50),
        ('challenge-pilot', 'bronze', 1, 3),
        ('challenge-pilot', 'silver', 2, 10),
        ('challenge-pilot', 'gold', 3, 25),
        ('challenge-pilot', 'platinum', 4, 50),
        ('heritage-keeper', 'bronze', 1, 3),
        ('heritage-keeper', 'silver', 2, 10),
        ('heritage-keeper', 'gold', 3, 25),
        ('heritage-keeper', 'platinum', 4, 50)
    ), actual AS (
      SELECT definition.slug, level.level_key, level.level_order, level.threshold_value
      FROM public.achievement_definitions AS definition
      INNER JOIN public.achievement_levels AS level
        ON level.achievement_definition_id = definition.id
      WHERE definition.slug = ANY (ARRAY[
        'frequent-flyer', 'time-aloft', 'distance-traveller',
        'country-collector', 'airport-explorer', 'continental-explorer',
        'city-hopper', 'fleet-collector', 'boeing-explorer',
        'airbus-explorer', 'route-collector', 'international-routes',
        'challenge-pilot', 'heritage-keeper'
      ])
    )
    SELECT 1 FROM (
      (SELECT * FROM expected EXCEPT SELECT * FROM actual)
      UNION ALL
      (SELECT * FROM actual EXCEPT SELECT * FROM expected)
    ) AS mismatch
  ) THEN
    RAISE EXCEPTION 'The 56 Achievement levels do not exactly match the approved thresholds';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.achievement_definitions AS definition
    INNER JOIN public.achievement_levels AS level
      ON level.achievement_definition_id = definition.id
    WHERE definition.slug = ANY (ARRAY[
      'frequent-flyer', 'time-aloft', 'distance-traveller',
      'country-collector', 'airport-explorer', 'continental-explorer',
      'city-hopper', 'fleet-collector', 'boeing-explorer',
      'airbus-explorer', 'route-collector', 'international-routes',
      'challenge-pilot', 'heritage-keeper'
    ])
      AND level.level_key = 'platinum'
      AND level.name_en NOT LIKE '% Purple'
  ) THEN
    RAISE EXCEPTION 'A database platinum key is not displayed as Purple';
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

  IF EXISTS (
    SELECT user_id, achievement_definition_id, achievement_level_id
    FROM public.user_achievements
    GROUP BY user_id, achievement_definition_id, achievement_level_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate user Achievement level rows exist';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.get_my_achievement_progress()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.refresh_my_achievements()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated is missing a required self-service Achievement function privilege';
  END IF;

  IF has_function_privilege('authenticated', 'public.achievement_metrics_for_user(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.refresh_achievements_for_user(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.get_my_achievement_progress()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.refresh_my_achievements()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Achievement function privileges expose an unsafe execution path';
  END IF;

  IF has_table_privilege('authenticated', 'public.user_achievements', 'INSERT')
     OR has_table_privilege('authenticated', 'public.user_achievements', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.user_achievements', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated has direct write privileges on user_achievements';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS function_record
    WHERE function_record.oid = ANY (ARRAY[
      'public.achievement_metrics_for_user(uuid)'::regprocedure,
      'public.get_my_achievement_progress()'::regprocedure,
      'public.refresh_achievements_for_user(uuid)'::regprocedure,
      'public.refresh_my_achievements()'::regprocedure
    ]::oid[])
      AND (
        NOT function_record.prosecdef
        OR pg_get_userbyid(function_record.proowner) <> 'postgres'
        OR NOT coalesce(function_record.proconfig, ARRAY[]::text[])
          @> ARRAY['search_path=pg_catalog, public']::text[]
      )
  ) THEN
    RAISE EXCEPTION 'Achievement SECURITY DEFINER owner/search_path configuration is unsafe';
  END IF;
END;
$postflight$;

SELECT
  definition.slug,
  definition.unlock_rule_type AS metric_type,
  level.level_key AS stored_level_key,
  level.name_en AS display_name,
  level.level_order,
  level.threshold_value,
  level.threshold_unit
FROM public.achievement_definitions AS definition
INNER JOIN public.achievement_levels AS level
  ON level.achievement_definition_id = definition.id
WHERE definition.slug = ANY (ARRAY[
  'frequent-flyer', 'time-aloft', 'distance-traveller',
  'country-collector', 'airport-explorer', 'continental-explorer',
  'city-hopper', 'fleet-collector', 'boeing-explorer',
  'airbus-explorer', 'route-collector', 'international-routes',
  'challenge-pilot', 'heritage-keeper'
])
ORDER BY definition.slug, level.level_order;

SELECT
  count(*) AS airport_rows,
  count(*) FILTER (WHERE continent_code IS NOT NULL) AS airports_with_continent,
  count(*) FILTER (WHERE continent_code IS NULL) AS airports_missing_continent,
  round(
    100.0 * count(*) FILTER (WHERE continent_code IS NOT NULL)
      / nullif(count(*), 0),
    2
  ) AS continent_coverage_percent
FROM public.airports
WHERE status <> 'source_missing';

SELECT
  function_record.oid::regprocedure::text AS function_name,
  pg_get_userbyid(function_record.proowner) AS owner,
  function_record.prosecdef AS security_definer,
  function_record.proconfig AS configuration,
  has_function_privilege('authenticated', function_record.oid, 'EXECUTE') AS authenticated_execute,
  has_function_privilege('anon', function_record.oid, 'EXECUTE') AS anon_execute
FROM pg_catalog.pg_proc AS function_record
WHERE function_record.oid = ANY (ARRAY[
  'public.achievement_metrics_for_user(uuid)'::regprocedure,
  'public.get_my_achievement_progress()'::regprocedure,
  'public.refresh_achievements_for_user(uuid)'::regprocedure,
  'public.refresh_my_achievements()'::regprocedure
]::oid[])
ORDER BY function_name;

SELECT
  'FLIGHT_ACHIEVEMENTS_POSTFLIGHT_OK' AS result,
  14 AS expected_series,
  56 AS expected_levels,
  (SELECT count(*) FROM public.achievement_definitions
    WHERE slug = ANY (ARRAY[
      'frequent-flyer', 'time-aloft', 'distance-traveller',
      'country-collector', 'airport-explorer', 'continental-explorer',
      'city-hopper', 'fleet-collector', 'boeing-explorer',
      'airbus-explorer', 'route-collector', 'international-routes',
      'challenge-pilot', 'heritage-keeper'
    ])) AS actual_series,
  (SELECT count(*)
    FROM public.achievement_levels AS level
    INNER JOIN public.achievement_definitions AS definition
      ON definition.id = level.achievement_definition_id
    WHERE definition.slug = ANY (ARRAY[
      'frequent-flyer', 'time-aloft', 'distance-traveller',
      'country-collector', 'airport-explorer', 'continental-explorer',
      'city-hopper', 'fleet-collector', 'boeing-explorer',
      'airbus-explorer', 'route-collector', 'international-routes',
      'challenge-pilot', 'heritage-keeper'
    ])) AS actual_levels;

COMMIT;
