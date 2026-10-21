BEGIN;

-- The existing UPPER(... text_pattern_ops) indexes support prefix search, but
-- do not cover the exact raw-code IN queries used by Dashboard, Flight Map,
-- Passport, and flight filters.
CREATE INDEX IF NOT EXISTS airports_icao_lookup_idx
  ON public.airports (icao_code)
  WHERE icao_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS airports_iata_lookup_idx
  ON public.airports (iata_code)
  WHERE iata_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS airports_ident_lookup_idx
  ON public.airports (ident)
  WHERE ident IS NOT NULL;

-- Category filtering and Memorial Flight lookups start from the current user.
-- The existing UNIQUE(event_id, user_id) constraint has the opposite leading
-- column and cannot efficiently serve that access pattern.
CREATE INDEX IF NOT EXISTS memorial_participation_user_flight_idx
  ON public.memorial_participation (user_id, flight_id)
  WHERE flight_id IS NOT NULL;

COMMIT;
