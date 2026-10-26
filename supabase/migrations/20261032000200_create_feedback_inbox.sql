begin;

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  submitter_email text,
  type text not null check (type in ('feature', 'bug')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null check (char_length(btrim(description)) between 1 and 12000),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  is_read boolean not null default false,
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  environment_info jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_submissions_created_idx
  on public.feedback_submissions (created_at desc);
create index if not exists feedback_submissions_inbox_idx
  on public.feedback_submissions (is_read, archived_at, created_at desc);

alter table public.feedback_submissions enable row level security;

create or replace function public.enforce_feedback_submission_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null then
      raise exception 'Authentication is required to submit feedback' using errcode = '42501';
    end if;
    new.user_id := auth.uid();
    new.submitter_email := nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), '');
    new.status := 'new';
    new.is_read := false;
    new.archived_at := null;
  elsif not public.is_site_admin() then
    if old.user_id is distinct from auth.uid()
      or new.user_id is distinct from old.user_id
      or new.submitter_email is distinct from old.submitter_email
      or new.status is distinct from old.status
      or new.is_read is distinct from old.is_read
      or new.archived_at is distinct from old.archived_at
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Only administrators can change feedback management fields' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists feedback_submissions_enforce_fields on public.feedback_submissions;
create trigger feedback_submissions_enforce_fields
before insert or update on public.feedback_submissions
for each row execute function public.enforce_feedback_submission_fields();

drop policy if exists feedback_submissions_owner_read on public.feedback_submissions;
create policy feedback_submissions_owner_read on public.feedback_submissions
for select to authenticated using ((select auth.uid()) = user_id or public.is_site_admin());
drop policy if exists feedback_submissions_owner_insert on public.feedback_submissions;
create policy feedback_submissions_owner_insert on public.feedback_submissions
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists feedback_submissions_owner_update on public.feedback_submissions;
create policy feedback_submissions_owner_update on public.feedback_submissions
for update to authenticated using ((select auth.uid()) = user_id or public.is_site_admin())
with check ((select auth.uid()) = user_id or public.is_site_admin());
drop policy if exists feedback_submissions_admin_delete on public.feedback_submissions;
create policy feedback_submissions_admin_delete on public.feedback_submissions
for delete to authenticated using (public.is_site_admin());

grant select, insert, update on public.feedback_submissions to authenticated;
revoke delete on public.feedback_submissions from authenticated;

insert into storage.buckets (id, name, public)
values ('feedback-attachments', 'feedback-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists feedback_attachments_owner_read on storage.objects;
create policy feedback_attachments_owner_read on storage.objects
for select to authenticated using (
  bucket_id = 'feedback-attachments'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_site_admin())
);
drop policy if exists feedback_attachments_owner_insert on storage.objects;
create policy feedback_attachments_owner_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'feedback-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists feedback_attachments_owner_update on storage.objects;
create policy feedback_attachments_owner_update on storage.objects
for update to authenticated using (
  bucket_id = 'feedback-attachments'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_site_admin())
) with check (
  bucket_id = 'feedback-attachments'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_site_admin())
);
drop policy if exists feedback_attachments_owner_delete on storage.objects;
create policy feedback_attachments_owner_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'feedback-attachments'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_site_admin())
);

commit;
