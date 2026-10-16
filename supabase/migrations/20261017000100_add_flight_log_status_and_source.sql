alter table public.flights
  add column if not exists status text not null default 'completed',
  add column if not exists source text not null default 'manual',
  add column if not exists is_user_modified boolean not null default false;

update public.flights set status = 'completed' where status is null;
update public.flights set source = 'manual' where source is null;
update public.flights set is_user_modified = false where is_user_modified is null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'flights_status_check') then
    alter table public.flights add constraint flights_status_check check (status in ('planned', 'completed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'flights_source_check') then
    alter table public.flights add constraint flights_source_check check (source in ('manual', 'simbrief'));
  end if;
end $$;

create index if not exists flights_user_status_date_idx on public.flights (user_id, status, flight_date desc);
