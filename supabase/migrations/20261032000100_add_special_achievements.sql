begin;

-- The 14 one-time badges use the existing standalone achievement lifecycle.
-- They intentionally have no achievement_levels rows.
with special_seed(slug, name_en, name_zh, description_en, description_zh, metric_type, display_order) as (
  values
    ('first-flight', 'First Flight', '首次飞行', 'Complete the first flight.', '完成第一趟航班。', 'special_first_flight', 1),
    ('first-international-flight', 'First International Flight', '首次国际航班', 'Complete the first international flight.', '完成第一趟国际航班。', 'special_first_international_flight', 2),
    ('widebody-debut', 'Widebody Debut', '宽体首飞', 'Complete a flight on a widebody aircraft for the first time.', '首次乘坐宽体客机完成飞行。', 'special_widebody_debut', 3),
    ('narrowbody-debut', 'Narrowbody Debut', '窄体首飞', 'Complete a flight on a narrowbody aircraft for the first time.', '首次乘坐窄体客机完成飞行。', 'special_narrowbody_debut', 4),
    ('queen-of-the-skies', 'Queen of the Skies', '天空女王', 'Complete a flight on a Boeing 747 for the first time.', '首次乘坐 Boeing 747 完成飞行。', 'special_queen_of_the_skies', 5),
    ('superjumbo-experience', 'Superjumbo Experience', '超级巨无霸体验', 'Complete a flight on an Airbus A380 for the first time.', '首次乘坐 Airbus A380 完成飞行。', 'special_superjumbo_experience', 6),
    ('across-the-atlantic', 'Across the Atlantic', '横渡大西洋', 'Complete a transatlantic flight for the first time.', '首次完成跨大西洋航班。', 'special_across_the_atlantic', 7),
    ('across-the-pacific', 'Across the Pacific', '横渡太平洋', 'Complete a transpacific flight for the first time.', '首次完成跨太平洋航班。', 'special_across_the_pacific', 8),
    ('around-the-world', 'Around the World', '环球飞行', 'Accumulate approximately 40,075 km of flight distance.', '累计飞行距离达到约 40,075 公里。', 'special_around_the_world', 9),
    ('long-haul-pioneer', 'Long-Haul Pioneer', '长途先驱', 'Complete a flight with a scheduled duration of at least 7 hours.', '完成一趟计划时长至少 7 小时的航班。', 'special_long_haul_pioneer', 10),
    ('new-year-in-the-sky', 'New Year in the Sky', '空中跨年', 'Be airborne across a qualifying local New Year transition.', '在符合条件的当地新年时间段飞行。', 'special_new_year_in_the_sky', 11),
    ('first-memorial-flight', 'First Memorial Flight', '首次纪念飞行', 'Complete a Memorial Flight for the first time.', '首次完成纪念飞行。', 'special_first_memorial_flight', 12),
    ('round-tripper', 'Round Tripper', '往返飞行', 'Complete both directions of the same route.', '完成同一条航线的两个方向。', 'special_round_tripper', 13),
    ('challenge-accepted', 'Challenge Accepted', '挑战接受者', 'Complete the first Daily Challenge.', '完成第一项每日挑战。', 'special_challenge_accepted', 14)
), category as (
  select id from public.achievement_categories where slug = 'flight_experiences'
), inserted as (
  insert into public.achievement_definitions (
    slug, category_id, name_en, name_zh, description_en, description_zh,
    badge_type, icon_key, unlock_rule_type, unlock_rule_config,
    display_order, is_active, is_hidden
  )
  select seed.slug, category.id, seed.name_en, seed.name_zh,
    seed.description_en, seed.description_zh, 'standalone',
    'special-' || seed.slug, seed.metric_type,
    jsonb_build_object(
      'implementation', 'available_for_evaluation',
      'source', 'public.flights+public.airports+public.daily_challenge_completions+public.memorial_participation',
      'threshold', 1
    ), seed.display_order, true, false
  from special_seed as seed cross join category
  on conflict (slug) do update set
    category_id = excluded.category_id,
    name_en = excluded.name_en,
    name_zh = excluded.name_zh,
    description_en = excluded.description_en,
    description_zh = excluded.description_zh,
    badge_type = excluded.badge_type,
    icon_key = excluded.icon_key,
    unlock_rule_type = excluded.unlock_rule_type,
    unlock_rule_config = excluded.unlock_rule_config,
    display_order = excluded.display_order,
    is_active = true,
    is_hidden = false,
    updated_at = now()
  returning id
)
select count(*) from inserted;

-- Add the special metrics without duplicating the existing base metric query.
do $rename$
begin
  if to_regprocedure('public.achievement_metrics_for_user(uuid)') is not null
     and to_regprocedure('public.achievement_base_metrics_for_user(uuid)') is null then
    alter function public.achievement_metrics_for_user(uuid)
      rename to achievement_base_metrics_for_user;
  end if;
end;
$rename$;

