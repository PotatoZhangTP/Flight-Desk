BEGIN;

ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS daily_challenge_date date,
  ADD COLUMN IF NOT EXISTS daily_challenge_category text;

ALTER TABLE public.flights
  DROP CONSTRAINT IF EXISTS flights_daily_challenge_category_check;

ALTER TABLE public.flights
  ADD CONSTRAINT flights_daily_challenge_category_check
  CHECK (daily_challenge_category IS NULL OR daily_challenge_category IN ('quick', 'regional', 'medium', 'long'));

CREATE UNIQUE INDEX IF NOT EXISTS flights_daily_challenge_unique_idx
  ON public.flights (user_id, daily_challenge_date, daily_challenge_category)
  WHERE daily_challenge_date IS NOT NULL AND daily_challenge_category IS NOT NULL;

-- The RPC remains SECURITY INVOKER, so grant only the operations it performs.
-- Existing RLS policies still restrict every row to the authenticated user.
GRANT SELECT ON public.daily_challenges TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.daily_challenge_completions TO authenticated;
GRANT SELECT, INSERT ON public.flights TO authenticated;

CREATE OR REPLACE FUNCTION public.toggle_daily_challenge_completion(
  p_challenge_date date,
  p_category text
)
RETURNS TABLE (completed boolean, flight_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_challenge public.daily_challenges%ROWTYPE;
  v_existing_completion public.daily_challenge_completions%ROWTYPE;
  v_flight uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  IF p_challenge_date IS NULL OR p_category IS NULL THEN
    RAISE EXCEPTION 'Invalid challenge' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_user::text || ':' || p_challenge_date::text || ':' || p_category,
      0
    )
  );

  SELECT * INTO v_challenge
  FROM public.daily_challenges
  WHERE challenge_date = p_challenge_date
    AND category = p_category;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge is unavailable' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing_completion
  FROM public.daily_challenge_completions
  WHERE user_id = v_user
    AND challenge_date = p_challenge_date
    AND category = p_category
  FOR UPDATE;

  IF FOUND THEN
    DELETE FROM public.daily_challenge_completions
    WHERE id = v_existing_completion.id;

    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.flights (
    user_id,
    flight_date,
    departure_airport,
    arrival_airport,
    departure_airport_iata,
    departure_airport_icao,
    departure_airport_name,
    arrival_airport_iata,
    arrival_airport_icao,
    arrival_airport_name,
    aircraft_type,
    duration_minutes,
    scheduled_duration_minutes,
    actual_duration_minutes,
    notes,
    status,
    source,
    daily_challenge_date,
    daily_challenge_category
  )
  VALUES (
    v_user,
    v_challenge.challenge_date,
    COALESCE(NULLIF(v_challenge.departure_iata, ''), v_challenge.departure_icao),
    COALESCE(NULLIF(v_challenge.arrival_iata, ''), v_challenge.arrival_icao),
    v_challenge.departure_iata,
    v_challenge.departure_icao,
    v_challenge.departure_name,
    v_challenge.arrival_iata,
    v_challenge.arrival_icao,
    v_challenge.arrival_name,
    v_challenge.suggested_aircraft,
    v_challenge.estimated_minutes,
    v_challenge.estimated_minutes,
    v_challenge.estimated_minutes,
    'Daily Challenge ' || v_challenge.challenge_date::text || ' · ' || v_challenge.category,
    'completed',
    'manual',
    v_challenge.challenge_date,
    v_challenge.category
  )
  RETURNING id INTO v_flight;

  INSERT INTO public.daily_challenge_completions (
    user_id,
    challenge_date,
    category
  )
  VALUES (v_user, p_challenge_date, p_category);

  RETURN QUERY SELECT true, v_flight;
END;
$function$;

ALTER FUNCTION public.toggle_daily_challenge_completion(date, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.toggle_daily_challenge_completion(date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_daily_challenge_completion(date, text) TO authenticated;

COMMIT;
