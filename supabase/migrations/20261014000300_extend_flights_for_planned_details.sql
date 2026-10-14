alter table public.flights
  add column if not exists departure_airport_iata text,
  add column if not exists departure_airport_icao text,
  add column if not exists departure_airport_name text,
  add column if not exists departure_country_code text,
  add column if not exists departure_timezone text,
  add column if not exists departure_local_date date,
  add column if not exists departure_local_time time,
  add column if not exists departure_terminal text,
  add column if not exists departure_gate text,
  add column if not exists departure_scheduled_at_utc timestamptz,
  add column if not exists arrival_airport_iata text,
  add column if not exists arrival_airport_icao text,
  add column if not exists arrival_airport_name text,
  add column if not exists arrival_country_code text,
  add column if not exists arrival_timezone text,
  add column if not exists arrival_local_date date,
  add column if not exists arrival_local_time time,
  add column if not exists arrival_terminal text,
  add column if not exists arrival_gate text,
  add column if not exists arrival_scheduled_at_utc timestamptz,
  add column if not exists scheduled_duration_minutes integer,
  add column if not exists actual_duration_minutes integer,
  add column if not exists airline text;

alter table public.flights
  add constraint flights_scheduled_duration_check
    check (scheduled_duration_minutes is null or scheduled_duration_minutes >= 0),
  add constraint flights_actual_duration_check
    check (actual_duration_minutes is null or actual_duration_minutes >= 0);

create index if not exists flights_user_scheduled_at_idx
  on public.flights (user_id, departure_scheduled_at_utc desc);
