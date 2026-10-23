-- Extend the existing aircraft alias registry into the shared Aircraft Catalog.
-- This is additive: existing flights and achievement aliases remain intact.
ALTER TABLE public.achievement_aircraft_type_aliases
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS manufacturer_family text,
  ADD COLUMN IF NOT EXISTS simbrief_supported boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.achievement_aircraft_type_aliases
  DROP CONSTRAINT IF EXISTS achievement_aircraft_type_aliases_manufacturer_check;

ALTER TABLE public.achievement_aircraft_type_aliases
  ADD CONSTRAINT achievement_aircraft_type_aliases_manufacturer_check
  CHECK (manufacturer IS NULL OR manufacturer IN ('boeing', 'airbus', 'embraer', 'atr', 'bombardier', 'other'));

-- Canonical names for the first catalog release. Additional aliases continue to
-- resolve through the existing alias_key/canonical_type_key mechanism.
WITH catalog(canonical_type_key, display_name, manufacturer, manufacturer_family) AS (
  VALUES
    ('B712', 'Boeing 717-200', 'boeing', '717'),
    ('B732', 'Boeing 737-200', 'boeing', '737'),
    ('B733', 'Boeing 737-300', 'boeing', '737'),
    ('B734', 'Boeing 737-400', 'boeing', '737'),
    ('B735', 'Boeing 737-500', 'boeing', '737'),
    ('B736', 'Boeing 737-600', 'boeing', '737'),
    ('B737', 'Boeing 737-700', 'boeing', '737'),
    ('B738', 'Boeing 737-800', 'boeing', '737'),
    ('B739', 'Boeing 737-900', 'boeing', '737'),
    ('B37M', 'Boeing 737 MAX 7', 'boeing', '737 MAX'),
    ('B38M', 'Boeing 737 MAX 8', 'boeing', '737 MAX'),
    ('B39M', 'Boeing 737 MAX 9', 'boeing', '737 MAX'),
    ('B3XM', 'Boeing 737 MAX 10', 'boeing', '737 MAX'),
    ('B741', 'Boeing 747-100', 'boeing', '747'),
    ('B742', 'Boeing 747-200', 'boeing', '747'),
    ('B743', 'Boeing 747-300', 'boeing', '747'),
    ('B744', 'Boeing 747-400', 'boeing', '747'),
    ('B748', 'Boeing 747-8', 'boeing', '747'),
    ('B752', 'Boeing 757-200', 'boeing', '757'),
    ('B753', 'Boeing 757-300', 'boeing', '757'),
    ('B762', 'Boeing 767-200', 'boeing', '767'),
    ('B763', 'Boeing 767-300', 'boeing', '767'),
    ('B764', 'Boeing 767-400', 'boeing', '767'),
    ('B772', 'Boeing 777-200', 'boeing', '777'),
    ('B77L', 'Boeing 777-200LR', 'boeing', '777'),
    ('B773', 'Boeing 777-300', 'boeing', '777'),
    ('B77W', 'Boeing 777-300ER', 'boeing', '777'),
    ('B778', 'Boeing 777-8', 'boeing', '777'),
    ('B779', 'Boeing 777-9', 'boeing', '777'),
    ('B788', 'Boeing 787-8', 'boeing', '787'),
    ('B789', 'Boeing 787-9', 'boeing', '787'),
    ('B78X', 'Boeing 787-10', 'boeing', '787'),
    ('BCS1', 'Airbus A220-100', 'airbus', 'A220'),
    ('BCS3', 'Airbus A220-300', 'airbus', 'A220'),
    ('A306', 'Airbus A300-600', 'airbus', 'A300'),
    ('A310', 'Airbus A310', 'airbus', 'A310'),
    ('A318', 'Airbus A318', 'airbus', 'A318'),
    ('A319', 'Airbus A319', 'airbus', 'A319'),
    ('A19N', 'Airbus A319neo', 'airbus', 'A319'),
    ('A320', 'Airbus A320', 'airbus', 'A320'),
    ('A20N', 'Airbus A320neo', 'airbus', 'A320'),
    ('A321', 'Airbus A321', 'airbus', 'A321'),
    ('A21N', 'Airbus A321neo', 'airbus', 'A321'),
    ('A332', 'Airbus A330-200', 'airbus', 'A330'),
    ('A333', 'Airbus A330-300', 'airbus', 'A330'),
    ('A338', 'Airbus A330-800', 'airbus', 'A330'),
    ('A339', 'Airbus A330-900', 'airbus', 'A330'),
    ('A342', 'Airbus A340-200', 'airbus', 'A340'),
    ('A343', 'Airbus A340-300', 'airbus', 'A340'),
    ('A345', 'Airbus A340-500', 'airbus', 'A340'),
    ('A346', 'Airbus A340-600', 'airbus', 'A340'),
    ('A359', 'Airbus A350-900', 'airbus', 'A350'),
    ('A35K', 'Airbus A350-1000', 'airbus', 'A350'),
    ('A388', 'Airbus A380-800', 'airbus', 'A380')
)
UPDATE public.achievement_aircraft_type_aliases AS alias
SET display_name = catalog.display_name,
    manufacturer = catalog.manufacturer,
    manufacturer_family = catalog.manufacturer_family,
    updated_at = now()
FROM catalog
WHERE alias.canonical_type_key = catalog.canonical_type_key;

UPDATE public.achievement_aircraft_type_aliases
SET display_name = coalesce(display_name, canonical_type_key),
    manufacturer_family = coalesce(manufacturer_family, canonical_type_key)
WHERE display_name IS NULL OR manufacturer_family IS NULL;

CREATE INDEX IF NOT EXISTS achievement_aircraft_catalog_search_idx
  ON public.achievement_aircraft_type_aliases (is_active, canonical_type_key, alias_key);

GRANT SELECT ON public.achievement_aircraft_type_aliases TO authenticated;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'achievement_aircraft_type_aliases'
      AND policyname = 'authenticated_read_active_aircraft_catalog'
  ) THEN
    CREATE POLICY authenticated_read_active_aircraft_catalog
      ON public.achievement_aircraft_type_aliases
      FOR SELECT TO authenticated
      USING (is_active = true);
  END IF;
END;
$policy$;
