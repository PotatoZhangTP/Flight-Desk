-- Enable the fourteen progressive Flight Desk Achievement series.
--
-- PostgreSQL 15+ / Supabase. This is an incremental migration: it preserves
-- existing definition IDs, level IDs and user achievement history.
--
-- Historical awards are intentionally NOT backfilled by iterating auth.users
-- inside this migration. The application reads the signed-in user's metrics,
-- detects missing eligible levels, and calls refresh_my_achievements() once for
-- that user. This keeps backfill bounded by auth.uid(), retryable and outside a
-- long-running schema transaction.

BEGIN;

DO $preflight$
DECLARE
  v_table text;
  v_column text;
BEGIN
  IF current_setting('server_version_num')::integer < 150000 THEN
    RAISE EXCEPTION 'Flight Achievements requires PostgreSQL 15 or newer';
  END IF;

  IF to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'Flight Achievements requires auth.uid()';
  END IF;

  IF to_regprocedure('public.is_site_admin()') IS NULL THEN
    RAISE EXCEPTION 'Flight Achievements requires public.is_site_admin()';
  END IF;

  FOREACH v_table IN ARRAY ARRAY[
    'achievement_categories', 'achievement_definitions', 'achievement_levels',
    'user_achievements', 'flights', 'airports',
    'daily_challenge_completions', 'memorial_participation'
  ] LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      RAISE EXCEPTION 'Flight Achievements requires public.%', v_table;
    END IF;
  END LOOP;

  FOREACH v_column IN ARRAY ARRAY[
    'id', 'user_id', 'status', 'flight_date', 'created_at',
    'actual_duration_minutes', 'scheduled_duration_minutes', 'duration_minutes',
    'aircraft_type', 'departure_airport', 'arrival_airport',
    'departure_airport_iata', 'arrival_airport_iata',
    'departure_airport_icao', 'arrival_airport_icao',
    'departure_country_code', 'arrival_country_code'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = 'public.flights'::regclass
        AND attribute.attname = v_column
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    ) THEN
      RAISE EXCEPTION 'public.flights is missing required column %', v_column;
    END IF;
  END LOOP;

  FOREACH v_column IN ARRAY ARRAY[
    'id', 'slug', 'name_en', 'name_zh', 'description_en', 'description_zh',
    'display_order', 'icon_key', 'is_active', 'created_at', 'updated_at'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = 'public.achievement_categories'::regclass
        AND attribute.attname = v_column AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    ) THEN
      RAISE EXCEPTION 'public.achievement_categories is missing required column %', v_column;
    END IF;
  END LOOP;

  FOREACH v_column IN ARRAY ARRAY[
    'id', 'slug', 'category_id', 'name_en', 'name_zh', 'description_en',
    'description_zh', 'badge_type', 'icon_key', 'unlock_rule_type',
    'unlock_rule_config', 'display_order', 'is_active', 'is_hidden',
    'created_at', 'updated_at'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = 'public.achievement_definitions'::regclass
        AND attribute.attname = v_column AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    ) THEN
      RAISE EXCEPTION 'public.achievement_definitions is missing required column %', v_column;
    END IF;
  END LOOP;

  FOREACH v_column IN ARRAY ARRAY[
    'id', 'achievement_definition_id', 'level_key', 'level_order',
    'threshold_value', 'threshold_unit', 'name_en', 'name_zh',
    'created_at', 'updated_at'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = 'public.achievement_levels'::regclass
        AND attribute.attname = v_column AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    ) THEN
      RAISE EXCEPTION 'public.achievement_levels is missing required column %', v_column;
    END IF;
  END LOOP;

  FOREACH v_column IN ARRAY ARRAY[
    'id', 'user_id', 'achievement_definition_id', 'achievement_level_id',
    'achieved_at', 'unlocked_at', 'created_at', 'updated_at'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = 'public.user_achievements'::regclass
        AND attribute.attname = v_column AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    ) THEN
      RAISE EXCEPTION 'public.user_achievements is missing required column %', v_column;
    END IF;
  END LOOP;

  FOREACH v_column IN ARRAY ARRAY[
    'id', 'status', 'icao_code', 'iata_code', 'ident', 'gps_code',
    'country_code', 'municipality', 'latitude', 'longitude',
    'scheduled_service'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = 'public.airports'::regclass
        AND attribute.attname = v_column
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    ) THEN
      RAISE EXCEPTION 'public.airports is missing required column %', v_column;
    END IF;
  END LOOP;

  FOREACH v_column IN ARRAY ARRAY['id', 'user_id', 'challenge_date', 'category', 'completed_at'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = 'public.daily_challenge_completions'::regclass
        AND attribute.attname = v_column AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    ) THEN
      RAISE EXCEPTION 'public.daily_challenge_completions is missing required column %', v_column;
    END IF;
  END LOOP;

  FOREACH v_column IN ARRAY ARRAY['id', 'event_id', 'user_id', 'flight_id', 'marked_at'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = 'public.memorial_participation'::regclass
        AND attribute.attname = v_column AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    ) THEN
      RAISE EXCEPTION 'public.memorial_participation is missing required column %', v_column;
    END IF;
  END LOOP;

  IF EXISTS (
    WITH expected(table_name, column_name, type_family) AS (
      VALUES
        ('flights', 'id', 'uuid'),
        ('flights', 'user_id', 'uuid'),
        ('flights', 'status', 'text'),
        ('flights', 'actual_duration_minutes', 'numeric'),
        ('flights', 'scheduled_duration_minutes', 'numeric'),
        ('flights', 'duration_minutes', 'numeric'),
        ('airports', 'id', 'numeric'),
        ('airports', 'status', 'text'),
        ('airports', 'latitude', 'numeric'),
        ('airports', 'longitude', 'numeric'),
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
    RAISE EXCEPTION 'A required Flight Achievements column has an incompatible data type; run the read-only preflight report for details';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.daily_challenge_completions
    GROUP BY user_id, challenge_date, category HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'daily_challenge_completions contains duplicate user/date/category records';
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
    RAISE EXCEPTION 'memorial_participation contains duplicate event/user records';
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
      AND flight.user_id <> participation.user_id
  ) THEN
    RAISE EXCEPTION 'memorial_participation contains a flight owned by a different user';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.achievement_definitions AS definition
    WHERE definition.slug = ANY (ARRAY[
      'frequent-flyer', 'time-aloft', 'distance-traveller',
      'country-collector', 'airport-explorer', 'continental-explorer',
      'city-hopper', 'fleet-collector', 'boeing-explorer',
      'airbus-explorer', 'route-collector', 'international-routes',
      'challenge-pilot', 'heritage-keeper'
    ])
      AND definition.badge_type <> 'progressive'
  ) THEN
    RAISE EXCEPTION 'A target Achievement slug already exists with a non-progressive badge type';
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
      AND level.level_order <> CASE level.level_key
        WHEN 'bronze' THEN 1
        WHEN 'silver' THEN 2
        WHEN 'gold' THEN 3
        WHEN 'platinum' THEN 4
      END
  ) THEN
    RAISE EXCEPTION 'An existing target Achievement level has an incompatible level_key/level_order mapping';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_achievements AS award
    LEFT JOIN public.achievement_levels AS level
      ON level.id = award.achievement_level_id
    WHERE award.achievement_level_id IS NULL
       OR level.id IS NULL
       OR level.achievement_definition_id <> award.achievement_definition_id
  ) THEN
    RAISE EXCEPTION 'Existing user_achievements contains an invalid definition/level relationship';
  END IF;
