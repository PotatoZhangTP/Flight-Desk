-- Add a generic fuzzy candidate path for transliterated airport names.
-- This does not choose an airport by itself: the application still requires
-- one unique candidate before marking an Excel value as Resolved.

create extension if not exists pg_trgm;

create index if not exists airports_name_municipality_trgm_idx
  on public.airports using gin ((lower(coalesce(name, '') || ' ' || coalesce(municipality, ''))) gin_trgm_ops)
  where status = 'listed';

create or replace function public.search_airports(search_query text, result_limit integer default 12)
returns table (
  id bigint, name text, ident text, icao_code text, iata_code text,
  gps_code text, local_code text, municipality text, country_code text,
  country_name text, timezone text, latitude double precision,
  longitude double precision, airport_type text, scheduled_service boolean
)
language sql stable security invoker set search_path = ''
as $$
  with input as (
    select pg_catalog.btrim(search_query) as term,
      pg_catalog.lower(pg_catalog.btrim(search_query)) as normalized,
      pg_catalog.upper(pg_catalog.btrim(search_query)) as code
    where pg_catalog.char_length(pg_catalog.btrim(search_query)) between 2 and 80
  ), terms as (
    select input.*,
      input.code ~ '^[A-Z0-9-]{2,12}$' as is_code,
      input.term ~ '^[A-Za-z][A-Za-z -]+$' as is_latin,
      pg_catalog.to_tsquery('pg_catalog.simple'::pg_catalog.regconfig, (
        select pg_catalog.string_agg(pg_catalog.quote_literal(word) || ':*', ' & ')
        from pg_catalog.unnest(pg_catalog.tsvector_to_array(
          pg_catalog.to_tsvector('pg_catalog.simple'::pg_catalog.regconfig, input.term)
        )) as words(word)
      )) as query
    from input
  )
  select a.id, a.name, a.ident, a.icao_code, a.iata_code,
    a.gps_code, a.local_code, a.municipality, a.country_code,
    a.country_name, a.timezone, a.latitude, a.longitude,
    a.airport_type, a.scheduled_service
  from public.airports as a cross join terms as q
  where a.status = 'listed' and (
    (q.is_code and (
      pg_catalog.upper(a.iata_code) like q.code || '%'
      or pg_catalog.upper(a.icao_code) like q.code || '%'
      or pg_catalog.upper(a.ident) like q.code || '%'
      or pg_catalog.upper(a.gps_code) like q.code || '%'
    ))
    or a.search_vector @@ q.query
    or exists (
      select 1 from public.airport_aliases as alias
      where alias.airport_id = a.id
        and (alias.alias_normalized = q.normalized
          or alias.alias_normalized like q.normalized || '%')
    )
    or (q.is_latin and public.similarity(
      pg_catalog.lower(coalesce(a.name, '') || ' ' || coalesce(a.municipality, '')),
      q.normalized
    ) >= 0.35)
  )
  order by
    case when pg_catalog.upper(a.iata_code) = q.code
      or pg_catalog.upper(a.icao_code) = q.code then 0 else 1 end,
    case when exists (
      select 1 from public.airport_aliases as alias
      where alias.airport_id = a.id and alias.alias_normalized = q.normalized
    ) then 0 else 1 end,
    public.similarity(
      pg_catalog.lower(coalesce(a.name, '') || ' ' || coalesce(a.municipality, '')),
      q.normalized
    ) desc,
    (coalesce(pg_catalog.ts_rank_cd(a.search_vector, q.query), 0)
      * case when a.scheduled_service then 1.15 else 1.0 end
      * case a.airport_type when 'large_airport' then 1.10
          when 'medium_airport' then 1.05 else 1.0 end) desc,
    a.scheduled_service desc, a.name, a.id
  limit least(20, greatest(1, coalesce(result_limit, 12)));
$$;

alter function public.search_airports(text, integer) owner to postgres;
revoke all on function public.search_airports(text, integer) from public, anon, authenticated, service_role;
grant execute on function public.search_airports(text, integer) to anon, authenticated;
