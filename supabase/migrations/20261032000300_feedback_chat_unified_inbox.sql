begin;

create table if not exists public.feedback_conversations (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null unique references public.feedback_submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.feedback_conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_type text not null check (sender_type in ('user', 'admin', 'system')),
  message_type text not null default 'message' check (message_type in ('message', 'feedback', 'status')),
  content text not null check (char_length(btrim(content)) between 1 and 12000),
  created_at timestamptz not null default now()
);

create index if not exists feedback_conversations_user_activity_idx
  on public.feedback_conversations (user_id, status, last_activity_at desc);
create index if not exists feedback_messages_conversation_time_idx
  on public.feedback_messages (conversation_id, created_at, id);

create table if not exists public.inbox_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in ('new_feedback', 'new_message', 'chat_reopened')),
  conversation_id uuid not null references public.feedback_conversations(id) on delete cascade,
  message_id uuid references public.feedback_messages(id) on delete cascade,
  event_key text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_user_id, event_key)
);

create index if not exists inbox_notifications_recipient_idx
  on public.inbox_notifications (recipient_user_id, is_read, created_at desc);

alter table public.feedback_conversations enable row level security;
alter table public.feedback_messages enable row level security;
alter table public.inbox_notifications enable row level security;

drop policy if exists feedback_conversations_read on public.feedback_conversations;
create policy feedback_conversations_read on public.feedback_conversations
for select to authenticated using (user_id = (select auth.uid()) or public.is_site_admin());

drop policy if exists feedback_messages_read on public.feedback_messages;
create policy feedback_messages_read on public.feedback_messages
for select to authenticated using (
  exists (
    select 1 from public.feedback_conversations conversation
    where conversation.id = feedback_messages.conversation_id
      and (conversation.user_id = (select auth.uid()) or public.is_site_admin())
  )
);

drop policy if exists inbox_notifications_read_own on public.inbox_notifications;
create policy inbox_notifications_read_own on public.inbox_notifications
for select to authenticated using (recipient_user_id = (select auth.uid()));
drop policy if exists inbox_notifications_update_own on public.inbox_notifications;
create policy inbox_notifications_update_own on public.inbox_notifications
for update to authenticated using (recipient_user_id = (select auth.uid()))
with check (recipient_user_id = (select auth.uid()));
drop policy if exists inbox_notifications_delete_own on public.inbox_notifications;
create policy inbox_notifications_delete_own on public.inbox_notifications
for delete to authenticated using (recipient_user_id = (select auth.uid()));

revoke all on table public.feedback_conversations, public.feedback_messages, public.inbox_notifications from public, anon;
grant select on public.feedback_conversations, public.feedback_messages, public.inbox_notifications to authenticated;
grant update (is_read, read_at) on public.inbox_notifications to authenticated;
grant delete on public.inbox_notifications to authenticated;

create or replace function public.create_feedback_conversation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare conversation_id uuid;
begin
  insert into public.feedback_conversations (feedback_id, user_id, created_at, updated_at, last_activity_at)
  values (new.id, new.user_id, new.created_at, new.created_at, new.created_at)
  on conflict (feedback_id) do update set updated_at = public.feedback_conversations.updated_at
  returning id into conversation_id;

  insert into public.feedback_messages (conversation_id, sender_id, sender_type, message_type, content, created_at)
  values (
    conversation_id, new.user_id, 'user', 'feedback',
    concat(new.title, E'\n\n', new.description), new.created_at
  )
  on conflict do nothing;
  return new;
end;
$function$;

drop trigger if exists feedback_submissions_create_conversation on public.feedback_submissions;
create trigger feedback_submissions_create_conversation
after insert on public.feedback_submissions
for each row execute function public.create_feedback_conversation();

-- Backfill old submissions without changing or deleting their original records.
insert into public.feedback_conversations (feedback_id, user_id, status, created_at, updated_at, last_activity_at)
select feedback.id, feedback.user_id, 'open', feedback.created_at, feedback.updated_at, feedback.created_at
from public.feedback_submissions feedback
where feedback.user_id is not null
on conflict (feedback_id) do nothing;

insert into public.feedback_messages (conversation_id, sender_id, sender_type, message_type, content, created_at)
select conversation.id, feedback.user_id, 'user', 'feedback',
  concat(feedback.title, E'\n\n', feedback.description), feedback.created_at
from public.feedback_conversations conversation
join public.feedback_submissions feedback on feedback.id = conversation.feedback_id
where not exists (
  select 1 from public.feedback_messages message
  where message.conversation_id = conversation.id and message.message_type = 'feedback'
);

