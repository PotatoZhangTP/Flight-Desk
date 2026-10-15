begin;

-- Initial migration: run once as postgres in Supabase SQL Editor.
-- Future changes belong in separate migrations, not reruns of this file.
create table public.roadmap_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.roadmap_admins owner to postgres;

alter table public.roadmap_admins enable row level security;
revoke all on table public.roadmap_admins from public, anon, authenticated;
grant select on table public.roadmap_admins to authenticated;

create policy roadmap_admins_read_self on public.roadmap_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Only trusted database administrators can assign or revoke membership.
-- Clients cannot insert, update or delete rows in this table.
create function public.is_roadmap_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.roadmap_admins
    where user_id = (select auth.uid())
  );
$$;
alter function public.is_roadmap_admin() owner to postgres;

revoke all on function public.is_roadmap_admin() from public, anon, authenticated;
grant execute on function public.is_roadmap_admin() to authenticated;

create table public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  seed_key text unique,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 5000),
  category text not null default 'Platform'
    check (char_length(btrim(category)) between 1 and 80),
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed', 'on_hold')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published')),
  priority text check (priority in ('low', 'medium', 'high')),
  target_date date,
  completed_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.roadmap_items owner to postgres;

create index roadmap_items_public_order_idx
  on public.roadmap_items (publication_status, sort_order, created_at, id);

create function public.set_roadmap_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
alter function public.set_roadmap_updated_at() owner to postgres;

revoke all on function public.set_roadmap_updated_at() from public, anon, authenticated;
create trigger roadmap_items_updated_at
  before update on public.roadmap_items
  for each row execute function public.set_roadmap_updated_at();

alter table public.roadmap_items enable row level security;
revoke all on table public.roadmap_items from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.roadmap_items to anon, authenticated;
grant insert, update, delete on table public.roadmap_items to authenticated;

create policy roadmap_published_read on public.roadmap_items
  for select to anon, authenticated
  using (publication_status = 'published');

create policy roadmap_admin_read on public.roadmap_items
  for select to authenticated
  using ((select public.is_roadmap_admin()));

create policy roadmap_admin_insert on public.roadmap_items
  for insert to authenticated
  with check ((select public.is_roadmap_admin()));

create policy roadmap_admin_update on public.roadmap_items
  for update to authenticated
  using ((select public.is_roadmap_admin()))
  with check ((select public.is_roadmap_admin()));

create policy roadmap_admin_delete on public.roadmap_items
  for delete to authenticated
  using ((select public.is_roadmap_admin()));

-- Drafts only: review release availability before publishing.
-- Completed means implemented in the current development branch.
-- No release or completion dates are invented.
insert into public.roadmap_items
  (seed_key, title, description, category, status, sort_order, publication_status)
select seed_key, title, description, category, status, sort_order, 'draft'
from (values
  ('accounts', 'User registration and sign in',
   'Email registration, sign in and sign out are implemented in Preview.',
   'Accounts', 'completed', 10),
  ('account-recovery', 'Email verification and password recovery',
   'Verification and recovery flows are implemented; verify the full email round trip before publishing this item.',
   'Accounts', 'in_progress', 20),
  ('private-profile', 'Personal profile and settings',
   'Private profile, editable display name, biography and account settings.',
   'Accounts', 'completed', 30),
  ('manual-flights', 'Manual flight entry',
   'Ticket-style entry with planned local times, IANA timezones and separate actual duration.',
   'Logbook', 'completed', 40),
  ('flight-editing', 'Flight details and editing',
   'View and edit owned records, including aircraft type and registration; implemented in Preview.',
   'Logbook', 'completed', 50),
  ('global-airports', 'Global airport search',
   'Expand the small verified starter dataset into comprehensive ICAO, IATA and name search.',
   'Airports', 'planned', 60),
  ('spreadsheet-import', 'Excel and CSV import',
   'Preview, validate and import historical records into the signed-in account.',
   'Logbook', 'planned', 70),
  ('flight-statistics', 'Flight statistics upgrade',
   'Improve duration aggregation and add reliable airport and country statistics.',
   'Statistics', 'planned', 80),
  ('flight-map', 'Flight map',
   'Visualize recorded routes on a map.',
   'Maps', 'planned', 90),
  ('aircraft-statistics', 'Aircraft statistics',
   'Explore recorded aircraft types and registrations.',
   'Statistics', 'planned', 100),
  ('flight-checklist', 'Flight checklist',
   'Personal checklists for aviation enthusiasts and simulator users.',
   'Tools', 'planned', 110),
  ('mobile-app', 'Mobile app',
   'Explore a dedicated mobile experience; no release date is committed.',
   'Platform', 'planned', 120),
  ('public-profile', 'Public aviation profile',
   'Optional public sharing with explicit privacy controls; current profiles remain private.',
   'Accounts', 'planned', 130)
) as seeds(seed_key, title, description, category, status, sort_order);

commit;
