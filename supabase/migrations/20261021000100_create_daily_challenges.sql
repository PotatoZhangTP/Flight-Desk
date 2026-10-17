begin;

create table if not exists public.challenge_routes (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('quick','regional','medium','long')),
  departure_iata text not null check (departure_iata ~ '^[A-Z]{3}$'),
  departure_icao text not null check (departure_icao ~ '^[A-Z]{4}$'),
  arrival_iata text not null check (arrival_iata ~ '^[A-Z]{3}$'),
  arrival_icao text not null check (arrival_icao ~ '^[A-Z]{4}$'),
  departure_name text not null,
  arrival_name text not null,
  estimated_minutes integer not null check (estimated_minutes > 0),
  distance_km integer not null check (distance_km > 0),
  suggested_aircraft text,
  about text not null,
  source_note text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (departure_icao, arrival_icao)
);

create table if not exists public.daily_challenges (
  challenge_date date not null,
  category text not null check (category in ('quick','regional','medium','long')),
  route_id uuid not null references public.challenge_routes(id),
  departure_iata text not null,
  departure_icao text not null,
  arrival_iata text not null,
  arrival_icao text not null,
  departure_name text not null,
  arrival_name text not null,
  estimated_minutes integer not null,
  distance_km integer not null,
  suggested_aircraft text,
  about text not null,
  created_at timestamptz not null default now(),
  primary key (challenge_date, category)
);

create table if not exists public.memorial_events (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_zh text not null,
  description_en text not null,
  description_zh text not null,
  event_year integer not null check (event_year between 1900 and 2200),
  event_month integer not null check (event_month between 1 and 12),
  event_day integer not null check (event_day between 1 and 31),
  recurring boolean not null default true,
  departure_iata text not null,
  departure_icao text not null,
  arrival_iata text not null,
  arrival_icao text not null,
  suggested_aircraft text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.memorial_participation (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.memorial_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  flight_id uuid references public.flights(id) on delete set null,
  marked_at timestamptz not null default now(),
  unique (event_id, user_id)
);

insert into public.challenge_routes (category, departure_iata, departure_icao, arrival_iata, arrival_icao, departure_name, arrival_name, estimated_minutes, distance_km, suggested_aircraft, about, source_note)
values
 ('quick','LHR','EGLL','CDG','LFPG','London Heathrow','Paris Charles de Gaulle',75,'344','A320','A classic short European connection between two major hubs.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('quick','HND','RJTT','KIX','RJBB','Tokyo Haneda','Kansai International',80,'431','A320','A compact domestic Japan route with a strong airport-to-airport briefing.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('quick','SFO','KSFO','LAX','KLAX','San Francisco International','Los Angeles International',80,'543','A320','A familiar California hop suitable for a short session.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('regional','PEK','ZBAA','PVG','ZSPD','Beijing Capital','Shanghai Pudong',145,'1085','A321','A major domestic China trunk route between two large hubs.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('regional','AMS','EHAM','MAD','LEMD','Amsterdam Schiphol','Madrid Barajas',160,'1480','A320','A practical European regional flight with varied airspace and scenery.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('regional','JFK','KJFK','MIA','KMIA','John F. Kennedy International','Miami International',175,'1758','A321','A dependable US domestic route for a longer evening flight.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('medium','DXB','OMDB','LHR','EGLL','Dubai International','London Heathrow',420,'5500','B777','A flagship intercontinental corridor linking Europe and the Gulf.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('medium','SIN','WSSS','NRT','RJAA','Singapore Changi','Narita International',390,'5360','B787','A representative Asia-Pacific medium-haul operation.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('medium','JNB','FAOR','DOH','OTHH','O. R. Tambo International','Hamad International',510,'6200','A350','A substantial southern Africa to Gulf connection.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('long','LAX','KLAX','SYD','YSSY','Los Angeles International','Sydney Kingsford Smith',870,'12070','A350','A classic trans-Pacific long-haul assignment.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('long','JFK','KJFK','SIN','WSSS','John F. Kennedy International','Singapore Changi',1110,'15350','A350','One of the world’s defining ultra-long-haul city pairs.','Curated V1 route; airport and distance references reviewed 2026-10-17.'),
 ('long','LHR','EGLL','HND','RJTT','London Heathrow','Tokyo Haneda',750,'9560','B787','A classic Europe-to-Japan long-haul route.','Curated V1 route; airport and distance references reviewed 2026-10-17.')
on conflict (departure_icao, arrival_icao) do nothing;

insert into public.memorial_events (title_en,title_zh,description_en,description_zh,event_year,event_month,event_day,recurring,departure_iata,departure_icao,arrival_iata,arrival_icao,suggested_aircraft)
values ('Remembering MH370','纪念 MH370','In remembrance of the 239 people aboard Malaysia Airlines Flight MH370.','谨此纪念马来西亚航空 MH370 航班上的 239 位乘客与机组人员。',2014,3,8,true,'KUL','WMKK','PEK','ZBAA','B777')
on conflict do nothing;

create or replace function public.ensure_daily_challenges(p_date date default (timezone('utc', now()))::date)
returns void language plpgsql security definer set search_path = public as $$
declare c text; r public.challenge_routes; offset_value integer;
begin
  foreach c in array array['quick','regional','medium','long'] loop
    if exists (select 1 from public.daily_challenges where challenge_date=p_date and category=c) then continue; end if;
    select count(*) into offset_value from public.daily_challenges d where d.category=c and d.challenge_date >= p_date - 30;
    select * into r from public.challenge_routes where category=c and enabled order by id offset (extract(day from p_date)::integer + offset_value) % greatest(1,(select count(*) from public.challenge_routes where category=c and enabled)) limit 1;
    if r.id is not null then
      insert into public.daily_challenges (challenge_date,category,route_id,departure_iata,departure_icao,arrival_iata,arrival_icao,departure_name,arrival_name,estimated_minutes,distance_km,suggested_aircraft,about)
      values (p_date,c,r.id,r.departure_iata,r.departure_icao,r.arrival_iata,r.arrival_icao,r.departure_name,r.arrival_name,r.estimated_minutes,r.distance_km,r.suggested_aircraft,r.about)
      on conflict do nothing;
    end if;
  end loop;
end; $$;
alter function public.ensure_daily_challenges(date) owner to postgres;
revoke all on function public.ensure_daily_challenges(date) from public, anon, authenticated;
grant execute on function public.ensure_daily_challenges(date) to authenticated;

alter table public.challenge_routes enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.memorial_events enable row level security;
alter table public.memorial_participation enable row level security;
create policy challenge_routes_read on public.challenge_routes for select to authenticated using (enabled);
create policy daily_challenges_read on public.daily_challenges for select to authenticated using (true);
create policy memorial_events_read on public.memorial_events for select to authenticated using (enabled);
create policy memorial_participation_own on public.memorial_participation for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

commit;
