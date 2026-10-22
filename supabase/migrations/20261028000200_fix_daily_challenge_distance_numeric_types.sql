BEGIN;

-- Fix the airport-catalog distance calculation used by the current daily
-- challenge generator. PostgreSQL's trigonometric functions return
-- double precision, while unsuffixed numeric literals are numeric. Explicit
-- casts keep GREATEST's arguments type-compatible without changing the
-- distance calculation or its rounding behavior.
CREATE OR REPLACE FUNCTION public.ensure_daily_challenges(p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  category_name text;
  selected_route public.challenge_routes;
  generated_candidate record;
  today_utc date := (pg_catalog.timezone('utc', pg_catalog.now()))::date;
BEGIN
  IF p_date IS DISTINCT FROM today_utc THEN
    RAISE EXCEPTION 'Daily challenges may only be generated for the current UTC date'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('flight-desk:daily-challenges:' || p_date::text, 0)
  );

  FOREACH category_name IN ARRAY ARRAY['quick', 'regional', 'medium', 'long']
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.daily_challenges
      WHERE challenge_date = p_date AND category = category_name
    ) THEN
      CONTINUE;
    END IF;

    selected_route := NULL;
    generated_candidate := NULL;

    -- Choose from the imported airport reference catalog when available. A
    -- stable date/category hash makes the candidate order repeatable across
    -- all application instances. The daily_challenges row is the source of
    -- truth once generated, not a per-request random choice.
    IF pg_catalog.to_regclass('public.airports') IS NOT NULL THEN
      EXECUTE $query$
        WITH airport_pool AS (
          SELECT airport.id, airport.iata_code, airport.icao_code, airport.name,
                 airport.latitude, airport.longitude
          FROM public.airports AS airport
          WHERE airport.status = 'listed'
            AND airport.scheduled_service = true
            AND airport.airport_type IN ('medium_airport', 'large_airport')
            AND airport.iata_code ~ '^[A-Z]{3}$'
            AND airport.icao_code ~ '^[A-Z]{4}$'
            AND airport.latitude IS NOT NULL
            AND airport.longitude IS NOT NULL
          ORDER BY pg_catalog.md5($1::text || ':' || $2 || ':' || airport.id::text)
          LIMIT 180
        ), pair_distances AS (
          SELECT departure.iata_code AS departure_iata,
                 departure.icao_code AS departure_icao,
                 departure.name AS departure_name,
                 arrival.iata_code AS arrival_iata,
                 arrival.icao_code AS arrival_icao,
                 arrival.name AS arrival_name,
                 pg_catalog.round(
                   6371.0088 * pg_catalog.acos(
                     GREATEST(1.0::double precision, GREATEST(-1.0::double precision,
                       pg_catalog.sin(pg_catalog.radians(departure.latitude)) * pg_catalog.sin(pg_catalog.radians(arrival.latitude))
                       + pg_catalog.cos(pg_catalog.radians(departure.latitude)) * pg_catalog.cos(pg_catalog.radians(arrival.latitude))
                       * pg_catalog.cos(pg_catalog.radians(arrival.longitude - departure.longitude))
                     ))
                   )
                 )::integer AS distance_km
          FROM airport_pool AS departure
          CROSS JOIN airport_pool AS arrival
          WHERE departure.id <> arrival.id
        ), eligible AS (
          SELECT pair.*,
                 pg_catalog.greatest(45, pg_catalog.ceil(pair.distance_km / 780.0 * 60 + 35)::integer) AS estimated_minutes,
                 CASE
                   WHEN pair.distance_km > 7000 THEN 'A350'
                   WHEN pair.distance_km > 3000 THEN 'B787'
                   WHEN pair.distance_km > 800 THEN 'A321'
                   ELSE 'A320'
                 END AS suggested_aircraft
          FROM pair_distances AS pair
          WHERE public.daily_challenge_category_for_distance(pair.distance_km) = $2
            -- A→B and B→A are the same exploration pair for rotation rules.
            AND NOT EXISTS (
              SELECT 1
              FROM public.daily_challenges AS previous
              WHERE previous.challenge_date BETWEEN $1 - 30 AND $1 - 1
                AND pg_catalog.least(previous.departure_icao, previous.arrival_icao)
                    = pg_catalog.least(pair.departure_icao, pair.arrival_icao)
                AND pg_catalog.greatest(previous.departure_icao, previous.arrival_icao)
                    = pg_catalog.greatest(pair.departure_icao, pair.arrival_icao)
            )
            AND NOT EXISTS (
              SELECT 1
              FROM public.daily_challenges AS today
              WHERE today.challenge_date = $1
                AND pg_catalog.least(today.departure_icao, today.arrival_icao)
                    = pg_catalog.least(pair.departure_icao, pair.arrival_icao)
                AND pg_catalog.greatest(today.departure_icao, today.arrival_icao)
                    = pg_catalog.greatest(pair.departure_icao, pair.arrival_icao)
            )
        )
        SELECT eligible.*
        FROM eligible
        ORDER BY
          CASE WHEN EXISTS (
            SELECT 1
            FROM public.daily_challenges AS recent
            WHERE recent.challenge_date BETWEEN $1 - 3 AND $1 - 1
              AND (
                recent.departure_icao IN (eligible.departure_icao, eligible.arrival_icao)
                OR recent.arrival_icao IN (eligible.departure_icao, eligible.arrival_icao)
              )
          ) THEN 1 ELSE 0 END,
          pg_catalog.md5($2 || ':' || $1::text || ':' || eligible.departure_icao || ':' || eligible.arrival_icao)
        LIMIT 1
      $query$
      INTO generated_candidate
      USING p_date, category_name;

      IF generated_candidate.departure_icao IS NOT NULL THEN
        INSERT INTO public.challenge_routes (
          category, departure_iata, departure_icao, arrival_iata, arrival_icao,
          departure_name, arrival_name, estimated_minutes, distance_km,
          suggested_aircraft, about, source_note, enabled
        ) VALUES (
          category_name, generated_candidate.departure_iata, generated_candidate.departure_icao,
          generated_candidate.arrival_iata, generated_candidate.arrival_icao,
          generated_candidate.departure_name, generated_candidate.arrival_name,
          generated_candidate.estimated_minutes, generated_candidate.distance_km,
          generated_candidate.suggested_aircraft,
          'A simulated exploration route generated from Flight Desk airport reference data. Distance and estimated time are geographic estimates, not a scheduled-service claim.',
          'Flight Desk airport reference catalog; generated deterministically for a UTC daily challenge.',
          true
        ) ON CONFLICT (departure_icao, arrival_icao) DO NOTHING
        RETURNING * INTO selected_route;

        IF selected_route.id IS NULL THEN
          SELECT route.* INTO selected_route
          FROM public.challenge_routes AS route
          WHERE route.departure_icao = generated_candidate.departure_icao
            AND route.arrival_icao = generated_candidate.arrival_icao;
        END IF;
      END IF;
    END IF;

    -- Curated routes are retained as a safe fallback for installations where
    -- the airport catalog has not been imported or lacks enough candidates.
    IF selected_route.id IS NULL THEN
      SELECT route.* INTO selected_route
      FROM public.challenge_routes AS route
      WHERE route.category = category_name
        AND route.enabled
        AND NOT EXISTS (
          SELECT 1
          FROM public.daily_challenges AS previous
          WHERE previous.challenge_date BETWEEN p_date - 30 AND p_date - 1
            AND pg_catalog.least(previous.departure_icao, previous.arrival_icao)
                = pg_catalog.least(route.departure_icao, route.arrival_icao)
            AND pg_catalog.greatest(previous.departure_icao, previous.arrival_icao)
                = pg_catalog.greatest(route.departure_icao, route.arrival_icao)
        )
      ORDER BY pg_catalog.md5(category_name || ':' || p_date::text || ':' || route.id::text), route.id
      LIMIT 1;

      IF selected_route.id IS NULL THEN
        SELECT route.* INTO selected_route
        FROM public.challenge_routes AS route
        WHERE route.category = category_name AND route.enabled
        ORDER BY pg_catalog.md5(category_name || ':' || p_date::text || ':' || route.id::text), route.id
        LIMIT 1;
      END IF;
    END IF;

    IF selected_route.id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.daily_challenges (
      challenge_date, category, route_id, departure_iata, departure_icao,
      arrival_iata, arrival_icao, departure_name, arrival_name,
      estimated_minutes, distance_km, suggested_aircraft, about
    ) VALUES (
      p_date, category_name, selected_route.id, selected_route.departure_iata,
      selected_route.departure_icao, selected_route.arrival_iata,
      selected_route.arrival_icao, selected_route.departure_name,
      selected_route.arrival_name, selected_route.estimated_minutes,
      selected_route.distance_km, selected_route.suggested_aircraft,
      selected_route.about
    ) ON CONFLICT (challenge_date, category) DO NOTHING;
  END LOOP;
END;
$$;

ALTER FUNCTION public.ensure_daily_challenges(date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_daily_challenges(date)
  FROM PUBLIC, anon, authenticated, service_role;
-- The dashboard calls this guarded, current-UTC-date-only RPC as the logged-in
-- user. Keep service_role for the scheduled job and grant no table write
-- access to authenticated.
GRANT EXECUTE ON FUNCTION public.ensure_daily_challenges(date) TO authenticated, service_role;

COMMIT;

