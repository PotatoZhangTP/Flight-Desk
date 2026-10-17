BEGIN;

CREATE TABLE IF NOT EXISTS public.challenge_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('quick', 'regional', 'medium', 'long')),
  departure_iata text NOT NULL CHECK (departure_iata ~ '^[A-Z]{3}$'),
  departure_icao text NOT NULL CHECK (departure_icao ~ '^[A-Z]{4}$'),
  arrival_iata text NOT NULL CHECK (arrival_iata ~ '^[A-Z]{3}$'),
  arrival_icao text NOT NULL CHECK (arrival_icao ~ '^[A-Z]{4}$'),
  departure_name text NOT NULL,
  arrival_name text NOT NULL,
  estimated_minutes integer NOT NULL CHECK (estimated_minutes > 0),
  distance_km integer NOT NULL CHECK (distance_km > 0),
  suggested_aircraft text,
  about text NOT NULL,
  source_note text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT challenge_routes_departure_arrival_key UNIQUE (departure_icao, arrival_icao)
);

CREATE TABLE IF NOT EXISTS public.daily_challenges (
  challenge_date date NOT NULL,
  category text NOT NULL CHECK (category IN ('quick', 'regional', 'medium', 'long')),
  route_id uuid NOT NULL REFERENCES public.challenge_routes(id),
  departure_iata text NOT NULL,
  departure_icao text NOT NULL,
  arrival_iata text NOT NULL,
  arrival_icao text NOT NULL,
  departure_name text NOT NULL,
  arrival_name text NOT NULL,
  estimated_minutes integer NOT NULL,
  distance_km integer NOT NULL,
  suggested_aircraft text,
  about text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_challenges_date_category_key PRIMARY KEY (challenge_date, category)
);

CREATE TABLE IF NOT EXISTS public.memorial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  title_en text NOT NULL,
  title_zh text NOT NULL,
  description_en text NOT NULL,
  description_zh text NOT NULL,
  event_year integer NOT NULL CHECK (event_year BETWEEN 1900 AND 2200),
  event_month integer NOT NULL CHECK (event_month BETWEEN 1 AND 12),
  event_day integer NOT NULL CHECK (event_day BETWEEN 1 AND 31),
  recurring boolean NOT NULL DEFAULT true,
  departure_iata text NOT NULL,
  departure_icao text NOT NULL,
  arrival_iata text NOT NULL,
  arrival_icao text NOT NULL,
  suggested_aircraft text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memorial_events_event_key_key UNIQUE (event_key)
);

CREATE TABLE IF NOT EXISTS public.memorial_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.memorial_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flight_id uuid REFERENCES public.flights(id) ON DELETE SET NULL,
  marked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memorial_participation_event_user_key UNIQUE (event_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_site_admin' AND p.pronargs = 0
  ) THEN
    RAISE EXCEPTION 'Required public.is_site_admin() function is missing';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_site_admin() TO authenticated;