create or replace function public.feedback_message_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare conversation public.feedback_conversations%rowtype;
declare recipient uuid;
declare notification_type text;
declare notification_title text;
begin
  select * into conversation from public.feedback_conversations where id = new.conversation_id;
  update public.feedback_conversations set last_activity_at = new.created_at, updated_at = now() where id = new.conversation_id;

  if new.sender_type = 'user' then
    notification_type := case when new.message_type = 'feedback' then 'new_feedback' else 'new_message' end;
    notification_title := case when new.message_type = 'feedback' then 'New Feedback Received' else 'New Message from User' end;
    for recipient in select user_id from public.roadmap_admins loop
      insert into public.inbox_notifications (recipient_user_id, notification_type, conversation_id, message_id, event_key, title, body)
      values (recipient, notification_type, new.conversation_id, new.id, new.id::text, notification_title, left(new.content, 240))
      on conflict (recipient_user_id, event_key) do nothing;
    end loop;
  elsif new.sender_type = 'admin' then
    insert into public.inbox_notifications (recipient_user_id, notification_type, conversation_id, message_id, event_key, title, body)
    values (conversation.user_id, 'new_message', new.conversation_id, new.id, new.id::text, 'New Message from Flight Desk', left(new.content, 240))
    on conflict (recipient_user_id, event_key) do nothing;
  end if;
  return new;
end;
$function$;

drop trigger if exists feedback_messages_notify on public.feedback_messages;
create trigger feedback_messages_notify
after insert on public.feedback_messages
for each row execute function public.feedback_message_notification();

create or replace function public.feedback_conversation_status_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare admin_id uuid;
begin
  if old.status is distinct from new.status and new.status = 'open' then
    if public.is_site_admin() then
      insert into public.inbox_notifications (recipient_user_id, notification_type, conversation_id, event_key, title, body)
      values (new.user_id, 'chat_reopened', new.id, 'reopened:' || new.id::text || ':' || new.updated_at::text, 'Chat Reopened', 'Your Flight Desk conversation has been reopened.')
      on conflict (recipient_user_id, event_key) do nothing;
    else
      for admin_id in select user_id from public.roadmap_admins loop
        insert into public.inbox_notifications (recipient_user_id, notification_type, conversation_id, event_key, title, body)
        values (admin_id, 'chat_reopened', new.id, 'reopened:' || new.id::text || ':' || new.updated_at::text, 'Chat Reopened', 'A user reopened a Flight Desk conversation.')
        on conflict (recipient_user_id, event_key) do nothing;
      end loop;
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists feedback_conversations_notify_status on public.feedback_conversations;
create trigger feedback_conversations_notify_status
after update of status on public.feedback_conversations
for each row execute function public.feedback_conversation_status_notification();

create or replace function public.send_feedback_message(p_conversation_id uuid, p_content text)
returns public.feedback_messages
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare conversation public.feedback_conversations%rowtype;
declare result public.feedback_messages;
declare sender_kind text;
begin
  if auth.uid() is null or char_length(btrim(coalesce(p_content, ''))) = 0 or char_length(p_content) > 12000 then
    raise exception 'Invalid feedback message' using errcode = '22023';
  end if;
  select * into conversation from public.feedback_conversations where id = p_conversation_id for update;
  if not found or (conversation.user_id <> auth.uid() and not public.is_site_admin()) then
    raise exception 'Conversation not found' using errcode = '42501';
  end if;
  if conversation.status <> 'open' then
    raise exception 'This conversation is closed' using errcode = '55000';
  end if;
  sender_kind := case when public.is_site_admin() then 'admin' else 'user' end;
  insert into public.feedback_messages (conversation_id, sender_id, sender_type, message_type, content)
  values (p_conversation_id, auth.uid(), sender_kind, 'message', btrim(p_content))
  returning * into result;
  return result;
end;
$function$;

create or replace function public.set_feedback_conversation_status(p_conversation_id uuid, p_status text)
returns public.feedback_conversations
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare conversation public.feedback_conversations%rowtype;
begin
  if p_status not in ('open', 'closed') or auth.uid() is null then
    raise exception 'Invalid conversation status' using errcode = '22023';
  end if;
  select * into conversation from public.feedback_conversations where id = p_conversation_id for update;
  if not found or (conversation.user_id <> auth.uid() and not public.is_site_admin()) then
    raise exception 'Conversation not found' using errcode = '42501';
  end if;
  update public.feedback_conversations
  set status = p_status, closed_at = case when p_status = 'closed' then coalesce(closed_at, now()) else null end,
      closed_by = case when p_status = 'closed' then auth.uid() else null end,
      updated_at = now()
  where id = p_conversation_id
  returning * into conversation;
  return conversation;
end;
$function$;

alter function public.send_feedback_message(uuid, text) owner to postgres;
alter function public.set_feedback_conversation_status(uuid, text) owner to postgres;
revoke all on function public.send_feedback_message(uuid, text) from public, anon;
revoke all on function public.set_feedback_conversation_status(uuid, text) from public, anon;
grant execute on function public.send_feedback_message(uuid, text) to authenticated;
grant execute on function public.set_feedback_conversation_status(uuid, text) to authenticated;

do $function$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feedback_messages') then
    alter publication supabase_realtime add table public.feedback_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feedback_conversations') then
    alter publication supabase_realtime add table public.feedback_conversations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inbox_notifications') then
    alter publication supabase_realtime add table public.inbox_notifications;
  end if;
end;
$function$;

commit;
