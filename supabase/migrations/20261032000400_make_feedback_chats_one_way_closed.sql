begin;

create or replace function public.set_feedback_conversation_status(
  p_conversation_id uuid,
  p_status text
)
returns public.feedback_conversations
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  conversation public.feedback_conversations%rowtype;
begin
  if p_status <> 'closed' or auth.uid() is null then
    raise exception 'A conversation can only be closed once'
      using errcode = '22023';
  end if;

  select *
  into conversation
  from public.feedback_conversations
  where id = p_conversation_id
  for update;

  if not found
     or (
       conversation.user_id <> auth.uid()
       and not public.is_site_admin()
     )
  then
    raise exception 'Conversation not found'
      using errcode = '42501';
  end if;

  if conversation.status = 'closed' then
    raise exception 'This conversation is already closed'
      using errcode = '55000';
  end if;

  update public.feedback_conversations
  set
    status = 'closed',
    closed_at = now(),
    closed_by = auth.uid(),
    updated_at = now()
  where id = p_conversation_id
  returning * into conversation;

  return conversation;
end;
$function$;

alter function public.set_feedback_conversation_status(uuid, text)
owner to postgres;

revoke all on function public.set_feedback_conversation_status(uuid, text)
from public, anon;

grant execute on function public.set_feedback_conversation_status(uuid, text)
to authenticated;

commit;
