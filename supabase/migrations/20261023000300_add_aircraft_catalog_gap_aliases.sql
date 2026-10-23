-- Backfill canonical aliases found in existing completed flights.
-- This preserves the original aircraft_type text while making the
-- manufacturer mapping explicit for achievement calculations.
INSERT INTO public.achievement_aircraft_type_aliases (
  alias_key,
  canonical_type_key,
  manufacturer,
  display_name,
  manufacturer_family,
  simbrief_supported,
  is_active,
  updated_at
)
VALUES
  ('A321', 'A321', 'airbus', 'Airbus A321', 'A321', true, true, now()),
  ('A330', 'A330', 'airbus', 'Airbus A330', 'A330', true, true, now()),
  ('A330300', 'A330', 'airbus', 'Airbus A330', 'A330', true, true, now()),
  ('B747', 'B747', 'boeing', 'Boeing 747', '747', true, true, now())
ON CONFLICT (alias_key) DO UPDATE SET
  canonical_type_key = EXCLUDED.canonical_type_key,
  manufacturer = EXCLUDED.manufacturer,
  display_name = EXCLUDED.display_name,
  manufacturer_family = EXCLUDED.manufacturer_family,
  simbrief_supported = EXCLUDED.simbrief_supported,
  is_active = EXCLUDED.is_active,
  updated_at = now();
