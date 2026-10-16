-- REVIEW ONLY: run manually in Supabase SQL Editor after approval.
-- Reuses public.is_site_admin(); no existing business-table policies change.
begin;
create table public.translation_overrides (
  locale text not null check (locale in ('en', 'zh-CN')),
  translation_key text not null check (char_length(translation_key) <= 160 and translation_key ~ '^[a-z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$'),
  translation_text text not null check (char_length(btrim(translation_text)) between 1 and 4000 and translation_text !~ '[<>]'),
  is_published boolean not null default true,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (locale, translation_key)
);
alter table public.translation_overrides owner to postgres;
alter table public.translation_overrides enable row level security;
revoke all on public.translation_overrides from public, anon, authenticated;
grant select on public.translation_overrides to anon, authenticated;
grant insert, update, delete on public.translation_overrides to authenticated;

create policy translation_public_read on public.translation_overrides
  for select to anon, authenticated using (is_published);
create policy translation_admin_read on public.translation_overrides
  for select to authenticated using ((select public.is_site_admin()));
create policy translation_admin_insert on public.translation_overrides
  for insert to authenticated with check ((select public.is_site_admin()));
create policy translation_admin_update on public.translation_overrides
  for update to authenticated using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));
create policy translation_admin_delete on public.translation_overrides
  for delete to authenticated using ((select public.is_site_admin()));

create function public.set_translation_override_metadata()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.created_at := old.created_at;
  new.updated_at := pg_catalog.clock_timestamp();
  new.version := old.version + 1;
  return new;
end;
$$;
alter function public.set_translation_override_metadata() owner to postgres;
revoke all on function public.set_translation_override_metadata() from public, anon, authenticated;
create trigger translation_override_metadata before update on public.translation_overrides
  for each row execute function public.set_translation_override_metadata();
commit;
