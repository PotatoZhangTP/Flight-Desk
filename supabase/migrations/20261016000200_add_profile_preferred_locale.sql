-- REVIEW ONLY: optional account synchronization, execute manually after approval.
-- No backfill, no Auth trigger changes, no policy or privilege changes.
begin;
alter table public.profiles add column preferred_locale text
  constraint profiles_preferred_locale_check check (preferred_locale in ('en', 'zh-CN'));
comment on column public.profiles.preferred_locale is
  'Optional interface language. NULL uses browser preference or English. Existing own-profile RLS applies.';
commit;
