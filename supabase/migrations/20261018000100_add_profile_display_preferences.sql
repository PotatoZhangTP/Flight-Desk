-- REVIEW ONLY: execute manually after approval. No production migration is run by the app.
begin;
alter table public.profiles add column date_format text default 'MM/DD/YYYY'
  constraint profiles_date_format_check check (date_format in ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'));
alter table public.profiles add column distance_unit text default 'km'
  constraint profiles_distance_unit_check check (distance_unit in ('km', 'mi', 'nm'));
alter table public.profiles add column time_format text default '12h'
  constraint profiles_time_format_check check (time_format in ('12h', '24h'));
commit;
