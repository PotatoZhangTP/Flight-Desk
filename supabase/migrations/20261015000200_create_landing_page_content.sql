begin;

-- Run this initial migration once as postgres in Supabase SQL Editor.
-- Reuse existing membership; do not rename/drop roadmap_admins or alter its RLS.
create function public.is_site_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.is_roadmap_admin();
$$;
alter function public.is_site_admin() owner to postgres;
revoke all on function public.is_site_admin() from public, anon, authenticated;
grant execute on function public.is_site_admin() to authenticated;

create table public.site_content (
  content_key text not null
    check (char_length(content_key) <= 120
      and content_key ~ '^landing\.[a-z0-9_]+(\.[a-z0-9_]+)*$'),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published')),
  content text not null default '' check (char_length(content) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (content_key, publication_status)
);
alter table public.site_content owner to postgres;
alter table public.site_content enable row level security;

create index site_content_publication_idx
  on public.site_content (publication_status, content_key);

revoke all on table public.site_content from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.site_content to anon, authenticated;
grant insert, update, delete on table public.site_content to authenticated;

create policy site_content_published_read on public.site_content
  for select to anon, authenticated
  using (publication_status = 'published');

create policy site_content_admin_read on public.site_content
  for select to authenticated
  using ((select public.is_site_admin()));

create policy site_content_admin_insert on public.site_content
  for insert to authenticated
  with check ((select public.is_site_admin()));

create policy site_content_admin_update on public.site_content
  for update to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

create policy site_content_admin_delete on public.site_content
  for delete to authenticated
  using ((select public.is_site_admin()));

create function public.set_site_content_updated_at()
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
alter function public.set_site_content_updated_at() owner to postgres;
revoke all on function public.set_site_content_updated_at() from public, anon, authenticated;

create trigger site_content_updated_at
  before update on public.site_content
  for each row execute function public.set_site_content_updated_at();

-- Publish only the saved landing-page drafts, atomically, under caller RLS.
-- No user ID or administrator flag can be supplied by the client.
create function public.publish_landing_page()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed_rows integer;
begin
  if not coalesce(public.is_site_admin(), false) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  insert into public.site_content as live
    (content_key, publication_status, content)
  select draft.content_key, 'published', draft.content
  from public.site_content as draft
  where draft.publication_status = 'draft'
    and draft.content_key like 'landing.%'
  on conflict (content_key, publication_status)
  do update set content = excluded.content
  where live.content is distinct from excluded.content;

  get diagnostics changed_rows = row_count;
  return changed_rows;
end;
$$;
alter function public.publish_landing_page() owner to postgres;
revoke all on function public.publish_landing_page() from public, anon, authenticated;
grant execute on function public.publish_landing_page() to authenticated;

-- Current copy is initialized in BOTH slots, preserving the existing public page.
-- No HTML, routes, credentials or Roadmap items are stored as content.
-- ON CONFLICT never overwrites later administrator edits.
with initial_content(content_key, content) as (
  values
    ('landing.hero.eyebrow', 'For everyone who looks up.'),
    ('landing.hero.title', E'Your Flying,\nClearly Logged.'),
    ('landing.hero.description', 'A personal home for your flying history. Capture the journeys, aircraft and memories that make you love aviation.'),
    ('landing.hero.primary_label', 'Open your logbook'),
    ('landing.hero.secondary_label', 'Explore Flight Desk'),
    ('landing.features.eyebrow', 'A clearer view of your flying'),
    ('landing.features.title', E'Keep the details.\nEnjoy the bigger picture.'),
    ('landing.features.description', 'A thoughtful place to record your flights, without getting in the way of the experience.'),
    ('landing.features.logbook.title', 'Every flight, in one place'),
    ('landing.features.logbook.description', 'A personal logbook for the routes, aircraft and details you want to remember.'),
    ('landing.features.timezones.title', 'Local times. Global perspective.'),
    ('landing.features.timezones.description', 'Keep each journey’s local times and timezones together, wherever you fly.'),
    ('landing.features.privacy.title', 'Private by default'),
    ('landing.features.privacy.description', 'Your flight records belong to your account. Your personal history stays private.'),
    ('landing.features.enthusiasts.title', 'For the love of aviation'),
    ('landing.features.enthusiasts.description', 'Built for enthusiasts who notice the aircraft, remember the airports and enjoy the journey.'),
    ('landing.roadmap.eyebrow', 'Our flight plan'),
    ('landing.roadmap.title', 'Building the Next Journey'),
    ('landing.roadmap.description', 'What’s ready, what’s taking shape, and what’s next.'),
    ('landing.roadmap.link_label', 'View Full Roadmap'),
    ('landing.why.eyebrow', 'Why Flight Desk'),
    ('landing.why.title', E'A logbook today.\nMore possibilities ahead.'),
    ('landing.why.description', 'Start with your flight history. Follow along as Flight Desk grows into a broader home for aviation enthusiasts.'),
    ('landing.why.link_label', 'Follow the product roadmap'),
    ('landing.why.logbook.title', 'Flight logbook'),
    ('landing.why.logbook.description', 'Add, revisit and edit the details of your journeys.'),
    ('landing.why.logbook.status_label', 'Available'),
    ('landing.why.aircraft.title', 'Aircraft records'),
    ('landing.why.aircraft.description', 'Keep aircraft types and registrations alongside your flights.'),
    ('landing.why.aircraft.status_label', 'Available'),
    ('landing.why.airports.title', 'Airport data'),
    ('landing.why.airports.description', 'A verified starting collection, with global airport search planned.'),
    ('landing.why.airports.status_label', 'Starter dataset'),
    ('landing.why.checklists.title', 'Flight checklists'),
    ('landing.why.checklists.description', 'A future toolkit for aviation enthusiasts and simulator pilots.'),
    ('landing.why.checklists.status_label', 'Planned'),
    ('landing.why.maps.title', 'Maps & statistics'),
    ('landing.why.maps.description', 'Basic statistics today. Richer insights and route maps are on the flight plan.'),
    ('landing.why.maps.status_label', 'Expansion planned'),
    ('landing.why.mobile.title', 'Mobile experience'),
    ('landing.why.mobile.description', 'A dedicated app is a future direction, without a committed release date.'),
    ('landing.why.mobile.status_label', 'Planned'),
    ('landing.footer.tagline', 'For the love of the journey.'),
    ('landing.footer.link_label', 'Product roadmap'),
    ('landing.footer.copyright', '')
)
insert into public.site_content (content_key, publication_status, content)
select initial_content.content_key, visibility.publication_status, initial_content.content
from initial_content
cross join (values ('draft'), ('published')) as visibility(publication_status)
on conflict (content_key, publication_status) do nothing;

commit;