END;
$preflight$;

-- OurAirports supplies this per-airport value. Existing rows remain NULL until
-- they are refreshed through the reviewed airport import pipeline; NULL values
-- are deliberately not guessed from ICAO prefixes or country codes.
ALTER TABLE public.airports
  ADD COLUMN IF NOT EXISTS continent_code text;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.airports'::regclass
      AND conname = 'airports_continent_code_check'
  ) THEN
    ALTER TABLE public.airports
      ADD CONSTRAINT airports_continent_code_check
      CHECK (continent_code IS NULL OR continent_code IN ('AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA'));
  END IF;
END;
$constraints$;

COMMENT ON COLUMN public.airports.continent_code IS
  'OurAirports per-airport continent code. NULL means not yet mapped; never infer from an ICAO prefix.';

-- Free-text aircraft input is normalized through an explicit alias registry.
-- Unknown values can still count as one Fleet type after punctuation/case
-- normalization, but they are never guessed to be Boeing or Airbus.
CREATE TABLE IF NOT EXISTS public.achievement_aircraft_type_aliases (
  alias_key text PRIMARY KEY CHECK (alias_key ~ '^[A-Z0-9]+$'),
  canonical_type_key text NOT NULL CHECK (canonical_type_key ~ '^[A-Z0-9]+$'),
  manufacturer text CHECK (manufacturer IN ('boeing', 'airbus')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievement_aircraft_type_aliases OWNER TO postgres;
ALTER TABLE public.achievement_aircraft_type_aliases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.achievement_aircraft_type_aliases FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.achievement_aircraft_alias_key(raw_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
SET search_path = pg_catalog
AS $function$
  SELECT NULLIF(
    regexp_replace(
      replace(
        replace(
          replace(replace(upper(btrim(raw_type)), 'BOEING B', 'B'), 'BOEING', 'B'),
          'AIRBUS A', 'A'
        ),
        'AIRBUS', 'A'
      ),
      '[^A-Z0-9]+', '', 'g'
    ),
    ''
  );
$function$;

ALTER FUNCTION public.achievement_aircraft_alias_key(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.achievement_aircraft_alias_key(text) FROM PUBLIC, anon, authenticated;

WITH aliases(raw_type, canonical_type_key, manufacturer) AS (
  VALUES
    ('B712', 'B712', 'boeing'), ('Boeing 717-200', 'B712', 'boeing'),
    ('B733', 'B733', 'boeing'), ('Boeing 737-300', 'B733', 'boeing'),
    ('B734', 'B734', 'boeing'), ('Boeing 737-400', 'B734', 'boeing'),
    ('B735', 'B735', 'boeing'), ('Boeing 737-500', 'B735', 'boeing'),
    ('B732', 'B732', 'boeing'), ('Boeing 737-200', 'B732', 'boeing'),
    ('B736', 'B736', 'boeing'), ('Boeing 737-600', 'B736', 'boeing'),
    ('B737', 'B737', 'boeing'), ('Boeing 737-700', 'B737', 'boeing'),
    ('B738', 'B738', 'boeing'), ('Boeing 737-800', 'B738', 'boeing'),
    ('B739', 'B739', 'boeing'), ('Boeing 737-900', 'B739', 'boeing'),
    ('B37M', 'B37M', 'boeing'), ('Boeing 737 MAX 7', 'B37M', 'boeing'),
    ('B38M', 'B38M', 'boeing'), ('Boeing 737 MAX 8', 'B38M', 'boeing'),
    ('B39M', 'B39M', 'boeing'), ('Boeing 737 MAX 9', 'B39M', 'boeing'),
    ('B3XM', 'B3XM', 'boeing'), ('Boeing 737 MAX 10', 'B3XM', 'boeing'),
    ('B741', 'B741', 'boeing'), ('Boeing 747-100', 'B741', 'boeing'),
    ('B742', 'B742', 'boeing'), ('Boeing 747-200', 'B742', 'boeing'),
    ('B743', 'B743', 'boeing'), ('Boeing 747-300', 'B743', 'boeing'),
    ('B744', 'B744', 'boeing'), ('Boeing 747-400', 'B744', 'boeing'),
    ('B748', 'B748', 'boeing'), ('Boeing 747-8', 'B748', 'boeing'),
    ('B752', 'B752', 'boeing'), ('Boeing 757-200', 'B752', 'boeing'),
    ('B753', 'B753', 'boeing'), ('Boeing 757-300', 'B753', 'boeing'),
    ('B762', 'B762', 'boeing'), ('Boeing 767-200', 'B762', 'boeing'),
    ('B763', 'B763', 'boeing'), ('Boeing 767-300', 'B763', 'boeing'),
    ('B764', 'B764', 'boeing'), ('Boeing 767-400', 'B764', 'boeing'),
    ('B772', 'B772', 'boeing'), ('Boeing 777-200', 'B772', 'boeing'),
    ('B77L', 'B77L', 'boeing'), ('Boeing 777-200LR', 'B77L', 'boeing'),
    ('B773', 'B773', 'boeing'), ('Boeing 777-300', 'B773', 'boeing'),
    ('B77W', 'B77W', 'boeing'), ('Boeing 777-300ER', 'B77W', 'boeing'),
    ('B778', 'B778', 'boeing'), ('Boeing 777-8', 'B778', 'boeing'),
    ('B779', 'B779', 'boeing'), ('Boeing 777-9', 'B779', 'boeing'),
    ('B788', 'B788', 'boeing'), ('Boeing 787-8', 'B788', 'boeing'),
    ('B789', 'B789', 'boeing'), ('Boeing 787-9', 'B789', 'boeing'),
    ('B78X', 'B78X', 'boeing'), ('Boeing 787-10', 'B78X', 'boeing'),
    ('BCS1', 'BCS1', 'airbus'), ('Airbus A220-100', 'BCS1', 'airbus'),
    ('BCS3', 'BCS3', 'airbus'), ('Airbus A220-300', 'BCS3', 'airbus'),
    ('A306', 'A306', 'airbus'), ('Airbus A300-600', 'A306', 'airbus'),
    ('A310', 'A310', 'airbus'), ('Airbus A310', 'A310', 'airbus'),
    ('A318', 'A318', 'airbus'), ('Airbus A318', 'A318', 'airbus'), ('Airbus A318-100', 'A318', 'airbus'),
    ('A319', 'A319', 'airbus'), ('Airbus A319', 'A319', 'airbus'), ('Airbus A319-100', 'A319', 'airbus'),
    ('A19N', 'A19N', 'airbus'), ('Airbus A319neo', 'A19N', 'airbus'),
    ('A320', 'A320', 'airbus'), ('Airbus A320', 'A320', 'airbus'), ('Airbus A320-200', 'A320', 'airbus'),
    ('A20N', 'A20N', 'airbus'), ('Airbus A320neo', 'A20N', 'airbus'),
    ('A321', 'A321', 'airbus'), ('Airbus A321', 'A321', 'airbus'), ('Airbus A321-200', 'A321', 'airbus'),
    ('A21N', 'A21N', 'airbus'), ('Airbus A321neo', 'A21N', 'airbus'),
    ('A332', 'A332', 'airbus'), ('Airbus A330-200', 'A332', 'airbus'),
    ('A333', 'A333', 'airbus'), ('Airbus A330-300', 'A333', 'airbus'),
    ('A338', 'A338', 'airbus'), ('Airbus A330-800', 'A338', 'airbus'),
    ('A339', 'A339', 'airbus'), ('Airbus A330-900', 'A339', 'airbus'),
    ('A342', 'A342', 'airbus'), ('Airbus A340-200', 'A342', 'airbus'),
    ('A343', 'A343', 'airbus'), ('Airbus A340-300', 'A343', 'airbus'),
    ('A345', 'A345', 'airbus'), ('Airbus A340-500', 'A345', 'airbus'),
    ('A346', 'A346', 'airbus'), ('Airbus A340-600', 'A346', 'airbus'),
    ('A359', 'A359', 'airbus'), ('Airbus A350-900', 'A359', 'airbus'),
    ('A35K', 'A35K', 'airbus'), ('Airbus A350-1000', 'A35K', 'airbus'),
    ('A388', 'A388', 'airbus'), ('Airbus A380-800', 'A388', 'airbus')
), normalized AS (
  SELECT DISTINCT public.achievement_aircraft_alias_key(raw_type) AS alias_key,
    canonical_type_key, manufacturer
  FROM aliases
)
INSERT INTO public.achievement_aircraft_type_aliases (
  alias_key, canonical_type_key, manufacturer
)
SELECT alias_key, canonical_type_key, manufacturer
FROM normalized
WHERE alias_key IS NOT NULL
ON CONFLICT (alias_key) DO UPDATE SET
  canonical_type_key = EXCLUDED.canonical_type_key,
  manufacturer = EXCLUDED.manufacturer,
  updated_at = now();

WITH category_seed(slug, name_en, name_zh, description_en, description_zh, display_order, icon_key) AS (
  VALUES
    ('flight_milestones', 'Flight Milestones', '飞行里程碑', 'Celebrate the completed flights that shape your journey.', '记录每一次已完成飞行所汇聚成的旅程。', 1, 'milestone'),
    ('world_explorer', 'World Explorer', '世界探索者', 'Discover achievements from the places you reach.', '探索你抵达的世界各地。', 2, 'globe'),
    ('aircraft_collector', 'Aircraft Collector', '飞机收藏家', 'Build a collection of aircraft experiences.', '收集不同机型的飞行体验。', 3, 'aircraft'),
    ('route_explorer', 'Route Explorer', '航线探索者', 'Celebrate the routes you have explored.', '记录你探索过的航线。', 4, 'route'),
    ('flight_challenges', 'Flight Challenges', '飞行挑战', 'Complete Flight Desk challenges.', '完成 Flight Desk 飞行挑战。', 5, 'challenge'),
    ('aviation_heritage', 'Aviation Heritage', '航空传承', 'Honour meaningful moments in aviation history.', '纪念航空历史中的重要时刻。', 6, 'heritage'),
    ('flight_experiences', 'Flight Experiences', '飞行体验', 'Unlock unique moments from your journeys.', '解锁旅程中的独特飞行体验。', 7, 'experience')
)
INSERT INTO public.achievement_categories (
  slug, name_en, name_zh, description_en, description_zh, display_order, icon_key
)
SELECT slug, name_en, name_zh, description_en, description_zh, display_order, icon_key
FROM category_seed
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description_en = EXCLUDED.description_en,
  description_zh = EXCLUDED.description_zh,
  display_order = EXCLUDED.display_order,
  icon_key = EXCLUDED.icon_key,
  updated_at = now();

WITH definition_seed(
  slug, category_slug, name_en, name_zh, description_en, description_zh,
  icon_key, metric_type, threshold_unit, display_order
) AS (
  VALUES
    ('frequent-flyer', 'flight_milestones', 'Frequent Flyer', '常旅客', 'Complete flights recorded in Flight Desk.', '完成记录在 Flight Desk 中的航班。', 'frequent-flyer', 'completed_flight_count', 'flights', 1),
    ('time-aloft', 'flight_milestones', 'Time Aloft', '空中时光', 'Build total completed-flight time.', '累计已完成航班的飞行时间。', 'time-aloft', 'total_flight_hours', 'hours', 2),
    ('distance-traveller', 'flight_milestones', 'Distance Traveller', '长途旅行者', 'Build total completed-flight distance.', '累计已完成航班的飞行距离。', 'distance-traveller', 'total_distance_km', 'km', 3),
    ('country-collector', 'world_explorer', 'Country Collector', '国家收藏家', 'Visit distinct countries through completed flights.', '通过已完成航班访问不同国家。', 'country-collector', 'unique_countries', 'countries', 1),
    ('airport-explorer', 'world_explorer', 'Airport Explorer', '机场探索者', 'Visit distinct airports through completed flights.', '通过已完成航班访问不同机场。', 'airport-explorer', 'unique_airports', 'airports', 2),
    ('continental-explorer', 'world_explorer', 'Continental Explorer', '大洲探索者', 'Visit distinct continents through completed flights.', '通过已完成航班访问不同大洲。', 'continental-explorer', 'unique_continents', 'continents', 3),
    ('city-hopper', 'world_explorer', 'City Hopper', '城市穿梭者', 'Visit distinct cities through completed flights.', '通过已完成航班访问不同城市。', 'city-hopper', 'unique_cities', 'cities', 4),
    ('fleet-collector', 'aircraft_collector', 'Fleet Collector', '机队收藏家', 'Fly distinct normalized aircraft types.', '使用不同的标准化机型完成飞行。', 'fleet-collector', 'unique_aircraft_types', 'aircraft types', 1),
    ('boeing-explorer', 'aircraft_collector', 'Boeing Explorer', '波音探索者', 'Fly distinct mapped Boeing aircraft types.', '使用不同的已映射波音机型完成飞行。', 'boeing-explorer', 'unique_boeing_types', 'aircraft types', 2),
    ('airbus-explorer', 'aircraft_collector', 'Airbus Explorer', '空客探索者', 'Fly distinct mapped Airbus aircraft types.', '使用不同的已映射空客机型完成飞行。', 'airbus-explorer', 'unique_airbus_types', 'aircraft types', 3),
    ('route-collector', 'route_explorer', 'Route Collector', '航线收藏家', 'Complete distinct undirected airport routes.', '完成不同的不区分方向机场航线。', 'route-collector', 'unique_routes', 'routes', 1),
    ('international-routes', 'route_explorer', 'International Routes', '国际航线', 'Complete distinct undirected routes between countries.', '完成不同的不区分方向跨国航线。', 'international-routes', 'unique_international_routes', 'routes', 2),
    ('challenge-pilot', 'flight_challenges', 'Challenge Pilot', '挑战飞行员', 'Complete Daily Challenges.', '完成每日飞行挑战。', 'challenge-pilot', 'completed_daily_challenges', 'challenges', 1),
    ('heritage-keeper', 'aviation_heritage', 'Heritage Keeper', '航空遗产守护者', 'Complete Memorial Flights.', '完成纪念飞行。', 'heritage-keeper', 'completed_memorial_flights', 'memorial flights', 1)
), resolved AS (
  SELECT seed.*, category.id AS category_id
  FROM definition_seed AS seed
  INNER JOIN public.achievement_categories AS category
    ON category.slug = seed.category_slug
)
INSERT INTO public.achievement_definitions (
  slug, category_id, name_en, name_zh, description_en, description_zh,
  badge_type, icon_key, unlock_rule_type, unlock_rule_config,
  display_order, is_active, is_hidden
)
SELECT slug, category_id, name_en, name_zh, description_en, description_zh,
  'progressive', icon_key, metric_type,
  jsonb_build_object(
    'implementation', 'available_for_evaluation',
    'source', CASE
      WHEN metric_type = 'completed_daily_challenges' THEN 'public.daily_challenge_completions'
      WHEN metric_type = 'completed_memorial_flights' THEN 'public.memorial_participation+public.flights'
      ELSE 'public.flights+public.airports'
    END,
    'threshold_unit', threshold_unit
  ),
  display_order, true, false
FROM resolved
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description_en = EXCLUDED.description_en,
  description_zh = EXCLUDED.description_zh,
  badge_type = EXCLUDED.badge_type,
  icon_key = EXCLUDED.icon_key,
  unlock_rule_type = EXCLUDED.unlock_rule_type,
  unlock_rule_config = EXCLUDED.unlock_rule_config,
  display_order = EXCLUDED.display_order,
  updated_at = now();

WITH threshold_seed(slug, bronze, silver, gold, purple, threshold_unit) AS (
  VALUES
    ('frequent-flyer', 10::numeric, 50::numeric, 100::numeric, 500::numeric, 'flights'),
    ('time-aloft', 10, 100, 500, 1000, 'hours'),
    ('distance-traveller', 10000, 50000, 250000, 1000000, 'km'),
    ('country-collector', 5, 10, 25, 50, 'countries'),
    ('airport-explorer', 10, 25, 50, 100, 'airports'),
    ('continental-explorer', 2, 3, 4, 6, 'continents'),
    ('city-hopper', 10, 25, 50, 100, 'cities'),
    ('fleet-collector', 3, 5, 10, 25, 'aircraft types'),
    ('boeing-explorer', 2, 4, 6, 10, 'aircraft types'),
    ('airbus-explorer', 2, 4, 6, 10, 'aircraft types'),
    ('route-collector', 5, 20, 50, 100, 'routes'),
    ('international-routes', 3, 10, 25, 50, 'routes'),
    ('challenge-pilot', 3, 10, 25, 50, 'challenges'),
    ('heritage-keeper', 3, 10, 25, 50, 'memorial flights')
), tiers(level_key, level_order, tier_en, tier_zh) AS (
  VALUES
    ('bronze', 1::smallint, 'Bronze', '铜'),
    ('silver', 2::smallint, 'Silver', '银'),
    ('gold', 3::smallint, 'Gold', '金'),
    ('platinum', 4::smallint, 'Purple', '紫')
), expanded AS (
  SELECT definition.id AS achievement_definition_id,
    definition.name_en, definition.name_zh,
    tier.level_key, tier.level_order, tier.tier_en, tier.tier_zh,
    CASE tier.level_order
      WHEN 1 THEN threshold.bronze
      WHEN 2 THEN threshold.silver
      WHEN 3 THEN threshold.gold
      WHEN 4 THEN threshold.purple
    END AS threshold_value,
    threshold.threshold_unit
  FROM threshold_seed AS threshold
  INNER JOIN public.achievement_definitions AS definition
    ON definition.slug = threshold.slug
  CROSS JOIN tiers AS tier
)
INSERT INTO public.achievement_levels (
  achievement_definition_id, level_key, level_order, threshold_value,
  threshold_unit, name_en, name_zh
)
SELECT achievement_definition_id, level_key, level_order, threshold_value,
  threshold_unit, name_en || ' ' || tier_en, name_zh || '・' || tier_zh
FROM expanded
ON CONFLICT (achievement_definition_id, level_key) DO UPDATE SET
  level_order = EXCLUDED.level_order,
  threshold_value = EXCLUDED.threshold_value,
  threshold_unit = EXCLUDED.threshold_unit,
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  updated_at = now();

CREATE INDEX IF NOT EXISTS daily_challenge_completions_user_date_idx
  ON public.daily_challenge_completions (user_id, challenge_date, category);
CREATE INDEX IF NOT EXISTS achievement_aircraft_aliases_canonical_idx
  ON public.achievement_aircraft_type_aliases (canonical_type_key, manufacturer);

-- Resolve and aggregate every metric from one completed-flight scan. The
-- function is intentionally private because it accepts an arbitrary user ID.
CREATE OR REPLACE FUNCTION public.achievement_metrics_for_user(p_user_id uuid)
RETURNS TABLE(metric_type text, metric_value numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  WITH completed AS (
    SELECT
      flight.id,
      CASE
        WHEN flight.actual_duration_minutes >= 0 THEN flight.actual_duration_minutes
        WHEN flight.scheduled_duration_minutes >= 0 THEN flight.scheduled_duration_minutes
        WHEN flight.duration_minutes >= 0 THEN flight.duration_minutes
        ELSE NULL
      END AS effective_duration_minutes,
      flight.aircraft_type,
      NULLIF(upper(btrim(flight.departure_airport_icao)), '') AS departure_icao,
      NULLIF(upper(btrim(flight.departure_airport_iata)), '') AS departure_iata,
      NULLIF(upper(btrim(flight.departure_airport)), '') AS departure_fallback,
      NULLIF(upper(btrim(flight.arrival_airport_icao)), '') AS arrival_icao,
      NULLIF(upper(btrim(flight.arrival_airport_iata)), '') AS arrival_iata,
      NULLIF(upper(btrim(flight.arrival_airport)), '') AS arrival_fallback,
      NULLIF(upper(btrim(flight.departure_country_code)), '') AS departure_country_snapshot,
      NULLIF(upper(btrim(flight.arrival_country_code)), '') AS arrival_country_snapshot
    FROM public.flights AS flight
    WHERE flight.user_id = p_user_id
      AND flight.status = 'completed'
  ), resolved AS (
    SELECT completed.*,
      departure.id AS departure_airport_id,
      departure.country_code AS departure_country,
      departure.continent_code AS departure_continent,
      departure.municipality AS departure_city,
      departure.latitude AS departure_latitude,
      departure.longitude AS departure_longitude,
      arrival.id AS arrival_airport_id,
      arrival.country_code AS arrival_country,
      arrival.continent_code AS arrival_continent,
      arrival.municipality AS arrival_city,
      arrival.latitude AS arrival_latitude,
      arrival.longitude AS arrival_longitude
    FROM completed
    LEFT JOIN LATERAL (
      SELECT airport.id, airport.country_code, airport.continent_code,
        airport.municipality, airport.latitude, airport.longitude
      FROM public.airports AS airport
      WHERE airport.status <> 'source_missing'
        AND (
          upper(airport.icao_code) IN (completed.departure_icao, completed.departure_iata, completed.departure_fallback)
          OR upper(airport.iata_code) IN (completed.departure_icao, completed.departure_iata, completed.departure_fallback)
          OR upper(airport.ident) IN (completed.departure_icao, completed.departure_iata, completed.departure_fallback)
          OR upper(airport.gps_code) IN (completed.departure_icao, completed.departure_iata, completed.departure_fallback)
        )
      ORDER BY
        CASE
          WHEN upper(airport.icao_code) = completed.departure_icao THEN 0
          WHEN upper(airport.iata_code) = completed.departure_iata THEN 1
          WHEN upper(airport.ident) = completed.departure_fallback THEN 2
          ELSE 3
        END,
        (airport.status = 'listed') DESC,
        airport.scheduled_service DESC,
        airport.id
      LIMIT 1
    ) AS departure ON true
    LEFT JOIN LATERAL (
      SELECT airport.id, airport.country_code, airport.continent_code,
        airport.municipality, airport.latitude, airport.longitude
      FROM public.airports AS airport
      WHERE airport.status <> 'source_missing'
        AND (
          upper(airport.icao_code) IN (completed.arrival_icao, completed.arrival_iata, completed.arrival_fallback)
          OR upper(airport.iata_code) IN (completed.arrival_icao, completed.arrival_iata, completed.arrival_fallback)
          OR upper(airport.ident) IN (completed.arrival_icao, completed.arrival_iata, completed.arrival_fallback)
          OR upper(airport.gps_code) IN (completed.arrival_icao, completed.arrival_iata, completed.arrival_fallback)
        )
      ORDER BY
        CASE
          WHEN upper(airport.icao_code) = completed.arrival_icao THEN 0
          WHEN upper(airport.iata_code) = completed.arrival_iata THEN 1
          WHEN upper(airport.ident) = completed.arrival_fallback THEN 2
          ELSE 3
        END,
        (airport.status = 'listed') DESC,
        airport.scheduled_service DESC,
        airport.id
      LIMIT 1
    ) AS arrival ON true
  ), flight_totals AS (
    SELECT
      count(*)::numeric AS completed_flight_count,
      coalesce(sum(effective_duration_minutes), 0)::numeric / 60.0 AS total_flight_hours,
      coalesce(sum(
        CASE
          WHEN departure_latitude IS NOT NULL AND departure_longitude IS NOT NULL
            AND arrival_latitude IS NOT NULL AND arrival_longitude IS NOT NULL
          THEN 6371.0088 * acos(least(1.0, greatest(-1.0,
            cos(radians(departure_latitude)) * cos(radians(arrival_latitude))
              * cos(radians(arrival_longitude) - radians(departure_longitude))
            + sin(radians(departure_latitude)) * sin(radians(arrival_latitude))
          )))
          ELSE 0
        END
      ), 0)::numeric AS total_distance_km
    FROM resolved
  ), visited_airports AS (
    SELECT departure_airport_id AS airport_id,
      coalesce(departure_country, departure_country_snapshot) AS country_code,
      departure_continent AS continent_code,
      departure_city AS city
    FROM resolved
    UNION ALL
    SELECT arrival_airport_id,
      coalesce(arrival_country, arrival_country_snapshot),
      arrival_continent,
      arrival_city
    FROM resolved
  ), geography AS (
    SELECT
      (count(DISTINCT country_code) FILTER (WHERE country_code IS NOT NULL))::numeric AS unique_countries,
      (count(DISTINCT airport_id) FILTER (WHERE airport_id IS NOT NULL))::numeric AS unique_airports,
      (count(DISTINCT continent_code) FILTER (WHERE continent_code IS NOT NULL))::numeric AS unique_continents,
      (count(DISTINCT (country_code, lower(btrim(city))))
        FILTER (WHERE country_code IS NOT NULL AND NULLIF(btrim(city), '') IS NOT NULL))::numeric AS unique_cities
    FROM visited_airports
  ), routes AS (
    SELECT
      (count(DISTINCT (least(departure_airport_id, arrival_airport_id), greatest(departure_airport_id, arrival_airport_id)))
        FILTER (WHERE departure_airport_id IS NOT NULL AND arrival_airport_id IS NOT NULL
          AND departure_airport_id <> arrival_airport_id))::numeric AS unique_routes,
      (count(DISTINCT (least(departure_airport_id, arrival_airport_id), greatest(departure_airport_id, arrival_airport_id)))
        FILTER (WHERE departure_airport_id IS NOT NULL AND arrival_airport_id IS NOT NULL
          AND departure_airport_id <> arrival_airport_id
          AND coalesce(departure_country, departure_country_snapshot) IS NOT NULL
          AND coalesce(arrival_country, arrival_country_snapshot) IS NOT NULL
          AND coalesce(departure_country, departure_country_snapshot)
            <> coalesce(arrival_country, arrival_country_snapshot)))::numeric AS unique_international_routes
    FROM resolved
  ), normalized_aircraft AS (
    SELECT DISTINCT
      coalesce(alias.canonical_type_key, public.achievement_aircraft_alias_key(resolved.aircraft_type)) AS canonical_type_key,
      alias.manufacturer
    FROM resolved
    LEFT JOIN public.achievement_aircraft_type_aliases AS alias
      ON alias.alias_key = public.achievement_aircraft_alias_key(resolved.aircraft_type)
    WHERE public.achievement_aircraft_alias_key(resolved.aircraft_type) IS NOT NULL
  ), aircraft AS (
    SELECT
      count(DISTINCT canonical_type_key)::numeric AS unique_aircraft_types,
      (count(DISTINCT canonical_type_key) FILTER (WHERE manufacturer = 'boeing'))::numeric AS unique_boeing_types,
      (count(DISTINCT canonical_type_key) FILTER (WHERE manufacturer = 'airbus'))::numeric AS unique_airbus_types
    FROM normalized_aircraft
  ), challenges AS (
    SELECT count(DISTINCT (completion.challenge_date, completion.category))::numeric AS completed_daily_challenges
    FROM public.daily_challenge_completions AS completion
    WHERE completion.user_id = p_user_id
  ), memorials AS (
    -- The existing schema enforces UNIQUE(event_id, user_id), so Heritage
    -- Keeper currently counts completed participation in distinct memorial
    -- events. A recurring event cannot count again in a later year until the
    -- product has a stable occurrence/edition identifier.
    SELECT count(DISTINCT participation.id)::numeric AS completed_memorial_flights
    FROM public.memorial_participation AS participation
    LEFT JOIN public.flights AS flight
      ON flight.id = participation.flight_id
      AND flight.user_id = participation.user_id
    WHERE participation.user_id = p_user_id
      AND (participation.flight_id IS NULL OR flight.status = 'completed')
  ), values_to_return(metric_type, metric_value) AS (
    SELECT 'completed_flight_count', completed_flight_count FROM flight_totals
    UNION ALL SELECT 'total_flight_hours', total_flight_hours FROM flight_totals
    UNION ALL SELECT 'total_distance_km', total_distance_km FROM flight_totals
    UNION ALL SELECT 'unique_countries', unique_countries FROM geography
    UNION ALL SELECT 'unique_airports', unique_airports FROM geography
    UNION ALL SELECT 'unique_continents', unique_continents FROM geography
    UNION ALL SELECT 'unique_cities', unique_cities FROM geography
    UNION ALL SELECT 'unique_aircraft_types', unique_aircraft_types FROM aircraft
    UNION ALL SELECT 'unique_boeing_types', unique_boeing_types FROM aircraft
    UNION ALL SELECT 'unique_airbus_types', unique_airbus_types FROM aircraft
    UNION ALL SELECT 'unique_routes', unique_routes FROM routes
    UNION ALL SELECT 'unique_international_routes', unique_international_routes FROM routes
    UNION ALL SELECT 'completed_daily_challenges', completed_daily_challenges FROM challenges
    UNION ALL SELECT 'completed_memorial_flights', completed_memorial_flights FROM memorials
  )
  SELECT values_to_return.metric_type, coalesce(values_to_return.metric_value, 0)
  FROM values_to_return;
$function$;

ALTER FUNCTION public.achievement_metrics_for_user(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.achievement_metrics_for_user(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_achievement_progress()
RETURNS TABLE(metric_type text, metric_value numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to read achievement progress'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT metric.metric_type, metric.metric_value
  FROM public.achievement_metrics_for_user(v_user_id) AS metric;
END;
$function$;

ALTER FUNCTION public.get_my_achievement_progress() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_achievement_progress() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_achievement_progress() TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_achievements_for_user(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  INSERT INTO public.user_achievements (
    user_id, achievement_definition_id, achievement_level_id
  )
  SELECT p_user_id, definition.id, level.id
  FROM public.achievement_metrics_for_user(p_user_id) AS metric
  INNER JOIN public.achievement_definitions AS definition
    ON definition.unlock_rule_type = metric.metric_type
  INNER JOIN public.achievement_categories AS category
    ON category.id = definition.category_id
  INNER JOIN public.achievement_levels AS level
    ON level.achievement_definition_id = definition.id
    AND level.threshold_value <= metric.metric_value
  WHERE definition.slug = ANY (ARRAY[
      'frequent-flyer', 'time-aloft', 'distance-traveller',
      'country-collector', 'airport-explorer', 'continental-explorer',
      'city-hopper', 'fleet-collector', 'boeing-explorer',
      'airbus-explorer', 'route-collector', 'international-routes',
      'challenge-pilot', 'heritage-keeper'
    ])
    AND definition.badge_type = 'progressive'
    AND definition.is_active
    AND NOT definition.is_hidden
    AND category.is_active
  ON CONFLICT (user_id, achievement_definition_id, achievement_level_id) DO NOTHING;
$function$;

ALTER FUNCTION public.refresh_achievements_for_user(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.refresh_achievements_for_user(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_my_achievements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to refresh achievements'
      USING ERRCODE = '42501';
  END IF;

  PERFORM public.refresh_achievements_for_user(v_user_id);
END;
$function$;

ALTER FUNCTION public.refresh_my_achievements() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.refresh_my_achievements() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_my_achievements() TO authenticated;

-- Validate that all fourteen progressive series now have exactly four ordered
-- tiers and that every level remains attached to its own definition.
DO $postflight$
BEGIN
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
    RAISE EXCEPTION 'Expected fourteen Achievement definitions after migration';
  END IF;

  IF EXISTS (
    SELECT definition.id
    FROM public.achievement_definitions AS definition
    LEFT JOIN public.achievement_levels AS level
      ON level.achievement_definition_id = definition.id
    WHERE definition.slug = ANY (ARRAY[
      'frequent-flyer', 'time-aloft', 'distance-traveller',
      'country-collector', 'airport-explorer', 'continental-explorer',
      'city-hopper', 'fleet-collector', 'boeing-explorer',
      'airbus-explorer', 'route-collector', 'international-routes',
      'challenge-pilot', 'heritage-keeper'
    ])
    GROUP BY definition.id
    HAVING count(level.id) <> 4
      OR min(level.level_order) <> 1
      OR max(level.level_order) <> 4
  ) THEN
    RAISE EXCEPTION 'Each progressive Achievement must have exactly four ordered levels';
  END IF;
END;
$postflight$;

COMMIT;
