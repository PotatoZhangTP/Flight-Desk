BEGIN;

-- Daily Challenge routes use the family-level B787 code. Keep that code in
-- the same catalog used by Add a Flight, All Flights, and achievements so
-- existing rows can be displayed and searched by their standard name.
INSERT INTO public.achievement_aircraft_type_aliases (
  alias_key,
  canonical_type_key,
  display_name,
  manufacturer,
  manufacturer_family,
  simbrief_supported,
  is_active
)
VALUES (
  'B787',
  'B787',
  'Boeing 787',
  'boeing',
  '787',
  true,
  true
)
ON CONFLICT (alias_key) DO UPDATE SET
  canonical_type_key = EXCLUDED.canonical_type_key,
  display_name = EXCLUDED.display_name,
  manufacturer = EXCLUDED.manufacturer,
  manufacturer_family = EXCLUDED.manufacturer_family,
  simbrief_supported = EXCLUDED.simbrief_supported,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMIT;
