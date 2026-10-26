begin;

create table if not exists public.country_region_mappings (
  id uuid primary key default gen_random_uuid(),
  original_code text not null check (original_code ~ '^[A-Z]{2}$'),
  target_code text not null check (target_code ~ '^[A-Z]{2}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint country_region_mappings_original_key unique (original_code),
  constraint country_region_mappings_not_identity check (original_code <> target_code)
);

alter table public.country_region_mappings enable row level security;
create index if not exists country_region_mappings_active_idx
  on public.country_region_mappings (original_code) where is_active;

insert into public.country_region_mappings (original_code, target_code)
values ('TW', 'CN')
on conflict (original_code) do nothing;

create or replace function public.prevent_country_mapping_cycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if exists (
    with recursive mapping_chain(code, depth) as (
      select new.target_code, 1
      union all
      select mapping.target_code, chain.depth + 1
      from mapping_chain as chain
      join public.country_region_mappings as mapping
        on mapping.original_code = chain.code
       and mapping.is_active
       and (tg_op = 'INSERT' or mapping.id <> new.id)
      where chain.depth < 10
    )
    select 1 from mapping_chain where code = new.original_code
  ) then
    raise exception 'Country mapping would create a cycle' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists country_region_mappings_validate on public.country_region_mappings;
create trigger country_region_mappings_validate
before insert or update on public.country_region_mappings
for each row execute function public.prevent_country_mapping_cycle();

create or replace function public.resolve_display_country_code(input_code text)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  current_code text := upper(btrim(coalesce(input_code, '')));
  next_code text;
  visited text[] := array[]::text[];
begin
  for step in 1..10 loop
    if current_code !~ '^[A-Z]{2}$' or current_code = any(visited) then exit; end if;
    visited := array_append(visited, current_code);
    select mapping.target_code into next_code
    from public.country_region_mappings as mapping
    where mapping.original_code = current_code and mapping.is_active;
    if next_code is null or next_code = current_code then exit; end if;
    current_code := next_code;
  end loop;
  return nullif(current_code, '');
end;
$function$;

alter table public.country_region_mappings alter column updated_at set default now();
drop policy if exists country_region_mappings_active_read on public.country_region_mappings;
create policy country_region_mappings_active_read on public.country_region_mappings
for select to anon, authenticated using (is_active or public.is_site_admin());
drop policy if exists country_region_mappings_admin_insert on public.country_region_mappings;
create policy country_region_mappings_admin_insert on public.country_region_mappings
for insert to authenticated with check (public.is_site_admin());
drop policy if exists country_region_mappings_admin_update on public.country_region_mappings;
create policy country_region_mappings_admin_update on public.country_region_mappings
for update to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists country_region_mappings_admin_delete on public.country_region_mappings;
create policy country_region_mappings_admin_delete on public.country_region_mappings
for delete to authenticated using (public.is_site_admin());
grant select on public.country_region_mappings to anon, authenticated;
grant insert, update, delete on public.country_region_mappings to authenticated;
revoke all on function public.resolve_display_country_code(text) from public;
grant execute on function public.resolve_display_country_code(text) to anon, authenticated;

-- Keep the authoritative achievement metrics aligned with the active display mapping.
create or replace function public.achievement_metrics_for_user(p_user_id uuid)
returns table(metric_type text, metric_value numeric)
language sql stable security definer
set search_path = pg_catalog, public
as $function$
  with completed as (
    select flight.id,
      case when flight.actual_duration_minutes >= 0 then flight.actual_duration_minutes
        when flight.scheduled_duration_minutes >= 0 then flight.scheduled_duration_minutes
        when flight.duration_minutes >= 0 then flight.duration_minutes else null end as effective_duration_minutes,
      flight.aircraft_type,
      nullif(upper(btrim(flight.departure_airport_icao)), '') as departure_icao,
      nullif(upper(btrim(flight.departure_airport_iata)), '') as departure_iata,
      nullif(upper(btrim(flight.departure_airport)), '') as departure_fallback,
      nullif(upper(btrim(flight.arrival_airport_icao)), '') as arrival_icao,
      nullif(upper(btrim(flight.arrival_airport_iata)), '') as arrival_iata,
      nullif(upper(btrim(flight.arrival_airport)), '') as arrival_fallback,
      nullif(upper(btrim(flight.departure_country_code)), '') as departure_country_snapshot,
      nullif(upper(btrim(flight.arrival_country_code)), '') as arrival_country_snapshot
    from public.flights as flight where flight.user_id = p_user_id and flight.status = 'completed'
  ), resolved as (
    select completed.*,
      departure.id as departure_airport_id,
      public.resolve_display_country_code(departure.country_code) as departure_country,
      departure.continent_code as departure_continent, departure.municipality as departure_city,
      departure.latitude as departure_latitude, departure.longitude as departure_longitude,
      arrival.id as arrival_airport_id,
      public.resolve_display_country_code(arrival.country_code) as arrival_country,
      arrival.continent_code as arrival_continent, arrival.municipality as arrival_city,
      arrival.latitude as arrival_latitude, arrival.longitude as arrival_longitude
    from completed
    left join lateral (
      select airport.id, airport.country_code, airport.continent_code, airport.municipality, airport.latitude, airport.longitude
      from public.airports as airport
      where airport.status <> 'source_missing' and (
        upper(airport.icao_code) in (completed.departure_icao, completed.departure_iata, completed.departure_fallback)
        or upper(airport.iata_code) in (completed.departure_icao, completed.departure_iata, completed.departure_fallback)
        or upper(airport.ident) in (completed.departure_icao, completed.departure_iata, completed.departure_fallback)
        or upper(airport.gps_code) in (completed.departure_icao, completed.departure_iata, completed.departure_fallback))
      order by case when upper(airport.icao_code) = completed.departure_icao then 0 when upper(airport.iata_code) = completed.departure_iata then 1 when upper(airport.ident) = completed.departure_fallback then 2 else 3 end,
        (airport.status = 'listed') desc, airport.scheduled_service desc, airport.id limit 1
    ) as departure on true
    left join lateral (
      select airport.id, airport.country_code, airport.continent_code, airport.municipality, airport.latitude, airport.longitude
      from public.airports as airport
      where airport.status <> 'source_missing' and (
        upper(airport.icao_code) in (completed.arrival_icao, completed.arrival_iata, completed.arrival_fallback)
        or upper(airport.iata_code) in (completed.arrival_icao, completed.arrival_iata, completed.arrival_fallback)
        or upper(airport.ident) in (completed.arrival_icao, completed.arrival_iata, completed.arrival_fallback)
        or upper(airport.gps_code) in (completed.arrival_icao, completed.arrival_iata, completed.arrival_fallback))
      order by case when upper(airport.icao_code) = completed.arrival_icao then 0 when upper(airport.iata_code) = completed.arrival_iata then 1 when upper(airport.ident) = completed.arrival_fallback then 2 else 3 end,
        (airport.status = 'listed') desc, airport.scheduled_service desc, airport.id limit 1
    ) as arrival on true
  ), visited as (
    select departure_airport_id as airport_id,
      coalesce(departure_country, public.resolve_display_country_code(departure_country_snapshot)) as country_code,
      departure_continent as continent_code, departure_city as city from resolved
    union all
    select arrival_airport_id,
      coalesce(arrival_country, public.resolve_display_country_code(arrival_country_snapshot)),
      arrival_continent, arrival_city from resolved
  ), geography as (
    select (count(distinct country_code) filter (where country_code is not null))::numeric as unique_countries,
      (count(distinct airport_id) filter (where airport_id is not null))::numeric as unique_airports,
      (count(distinct continent_code) filter (where continent_code is not null))::numeric as unique_continents,
      (count(distinct (country_code, lower(btrim(city)))) filter (where country_code is not null and nullif(btrim(city), '') is not null))::numeric as unique_cities
    from visited
  ), flight_totals as (
    select count(*)::numeric as completed_flight_count,
      coalesce(sum(effective_duration_minutes), 0)::numeric / 60.0 as total_flight_hours,
      coalesce(sum(case when departure_latitude is not null and departure_longitude is not null and arrival_latitude is not null and arrival_longitude is not null then 6371.0088 * acos(least(1.0, greatest(-1.0, cos(radians(departure_latitude)) * cos(radians(arrival_latitude)) * cos(radians(arrival_longitude) - radians(departure_longitude)) + sin(radians(departure_latitude)) * sin(radians(arrival_latitude))))) else 0 end), 0)::numeric as total_distance_km
    from resolved
  ), routes as (
    select
      (count(distinct (least(departure_airport_id, arrival_airport_id), greatest(departure_airport_id, arrival_airport_id))) filter (where departure_airport_id is not null and arrival_airport_id is not null and departure_airport_id <> arrival_airport_id))::numeric as unique_routes,
      (count(distinct (least(departure_airport_id, arrival_airport_id), greatest(departure_airport_id, arrival_airport_id))) filter (where departure_airport_id is not null and arrival_airport_id is not null and departure_airport_id <> arrival_airport_id and coalesce(departure_country, public.resolve_display_country_code(departure_country_snapshot)) is not null and coalesce(arrival_country, public.resolve_display_country_code(arrival_country_snapshot)) is not null and coalesce(departure_country, public.resolve_display_country_code(departure_country_snapshot)) <> coalesce(arrival_country, public.resolve_display_country_code(arrival_country_snapshot))))::numeric as unique_international_routes
    from resolved
  ), normalized_aircraft as (
    select distinct coalesce(alias.canonical_type_key, public.achievement_aircraft_alias_key(resolved.aircraft_type)) as canonical_type_key, alias.manufacturer
    from resolved left join public.achievement_aircraft_type_aliases as alias on alias.alias_key = public.achievement_aircraft_alias_key(resolved.aircraft_type)
    where public.achievement_aircraft_alias_key(resolved.aircraft_type) is not null
  ), aircraft as (
    select count(distinct canonical_type_key)::numeric as unique_aircraft_types,
      (count(distinct canonical_type_key) filter (where manufacturer = 'boeing'))::numeric as unique_boeing_types,
      (count(distinct canonical_type_key) filter (where manufacturer = 'airbus'))::numeric as unique_airbus_types from normalized_aircraft
  ), challenges as (
    select count(distinct (completion.challenge_date, completion.category))::numeric as completed_daily_challenges from public.daily_challenge_completions as completion where completion.user_id = p_user_id
  ), memorials as (
    select count(distinct participation.id)::numeric as completed_memorial_flights from public.memorial_participation as participation left join public.flights as flight on flight.id = participation.flight_id and flight.user_id = participation.user_id where participation.user_id = p_user_id and (participation.flight_id is null or flight.status = 'completed')
  ), values_to_return(metric_type, metric_value) as (
    select 'completed_flight_count', completed_flight_count from flight_totals union all select 'total_flight_hours', total_flight_hours from flight_totals union all select 'total_distance_km', total_distance_km from flight_totals
    union all select 'unique_countries', unique_countries from geography union all select 'unique_airports', unique_airports from geography union all select 'unique_continents', unique_continents from geography union all select 'unique_cities', unique_cities from geography
    union all select 'unique_aircraft_types', unique_aircraft_types from aircraft union all select 'unique_boeing_types', unique_boeing_types from aircraft union all select 'unique_airbus_types', unique_airbus_types from aircraft
    union all select 'unique_routes', unique_routes from routes union all select 'unique_international_routes', unique_international_routes from routes union all select 'completed_daily_challenges', completed_daily_challenges from challenges union all select 'completed_memorial_flights', completed_memorial_flights from memorials
  ) select values_to_return.metric_type, coalesce(values_to_return.metric_value, 0) from values_to_return;
$function$;

alter function public.achievement_metrics_for_user(uuid) owner to postgres;
revoke all on function public.achievement_metrics_for_user(uuid) from public, anon, authenticated, service_role;

create or replace function public.refresh_all_achievements_after_country_mapping()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  profile_row record;
begin
  if not public.is_site_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  for profile_row in select id from public.profiles loop
    perform public.refresh_achievements_for_user(profile_row.id);
  end loop;
end;
$function$;

alter function public.refresh_all_achievements_after_country_mapping() owner to postgres;
revoke all on function public.refresh_all_achievements_after_country_mapping() from public, anon, authenticated;
grant execute on function public.refresh_all_achievements_after_country_mapping() to authenticated;

commit;