create or replace function public.special_achievement_metrics_for_user(p_user_id uuid)
returns table(metric_type text, metric_value numeric)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  with completed as (
    select
      flight.id,
      flight.scheduled_duration_minutes,
      flight.departure_local_date,
      flight.departure_local_time,
      flight.aircraft_type,
      nullif(upper(btrim(flight.departure_airport_icao)), '') as departure_icao,
      nullif(upper(btrim(flight.departure_airport_iata)), '') as departure_iata,
      nullif(upper(btrim(flight.departure_airport)), '') as departure_fallback,
      nullif(upper(btrim(flight.arrival_airport_icao)), '') as arrival_icao,
      nullif(upper(btrim(flight.arrival_airport_iata)), '') as arrival_iata,
      nullif(upper(btrim(flight.arrival_airport)), '') as arrival_fallback,
      nullif(upper(btrim(flight.departure_country_code)), '') as departure_country_snapshot,
      nullif(upper(btrim(flight.arrival_country_code)), '') as arrival_country_snapshot
    from public.flights as flight
    where flight.user_id = p_user_id
      and flight.status = 'completed'
  ), resolved as (
    select completed.*,
      departure.id as departure_airport_id,
      public.resolve_display_country_code(coalesce(departure.country_code, completed.departure_country_snapshot)) as departure_country,
      departure.continent_code as departure_continent,
      departure.latitude as departure_latitude,
      departure.longitude as departure_longitude,
      arrival.id as arrival_airport_id,
      public.resolve_display_country_code(coalesce(arrival.country_code, completed.arrival_country_snapshot)) as arrival_country,
      arrival.continent_code as arrival_continent,
      arrival.latitude as arrival_latitude,
      arrival.longitude as arrival_longitude
    from completed
    left join lateral (
      select airport.id, airport.country_code, airport.continent_code, airport.latitude, airport.longitude
      from public.airports as airport
      where airport.status <> 'source_missing'
        and (
          upper(airport.icao_code) in (completed.departure_icao, completed.departure_iata, completed.departure_fallback)
          or upper(airport.iata_code) in (completed.departure_icao, completed.departure_iata, completed.departure_fallback)
          or upper(airport.ident) in (completed.departure_icao, completed.departure_iata, completed.departure_fallback)
          or upper(airport.gps_code) in (completed.departure_icao, completed.departure_iata, completed.departure_fallback)
        )
      order by case when upper(airport.icao_code) = completed.departure_icao then 0 when upper(airport.iata_code) = completed.departure_iata then 1 when upper(airport.ident) = completed.departure_fallback then 2 else 3 end,
        (airport.status = 'listed') desc, airport.scheduled_service desc, airport.id
      limit 1
    ) as departure on true
    left join lateral (
      select airport.id, airport.country_code, airport.continent_code, airport.latitude, airport.longitude
      from public.airports as airport
      where airport.status <> 'source_missing'
        and (
          upper(airport.icao_code) in (completed.arrival_icao, completed.arrival_iata, completed.arrival_fallback)
          or upper(airport.iata_code) in (completed.arrival_icao, completed.arrival_iata, completed.arrival_fallback)
          or upper(airport.ident) in (completed.arrival_icao, completed.arrival_iata, completed.arrival_fallback)
          or upper(airport.gps_code) in (completed.arrival_icao, completed.arrival_iata, completed.arrival_fallback)
        )
      order by case when upper(airport.icao_code) = completed.arrival_icao then 0 when upper(airport.iata_code) = completed.arrival_iata then 1 when upper(airport.ident) = completed.arrival_fallback then 2 else 3 end,
        (airport.status = 'listed') desc, airport.scheduled_service desc, airport.id
      limit 1
    ) as arrival on true
  ), aircraft as (
    select distinct coalesce(alias.canonical_type_key, public.achievement_aircraft_alias_key(resolved.aircraft_type)) as canonical_type_key,
      alias.manufacturer_family
    from resolved
    left join public.achievement_aircraft_type_aliases as alias
      on alias.alias_key = public.achievement_aircraft_alias_key(resolved.aircraft_type)
    where public.achievement_aircraft_alias_key(resolved.aircraft_type) is not null
  ), distances as (
    select coalesce(sum(case
      when departure_latitude is not null and departure_longitude is not null
       and arrival_latitude is not null and arrival_longitude is not null
      then 6371.0088 * acos(least(1.0, greatest(-1.0,
        cos(radians(departure_latitude)) * cos(radians(arrival_latitude))
        * cos(radians(arrival_longitude) - radians(departure_longitude))
        + sin(radians(departure_latitude)) * sin(radians(arrival_latitude))
      ))) else 0 end), 0)::numeric as total_distance_km
    from resolved
  ), route_pairs as (
    select distinct departure_airport_id, arrival_airport_id
    from resolved
    where departure_airport_id is not null and arrival_airport_id is not null
  ), flags as (
    select
      case when exists (select 1 from resolved) then 1 else 0 end as first_flight,
      case when exists (select 1 from resolved where departure_country is not null and arrival_country is not null and departure_country <> arrival_country) then 1 else 0 end as first_international,
      case when exists (select 1 from aircraft where manufacturer_family in ('747', '767', '777', '787', 'A300', 'A310', 'A330', 'A340', 'A350', 'A380')) then 1 else 0 end as widebody_debut,
      case when exists (select 1 from aircraft where manufacturer_family in ('717', '737', '737 MAX', '757', 'A220', 'A318', 'A319', 'A320', 'A321')) then 1 else 0 end as narrowbody_debut,
      case when exists (select 1 from aircraft where manufacturer_family = '747') then 1 else 0 end as queen_of_the_skies,
      case when exists (select 1 from aircraft where manufacturer_family = 'A380') then 1 else 0 end as superjumbo_experience,
      case when exists (select 1 from resolved where (departure_continent in ('NA', 'SA') and arrival_continent in ('EU', 'AF')) or (departure_continent in ('EU', 'AF') and arrival_continent in ('NA', 'SA'))) then 1 else 0 end as across_the_atlantic,
      case when exists (select 1 from resolved where (departure_continent in ('AS', 'OC') and arrival_continent in ('NA', 'SA')) or (departure_continent in ('NA', 'SA') and arrival_continent in ('AS', 'OC'))) then 1 else 0 end as across_the_pacific,
      case when exists (select 1 from resolved where scheduled_duration_minutes >= 420) then 1 else 0 end as long_haul_pioneer,
      case when exists (select 1 from resolved where departure_local_date is not null and extract(month from departure_local_date) = 12 and extract(day from departure_local_date) = 31 and departure_local_time is not null and scheduled_duration_minutes is not null and extract(epoch from (departure_local_time - time '00:00')) + scheduled_duration_minutes * 60 >= 86400) then 1 else 0 end as new_year_in_the_sky,
      case when exists (select 1 from route_pairs first_leg join route_pairs return_leg on return_leg.departure_airport_id = first_leg.arrival_airport_id and return_leg.arrival_airport_id = first_leg.departure_airport_id) then 1 else 0 end as round_tripper,
      case when (select total_distance_km from distances) >= 40075 then 1 else 0 end as around_the_world,
      case when exists (select 1 from public.daily_challenge_completions where user_id = p_user_id) then 1 else 0 end as challenge_accepted,
      case when exists (select 1 from public.memorial_participation as participation left join public.flights as flight on flight.id = participation.flight_id and flight.user_id = participation.user_id where participation.user_id = p_user_id and (participation.flight_id is null or flight.status = 'completed')) then 1 else 0 end as first_memorial_flight
  )
  select metric_type, metric_value
  from flags
  cross join lateral (values
    ('special_first_flight', first_flight::numeric),
    ('special_first_international_flight', first_international::numeric),
    ('special_widebody_debut', widebody_debut::numeric),
    ('special_narrowbody_debut', narrowbody_debut::numeric),
    ('special_queen_of_the_skies', queen_of_the_skies::numeric),
    ('special_superjumbo_experience', superjumbo_experience::numeric),
    ('special_across_the_atlantic', across_the_atlantic::numeric),
    ('special_across_the_pacific', across_the_pacific::numeric),
    ('special_around_the_world', around_the_world::numeric),
    ('special_long_haul_pioneer', long_haul_pioneer::numeric),
    ('special_new_year_in_the_sky', new_year_in_the_sky::numeric),
    ('special_first_memorial_flight', first_memorial_flight::numeric),
    ('special_round_tripper', round_tripper::numeric),
    ('special_challenge_accepted', challenge_accepted::numeric)
  ) as metrics(metric_type, metric_value);