INSERT INTO public.challenge_routes (
  category, departure_iata, departure_icao, arrival_iata, arrival_icao,
  departure_name, arrival_name, estimated_minutes, distance_km,
  suggested_aircraft, about, source_note
)
VALUES
 ('quick','LHR','EGLL','CDG','LFPG','London Heathrow','Paris Charles de Gaulle',75,344,'A320','A classic short European connection between two major hubs.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('quick','HND','RJTT','KIX','RJBB','Tokyo Haneda','Kansai International',80,431,'A320','A compact domestic Japan route with a strong airport-to-airport briefing.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('quick','SFO','KSFO','LAX','KLAX','San Francisco International','Los Angeles International',80,543,'A320','A familiar California hop suitable for a short session.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('regional','PEK','ZBAA','PVG','ZSPD','Beijing Capital','Shanghai Pudong',145,1085,'A321','A major domestic China trunk route between two large hubs.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('regional','AMS','EHAM','MAD','LEMD','Amsterdam Schiphol','Madrid Barajas',160,1480,'A320','A practical European regional flight with varied airspace and scenery.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('regional','JFK','KJFK','MIA','KMIA','John F. Kennedy International','Miami International',175,1758,'A321','A dependable US domestic route for a longer evening flight.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('medium','DXB','OMDB','LHR','EGLL','Dubai International','London Heathrow',420,5500,'B777','A flagship intercontinental corridor linking Europe and the Gulf.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('medium','SIN','WSSS','NRT','RJAA','Singapore Changi','Narita International',390,5360,'B787','A representative Asia-Pacific medium-haul operation.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('medium','JNB','FAOR','DOH','OTHH','O. R. Tambo International','Hamad International',510,6200,'A350','A substantial southern Africa to Gulf connection.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('long','LAX','KLAX','SYD','YSSY','Los Angeles International','Sydney Kingsford Smith',870,12070,'A350','A classic trans-Pacific long-haul assignment.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('long','JFK','KJFK','SIN','WSSS','John F. Kennedy International','Singapore Changi',1110,15350,'A350','One of the world’s defining ultra-long-haul city pairs.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('long','LHR','EGLL','HND','RJTT','London Heathrow','Tokyo Haneda',750,9560,'B787','A classic Europe-to-Japan long-haul route.','Curated V1 route; airport and distance references reviewed 2026-10-17.')
ON CONFLICT (departure_icao, arrival_icao) DO NOTHING;

INSERT INTO public.memorial_events (
  event_key, title_en, title_zh, description_en, description_zh,
  event_year, event_month, event_day, recurring,
  departure_iata, departure_icao, arrival_iata, arrival_icao, suggested_aircraft
)
VALUES (
  'mh370-2014',
  'Remembering MH370',
  '纪念 MH370',
  'In remembrance of the 239 people aboard Malaysia Airlines Flight MH370.',
  '谨此纪念马来西亚航空 MH370 航班上的 239 位乘客与机组人员。',
  2014, 3, 8, true, 'KUL', 'WMKK', 'PEK', 'ZBAA', 'B777'
)
ON CONFLICT (event_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_daily_challenges(p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  category_name text;
  selected_route public.challenge_routes;
  today_utc date := (pg_catalog.timezone('utc', pg_catalog.now()))::date;
  route_count integer;
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

    SELECT count(*) INTO route_count
    FROM public.challenge_routes
    WHERE category = category_name AND enabled;

    IF route_count = 0 THEN
      CONTINUE;
    END IF;

    /* Prefer routes not used in the preceding 30 days. The ordering is a
       stable hash of category, UTC date and route id, so future rows cannot
       change a historical date's choice. */
    SELECT r.* INTO selected_route
    FROM public.challenge_routes AS r
    WHERE r.category = category_name
      AND r.enabled
      AND NOT EXISTS (
        SELECT 1
        FROM public.daily_challenges AS previous
        WHERE previous.category = category_name
          AND previous.route_id = r.id
          AND previous.challenge_date BETWEEN p_date - 30 AND p_date - 1
      )
    ORDER BY pg_catalog.md5(category_name || ':' || p_date::text || ':' || r.id::text), r.id
    LIMIT 1;

    IF selected_route.id IS NULL THEN
      SELECT r.* INTO selected_route
      FROM public.challenge_routes AS r
      WHERE r.category = category_name AND r.enabled
      ORDER BY pg_catalog.md5(category_name || ':' || p_date::text || ':' || r.id::text), r.id
      LIMIT 1;
    END IF;

    INSERT INTO public.daily_challenges (
      challenge_date, category, route_id, departure_iata, departure_icao,
      arrival_iata, arrival_icao, departure_name, arrival_name,
      estimated_minutes, distance_km, suggested_aircraft, about
    )
    VALUES (
      p_date, category_name, selected_route.id, selected_route.departure_iata,
      selected_route.departure_icao, selected_route.arrival_iata,
      selected_route.arrival_icao, selected_route.departure_name,
      selected_route.arrival_name, selected_route.estimated_minutes,
      selected_route.distance_km, selected_route.suggested_aircraft,
      selected_route.about
    )
    ON CONFLICT (challenge_date, category) DO NOTHING;
  END LOOP;
END;
$$;

ALTER FUNCTION public.ensure_daily_challenges(date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_daily_challenges(date)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_daily_challenges(date) TO service_role;

ALTER TABLE public.challenge_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_participation ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.challenge_routes, public.daily_challenges,
  public.memorial_events, public.memorial_participation
  FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.challenge_routes, public.daily_challenges,
  public.memorial_events TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.memorial_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.memorial_participation TO authenticated;

DROP POLICY IF EXISTS challenge_routes_read ON public.challenge_routes;
CREATE POLICY challenge_routes_read ON public.challenge_routes
  FOR SELECT TO authenticated USING (enabled = true);

DROP POLICY IF EXISTS daily_challenges_read ON public.daily_challenges;
CREATE POLICY daily_challenges_read ON public.daily_challenges
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS memorial_events_read ON public.memorial_events;
CREATE POLICY memorial_events_read ON public.memorial_events
  FOR SELECT TO authenticated USING (enabled = true);

DROP POLICY IF EXISTS memorial_events_admin_read ON public.memorial_events;
CREATE POLICY memorial_events_admin_read ON public.memorial_events
  FOR SELECT TO authenticated
  USING ((SELECT public.is_site_admin()));

DROP POLICY IF EXISTS memorial_events_admin_insert ON public.memorial_events;
CREATE POLICY memorial_events_admin_insert ON public.memorial_events
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_site_admin()));

DROP POLICY IF EXISTS memorial_events_admin_update ON public.memorial_events;
CREATE POLICY memorial_events_admin_update ON public.memorial_events
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_site_admin()))
  WITH CHECK ((SELECT public.is_site_admin()));

DROP POLICY IF EXISTS memorial_events_admin_delete ON public.memorial_events;
CREATE POLICY memorial_events_admin_delete ON public.memorial_events
  FOR DELETE TO authenticated
  USING ((SELECT public.is_site_admin()));

DROP POLICY IF EXISTS memorial_participation_select ON public.memorial_participation;
CREATE POLICY memorial_participation_select ON public.memorial_participation
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS memorial_participation_insert ON public.memorial_participation;
CREATE POLICY memorial_participation_insert ON public.memorial_participation
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.memorial_events e
      WHERE e.id = event_id AND e.enabled
    )
    AND (
      flight_id IS NULL OR EXISTS (
        SELECT 1 FROM public.flights f
        WHERE f.id = flight_id AND f.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS memorial_participation_update ON public.memorial_participation;
CREATE POLICY memorial_participation_update ON public.memorial_participation
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.memorial_events e
      WHERE e.id = event_id AND e.enabled
    )
    AND (
      flight_id IS NULL OR EXISTS (
        SELECT 1 FROM public.flights f
        WHERE f.id = flight_id AND f.user_id = (SELECT auth.uid())
      )
    )
  );

CREATE OR REPLACE FUNCTION public.protect_memorial_participation_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.event_id IS DISTINCT FROM OLD.event_id THEN
    RAISE EXCEPTION 'Participation owner and event cannot be changed'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.protect_memorial_participation_identity()
  OWNER TO postgres;

REVOKE ALL ON FUNCTION public.protect_memorial_participation_identity()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS protect_memorial_participation_identity
  ON public.memorial_participation;

CREATE TRIGGER protect_memorial_participation_identity
BEFORE UPDATE ON public.memorial_participation
FOR EACH ROW
EXECUTE FUNCTION public.protect_memorial_participation_identity();

DROP POLICY IF EXISTS memorial_participation_delete ON public.memorial_participation;
CREATE POLICY memorial_participation_delete ON public.memorial_participation
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

COMMIT;
