-- Run manually in Supabase SQL Editor as postgres after review.
-- All IDs, content, publication states, dates and RLS permissions are preserved.
-- The existing UPDATE trigger refreshes updated_at for converted rows.
begin;

lock table public.roadmap_items in share row exclusive mode;

update public.roadmap_items
set status = 'planned'
where status = 'in_progress';

alter table public.roadmap_items
  drop constraint if exists roadmap_items_status_check;

alter table public.roadmap_items
  add constraint roadmap_items_status_check
  check (status in ('planned', 'completed', 'on_hold'));

commit;
