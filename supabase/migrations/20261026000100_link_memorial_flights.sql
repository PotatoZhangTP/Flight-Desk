-- Run manually after the existing Daily Challenge migrations.
-- Reuses memorial_participation.flight_id and its (event_id, user_id) uniqueness.
-- No tables, columns, role system, or existing RLS policies are changed.
BEGIN;

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
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('plan', 'complete', 'uncomplete') THEN
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
  v_start := COALESCE(v_event.publish_start_date,
    pg_catalog.make_date(v_event.publish_year, v_event.publish_month, v_event.publish_day));
  v_end := COALESCE(v_event.publish_end_date, v_start);
  IF v_start IS NULL OR v_end IS NULL THEN
    RAISE EXCEPTION 'Memorial publication dates are missing' USING ERRCODE = '22023';
  END IF;
  IF v_event.recurring THEN
    v_day := pg_catalog.to_char(v_today, 'MM-DD');
    v_start_day := pg_catalog.to_char(v_start, 'MM-DD');
    v_end_day := pg_catalog.to_char(v_end, 'MM-DD');
    IF NOT (CASE WHEN v_start_day <= v_end_day
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
  END IF;

  INSERT INTO public.memorial_participation (event_id, user_id, flight_id)
    VALUES (p_event_id, v_user, v_flight)
    ON CONFLICT ON CONSTRAINT memorial_participation_event_user_key
    DO UPDATE SET flight_id = EXCLUDED.flight_id;
  RETURN QUERY SELECT v_flight, v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.save_memorial_flight(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_memorial_flight(uuid, text) TO authenticated;
-- SECURITY INVOKER retains the caller's existing own-flight / participation RLS.
COMMIT;
