-- Shared airport aliases for search and Excel resolution.
-- This does not add a second airport entity or change flights storage: aliases
-- always point to an existing row in public.airports.

CREATE TABLE IF NOT EXISTS public.airport_aliases (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  airport_id bigint NOT NULL REFERENCES public.airports(id) ON DELETE CASCADE,
  alias text NOT NULL CHECK (btrim(alias) <> '' AND char_length(alias) <= 200),
  locale text,
  alias_normalized text GENERATED ALWAYS AS (lower(btrim(alias))) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (airport_id, alias_normalized)
);

ALTER TABLE public.airport_aliases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.airport_aliases FROM public, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.airport_aliases TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'airport_aliases'
      AND policyname = 'airport_aliases_reference_read'
  ) THEN
    CREATE POLICY airport_aliases_reference_read ON public.airport_aliases
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS airport_aliases_normalized_idx
  ON public.airport_aliases (alias_normalized);

INSERT INTO public.airport_aliases (airport_id, alias, locale)
SELECT a.id, seed.alias, seed.locale
FROM public.airports AS a
JOIN (VALUES
  ('TSN', '天津滨海', 'zh-CN'),
  ('TSN', '天津滨海国际机场', 'zh-CN'),
  ('TSN', 'Tianjin Binhai', 'en'),
  ('PEK', '首都机场', 'zh-CN'),
  ('PEK', '北京首都国际机场', 'zh-CN'),
  ('PKX', '大兴机场', 'zh-CN'),
  ('PKX', '北京大兴国际机场', 'zh-CN'),
  ('PVG', '浦东机场', 'zh-CN'),
  ('PVG', '上海浦东国际机场', 'zh-CN'),
  ('SHA', '虹桥机场', 'zh-CN'),
  ('TFU', '天府机场', 'zh-CN'),
  ('TFU', '成都天府国际机场', 'zh-CN')
) AS seed(iata_code, alias, locale) ON true
WHERE a.iata_code = seed.iata_code
ON CONFLICT (airport_id, alias_normalized) DO UPDATE
SET locale = EXCLUDED.locale;

DROP FUNCTION IF EXISTS public.search_airports(text, integer);

CREATE FUNCTION public.search_airports(search_query text, result_limit integer DEFAULT 12)
RETURNS TABLE (
  id bigint, name text, ident text, icao_code text, iata_code text,
  gps_code text, local_code text, municipality text, country_code text,
  country_name text, timezone text, latitude double precision,
  longitude double precision, airport_type text, scheduled_service boolean
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH input AS (
    SELECT pg_catalog.btrim(search_query) AS term,
      pg_catalog.lower(pg_catalog.btrim(search_query)) AS normalized,
      pg_catalog.upper(pg_catalog.btrim(search_query)) AS code
    WHERE pg_catalog.char_length(pg_catalog.btrim(search_query)) BETWEEN 2 AND 80
  ), terms AS (
    SELECT input.*,
      input.code ~ '^[A-Z0-9-]{2,12}$' AS is_code,
      pg_catalog.to_tsquery('pg_catalog.simple'::pg_catalog.regconfig, (
        SELECT pg_catalog.string_agg(pg_catalog.quote_literal(word) || ':*', ' & ')
        FROM pg_catalog.unnest(pg_catalog.tsvector_to_array(
          pg_catalog.to_tsvector('pg_catalog.simple'::pg_catalog.regconfig, input.term)
        )) AS words(word)
      )) AS query
    FROM input
  )
  SELECT a.id, a.name, a.ident, a.icao_code, a.iata_code,
    a.gps_code, a.local_code, a.municipality, a.country_code,
    a.country_name, a.timezone, a.latitude, a.longitude,
    a.airport_type, a.scheduled_service
  FROM public.airports AS a CROSS JOIN terms AS q
  WHERE a.status = 'listed' AND (
    (q.is_code AND (
      pg_catalog.upper(a.iata_code) LIKE q.code || '%'
      OR pg_catalog.upper(a.icao_code) LIKE q.code || '%'
      OR pg_catalog.upper(a.ident) LIKE q.code || '%'
      OR pg_catalog.upper(a.gps_code) LIKE q.code || '%'
    ))
    OR a.search_vector @@ q.query
    OR EXISTS (
      SELECT 1 FROM public.airport_aliases AS alias
      WHERE alias.airport_id = a.id
        AND (alias.alias_normalized = q.normalized
          OR alias.alias_normalized LIKE q.normalized || '%')
    )
  )
  ORDER BY
    CASE WHEN pg_catalog.upper(a.iata_code) = q.code
      OR pg_catalog.upper(a.icao_code) = q.code THEN 0 ELSE 1 END,
    CASE WHEN EXISTS (
      SELECT 1 FROM public.airport_aliases AS alias
      WHERE alias.airport_id = a.id AND alias.alias_normalized = q.normalized
    ) THEN 0 ELSE 1 END,
    (coalesce(pg_catalog.ts_rank_cd(a.search_vector, q.query), 0)
      * CASE WHEN a.scheduled_service THEN 1.15 ELSE 1.0 END
      * CASE a.airport_type WHEN 'large_airport' THEN 1.10
          WHEN 'medium_airport' THEN 1.05 ELSE 1.0 END) DESC,
    a.scheduled_service DESC, a.name, a.id
  LIMIT least(20, greatest(1, coalesce(result_limit, 12)));
$$;

ALTER FUNCTION public.search_airports(text, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.search_airports(text, integer) FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_airports(text, integer) TO anon, authenticated;
