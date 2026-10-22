-- Speed up achievement_metrics_for_user() airport resolution.
-- The function compares upper(airport_code) expressions, so raw-column
-- indexes alone cannot reliably support the four OR branches.
BEGIN;

CREATE INDEX IF NOT EXISTS airports_upper_icao_achievement_idx
  ON public.airports (upper(icao_code))
  WHERE icao_code IS NOT NULL AND status <> 'source_missing';

CREATE INDEX IF NOT EXISTS airports_upper_iata_achievement_idx
  ON public.airports (upper(iata_code))
  WHERE iata_code IS NOT NULL AND status <> 'source_missing';

CREATE INDEX IF NOT EXISTS airports_upper_ident_achievement_idx
  ON public.airports (upper(ident))
  WHERE ident IS NOT NULL AND status <> 'source_missing';

CREATE INDEX IF NOT EXISTS airports_upper_gps_achievement_idx
  ON public.airports (upper(gps_code))
  WHERE gps_code IS NOT NULL AND status <> 'source_missing';

ANALYZE public.airports;

COMMIT;
