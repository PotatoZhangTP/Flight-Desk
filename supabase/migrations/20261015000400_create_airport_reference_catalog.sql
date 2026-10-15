begin;

-- Initial schema migration: run once as postgres, after review.
-- Data import is a separate, explicitly authorized operation.
create table public.airports (
  id bigint generated always as identity primary key,
  source text not null default 'ourairports' check (btrim(source) <> ''),
  source_id bigint not null check (source_id > 0),
  source_version text,
  ident text not null check (btrim(ident) <> ''),
  name text not null check (btrim(name) <> ''),
  icao_code text check (icao_code is null or icao_code ~ '^[A-Z]{4}$'),
  iata_code text check (iata_code is null or iata_code ~ '^[A-Z]{3}$'),
  gps_code text,
  local_code text,
  municipality text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  country_name text,
  region_code text,
  timezone text,
  timezone_source text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  airport_type text not null check (btrim(airport_type) <> ''),
  scheduled_service boolean not null default false,
  status text not null default 'listed'
    check (status in ('listed', 'closed', 'source_missing')),
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('pg_catalog.simple'::regconfig, name), 'A') ||
    setweight(to_tsvector('pg_catalog.simple'::regconfig, coalesce(municipality, '')), 'B') ||
    setweight(to_tsvector('pg_catalog.simple'::regconfig, coalesce(country_name, '')), 'C')
  ) stored,
  constraint airports_source_identity_key unique (source, source_id),
  constraint airports_coordinate_pair_check
    check ((latitude is null) = (longitude is null)),
  constraint airports_timezone_provenance_check
    check (timezone is null or nullif(btrim(timezone_source), '') is not null)
);

alter table public.airports owner to postgres;
alter table public.airports enable row level security;

-- Codes are deliberately NOT unique; source identity is the upsert key.
create index airports_iata_search_idx
  on public.airports (upper(iata_code) text_pattern_ops) where status = 'listed';
create index airports_icao_search_idx
  on public.airports (upper(icao_code) text_pattern_ops) where status = 'listed';
create index airports_ident_search_idx
  on public.airports (upper(ident) text_pattern_ops) where status = 'listed';
create index airports_gps_search_idx
  on public.airports (upper(gps_code) text_pattern_ops) where status = 'listed';
create index airports_name_search_idx
  on public.airports using gin (search_vector) where status = 'listed';

-- Public reference reads only. No client write policy, even for site admins.
-- A separately authorized postgres import process owns catalog writes.
revoke all on table public.airports from public, anon, authenticated, service_role;
revoke all on sequence public.airports_id_seq from public, anon, authenticated, service_role;
grant usage on schema public to anon, authenticated;
grant select on table public.airports to anon, authenticated;
create policy airports_reference_read on public.airports
  for select to anon, authenticated using (true);

create function public.validate_airport_reference()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Reject abbreviations/raw offsets; accept named zones supported by PostgreSQL.
  if new.timezone is not null then
    if tg_op = 'INSERT' or new.timezone is distinct from old.timezone then
      if new.timezone not like '%/%'
        or new.timezone like 'posix/%' or new.timezone like 'right/%' then
        raise exception 'Invalid or unsupported airport IANA timezone'
          using errcode = '23514';
      end if;
      -- Resolve one zone directly; do not enumerate pg_timezone_names per row.
      -- This validates runtime support, NOT geographic correctness.
      begin
        perform pg_catalog.timezone(new.timezone, pg_catalog.now());
      exception when invalid_parameter_value then
        raise exception 'Invalid or unsupported airport IANA timezone'
          using errcode = '23514';
      end;
    end if;
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
alter function public.validate_airport_reference() owner to postgres;
revoke all on function public.validate_airport_reference()
  from public, anon, authenticated, service_role;
create trigger airports_validate_and_timestamp
  before insert or update on public.airports
  for each row execute function public.validate_airport_reference();

-- Native indexed code-prefix and word-prefix search; no extension dependency.
-- All statuses remain available as reference data, but discovery excludes closed
-- and source-missing entries. "listed" does not certify operational status.
create function public.search_airports(search_query text, result_limit integer default 12)
returns table (
  id bigint, name text, ident text, icao_code text, iata_code text,
  gps_code text, municipality text, country_code text, country_name text,
  timezone text, latitude double precision, longitude double precision,
  airport_type text, scheduled_service boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select pg_catalog.btrim(search_query) as term,
      pg_catalog.upper(pg_catalog.btrim(search_query)) as code
    where pg_catalog.char_length(pg_catalog.btrim(search_query)) between 2 and 80
  ), terms as (
    select input.*,
      input.code ~ '^[A-Z0-9-]{2,12}$' as is_code,
      pg_catalog.to_tsquery('pg_catalog.simple'::pg_catalog.regconfig, (
        select pg_catalog.string_agg(pg_catalog.quote_literal(word) || ':*', ' & ')
        from pg_catalog.unnest(pg_catalog.tsvector_to_array(
          pg_catalog.to_tsvector('pg_catalog.simple'::pg_catalog.regconfig, input.term)
        )) as words(word)
      )) as query
    from input
  )
  select a.id, a.name, a.ident, a.icao_code, a.iata_code, a.gps_code,
    a.municipality, a.country_code, a.country_name, a.timezone,
    a.latitude, a.longitude, a.airport_type, a.scheduled_service
  from public.airports as a cross join terms as q
  where a.status = 'listed' and (
    (q.is_code and (
      pg_catalog.upper(a.iata_code) like q.code || '%'
      or pg_catalog.upper(a.icao_code) like q.code || '%'
      or pg_catalog.upper(a.ident) like q.code || '%'
      or pg_catalog.upper(a.gps_code) like q.code || '%'
    )) or a.search_vector @@ q.query
  )
  order by
    case
      when pg_catalog.upper(a.iata_code) = q.code
        or pg_catalog.upper(a.icao_code) = q.code then 0
      else 1
    end,
    -- Modest multipliers preserve textual relevance and never exclude small fields.
    (coalesce(pg_catalog.ts_rank_cd(a.search_vector, q.query), 0)
      * case when a.scheduled_service then 1.15 else 1.0 end
      * case a.airport_type when 'large_airport' then 1.10
          when 'medium_airport' then 1.05 else 1.0 end) desc,
    case when pg_catalog.upper(a.ident) = q.code
      or pg_catalog.upper(a.gps_code) = q.code then 0 else 1 end,
    a.scheduled_service desc, a.name, a.id
  limit least(20, greatest(1, coalesce(result_limit, 12)));
$$;
alter function public.search_airports(text, integer) owner to postgres;
revoke all on function public.search_airports(text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.search_airports(text, integer) to anon, authenticated;

comment on table public.airports is
  'Public reference catalog, not flight history. OurAirports data: public domain; geographic timezone enrichment has separate licensing.';
comment on column public.airports.source_version is
  'Pinned source revision or dataset checksum; not a per-airport source modification timestamp.';
comment on column public.airports.timezone_source is
  'Enrichment dataset, pinned version and method, or reviewed override. NULL timezone requires user selection.';
comment on column public.airports.imported_at is
  'Time the trusted importer last synchronized this row, not the source edit time.';

commit;
