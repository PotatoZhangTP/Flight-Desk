BEGIN;

-- Repair the already-deployed generator. The outer clamp must be LEAST(1, ...)
-- and invalid zero-distance pairs must be excluded before inserting routes.
DO $$
DECLARE
  function_sql text;
  updated_sql text;
BEGIN
  SELECT pg_get_functiondef(
    'public.ensure_daily_challenges(date)'::regprocedure
  )
  INTO function_sql;

  updated_sql := replace(
    function_sql,
    'GREATEST(1.0::double precision, GREATEST(-1.0::double precision,',
    'LEAST(1.0::double precision, GREATEST(-1.0::double precision,'
  );

  updated_sql := regexp_replace(
    updated_sql,
    '(WHERE[[:space:]]+public\.daily_challenge_category_for_distance\(pair\.distance_km\)[[:space:]]*=[[:space:]]*\$2)',
    E'\\1 AND pair.distance_km > 0',
    1,
    1,
    'n'
  );

  IF updated_sql = function_sql THEN
    RAISE EXCEPTION 'Daily challenge generator requires manual inspection';
  END IF;

  EXECUTE updated_sql;
END;
$$;

ALTER FUNCTION public.ensure_daily_challenges(date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_daily_challenges(date)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_daily_challenges(date)
  TO authenticated, service_role;

COMMIT;
