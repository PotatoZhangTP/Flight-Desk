-- Run manually after the existing Daily Challenge migrations.
-- Reuses memorial_participation.flight_id and its (event_id, user_id) uniqueness.
-- Checks prerequisites; no tables, columns, data, or RLS policies are changed.
BEGIN;

DO $preflight$
DECLARE
  v_table text;
  v_privilege text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.memorial_participation'::regclass
      AND c.conname = 'memorial_participation_event_user_key'
      AND c.contype = 'u' AND NOT c.condeferrable AND c.convalidated
      AND ARRAY(
        SELECT a.attname::text FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        ORDER BY a.attname
      ) = ARRAY['event_id', 'user_id']::text[]
  ) THEN
    RAISE EXCEPTION 'Required non-deferrable UNIQUE(event_id, user_id) constraint memorial_participation_event_user_key is missing';
  END IF;
  IF NOT pg_catalog.has_schema_privilege('authenticated', 'public', 'USAGE')
     OR NOT pg_catalog.has_schema_privilege('authenticated', 'auth', 'USAGE')
     OR NOT pg_catalog.has_function_privilege('authenticated', 'auth.uid()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated schema/auth.uid privileges are missing';
  END IF;
  FOREACH v_table IN ARRAY ARRAY['public.flights', 'public.memorial_participation', 'public.memorial_events'] LOOP
    IF NOT (SELECT c.relrowsecurity FROM pg_catalog.pg_class c WHERE c.oid = v_table::regclass) THEN
      RAISE EXCEPTION 'RLS must be enabled on %', v_table;
    END IF;
    IF NOT pg_catalog.has_table_privilege('authenticated', v_table, 'SELECT') THEN
      RAISE EXCEPTION 'Authenticated SELECT privilege is missing on %', v_table;
    END IF;
    IF v_table <> 'public.memorial_events' THEN
      FOREACH v_privilege IN ARRAY ARRAY['INSERT', 'UPDATE'] LOOP
        IF NOT pg_catalog.has_table_privilege('authenticated', v_table, v_privilege) THEN
          RAISE EXCEPTION 'Authenticated % privilege is missing on %', v_privilege, v_table;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.save_memorial_flight(p_event_id uuid, p_action text)
RETURNS TABLE (flight_id uuid, status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_event public.memorial_events%ROWTYPE;
  v_flight uuid;
  v_status text;
  v_today date := (pg_catalog.timezone('utc', pg_catalog.now()))::date;
  v_start date;
  v_end date;
  v_day text;
  v_start_day text;
  v_end_day text;
  v_affected integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;
  IF p_event_id IS NULL OR p_action IS NULL OR p_action NOT IN ('plan', 'complete', 'uncomplete') THEN
    RAISE EXCEPTION 'Invalid action' USING ERRCODE = '22023';
  END IF;

  -- Serialize requests for exactly this user/event, including across browser tabs.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text || ':' || p_event_id::text, 0)
  );
  SELECT e.* INTO v_event FROM public.memorial_events e
    WHERE e.id = p_event_id AND e.enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Memorial unavailable' USING ERRCODE = '42501';
  END IF;
  v_start := v_event.publish_start_date;
  IF v_start IS NULL THEN
    IF v_event.publish_year IS NULL OR v_event.publish_month IS NULL OR v_event.publish_day IS NULL THEN
      RAISE EXCEPTION 'Memorial publication dates are missing' USING ERRCODE = '22023';
    END IF;
    BEGIN
      v_start := pg_catalog.make_date(v_event.publish_year, v_event.publish_month, v_event.publish_day);
    EXCEPTION WHEN datetime_field_overflow THEN
      RAISE EXCEPTION 'Memorial legacy publication date is invalid; correct it in Admin Panel'
        USING ERRCODE = '22023';
    END;
  END IF;
  v_end := COALESCE(v_event.publish_end_date, v_start);
  IF NOT pg_catalog.isfinite(v_start) OR NOT pg_catalog.isfinite(v_end) OR v_end < v_start THEN
    RAISE EXCEPTION 'Memorial publication window is invalid' USING ERRCODE = '22023';
  END IF;
  IF v_event.recurring THEN
    v_day := pg_catalog.to_char(v_today, 'MM-DD');
    v_start_day := pg_catalog.to_char(v_start, 'MM-DD');
    v_end_day := pg_catalog.to_char(v_end, 'MM-DD');
    -- Strict month/day anniversaries: Feb 29 is never shifted to March 1.
    -- A range spanning at least a full annual cycle covers every UTC date.
    IF v_end - v_start < 365 AND NOT (CASE WHEN v_start_day <= v_end_day
      THEN v_day BETWEEN v_start_day AND v_end_day
      ELSE v_day >= v_start_day OR v_day <= v_end_day END) THEN
      RAISE EXCEPTION 'Memorial is outside its publication window' USING ERRCODE = '42501';
    END IF;
  ELSIF v_today < v_start OR v_today > v_end THEN
    RAISE EXCEPTION 'Memorial is outside its publication window' USING ERRCODE = '42501';
  END IF;

  SELECT p.flight_id INTO v_flight FROM public.memorial_participation p
    WHERE p.event_id = p_event_id AND p.user_id = v_user FOR UPDATE;
  IF v_flight IS NOT NULL THEN
    SELECT f.status INTO v_status FROM public.flights f
      WHERE f.id = v_flight AND f.user_id = v_user FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Linked flight is unavailable' USING ERRCODE = '42501';
    END IF;
    -- Adding again never downgrades a completed flight. Only explicit undo does.
    IF p_action IN ('complete', 'uncomplete') THEN
      UPDATE public.flights f
        SET status = CASE WHEN p_action = 'complete' THEN 'completed' ELSE 'planned' END
        WHERE f.id = v_flight AND f.user_id = v_user
        RETURNING f.status INTO v_status;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Linked flight update was not permitted' USING ERRCODE = '42501';
      END IF;
    END IF;
  ELSE
    v_status := CASE WHEN p_action = 'complete' THEN 'completed' ELSE 'planned' END;
    INSERT INTO public.flights (
      user_id, flight_date, departure_airport, arrival_airport,
      departure_airport_iata, departure_airport_icao,
      arrival_airport_iata, arrival_airport_icao, aircraft_type, status, source
    ) VALUES (
      v_user, v_today, COALESCE(NULLIF(v_event.departure_iata, ''), v_event.departure_icao),
      COALESCE(NULLIF(v_event.arrival_iata, ''), v_event.arrival_icao),
      v_event.departure_iata, v_event.departure_icao,
      v_event.arrival_iata, v_event.arrival_icao, v_event.suggested_aircraft,
      v_status, 'manual'
    ) RETURNING id INTO v_flight;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Flight creation was not permitted' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.memorial_participation (event_id, user_id, flight_id)
    VALUES (p_event_id, v_user, v_flight)
    ON CONFLICT ON CONSTRAINT memorial_participation_event_user_key
    DO UPDATE SET flight_id = EXCLUDED.flight_id;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> 1 THEN
    RAISE EXCEPTION 'Participation could not be linked' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT v_flight, v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.save_memorial_flight(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_memorial_flight(uuid, text) TO authenticated;
-- SECURITY INVOKER retains the caller's existing own-flight / participation RLS.
COMMIT;