$function$;

alter function public.special_achievement_metrics_for_user(uuid) owner to postgres;
revoke all on function public.special_achievement_metrics_for_user(uuid) from public, anon, authenticated, service_role;

create or replace function public.achievement_metrics_for_user(p_user_id uuid)
returns table(metric_type text, metric_value numeric)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select metric_type, metric_value from public.achievement_base_metrics_for_user(p_user_id)
  union all
  select metric_type, metric_value from public.special_achievement_metrics_for_user(p_user_id);
$function$;

alter function public.achievement_metrics_for_user(uuid) owner to postgres;
revoke all on function public.achievement_metrics_for_user(uuid) from public, anon, authenticated, service_role;

-- Reconcile all current users once, preserving their existing history.
create or replace function public.refresh_all_achievements_after_special_badges()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare profile_row record;
begin
  if not public.is_site_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  for profile_row in select id from public.profiles loop
    perform public.refresh_achievements_for_user(profile_row.id);
  end loop;
end;
$function$;

alter function public.refresh_all_achievements_after_special_badges() owner to postgres;
revoke all on function public.refresh_all_achievements_after_special_badges() from public, anon, authenticated;
grant execute on function public.refresh_all_achievements_after_special_badges() to authenticated;

-- Historical completed flights participate immediately. This preserves event
-- history and only derives the current user_achievements state.
do $backfill$
declare
  profile_row record;
begin
  for profile_row in select id from public.profiles loop
    perform public.refresh_achievements_for_user(profile_row.id);
  end loop;
end;
$backfill$;

commit;
