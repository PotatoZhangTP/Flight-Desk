-- REVIEW ONLY. Execute manually as postgres after review, never on deployment.
-- Requires the existing roadmap_items and is_site_admin(). No paid calls/backfill.
begin;

create table public.content_translation_locales (
  locale text primary key check (locale <> 'en' and locale ~ '^[a-z]{2}(-[A-Za-z0-9]{2,8})*$'),
  provider_code text not null check (provider_code ~ '^[A-Z]{2,3}(-[A-Z]{2,4})?$'),
  enabled boolean not null default true
);
insert into public.content_translation_locales values ('zh-CN', 'ZH', true);

create table public.content_translation_limits (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  daily_char_limit integer not null default 20000 check (daily_char_limit between 0 and 10000000),
  daily_request_limit integer not null default 100 check (daily_request_limit between 0 and 100000),
  max_attempts integer not null default 4 check (max_attempts between 1 and 6)
);
insert into public.content_translation_limits(singleton) values(true);

create table public.content_translations (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type ~ '^[a-z][a-z0-9_]{0,39}$'),
  entity_id text not null check (char_length(entity_id) between 1 and 160),
  field_name text not null check (field_name ~ '^[a-z][a-z0-9_]{0,39}$'),
  locale text not null references public.content_translation_locales(locale),
  source_text text not null check (char_length(source_text) <= 5000),
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  translated_source_hash text check (translated_source_hash ~ '^[a-f0-9]{64}$'),
  translated_text text check (char_length(translated_text) <= 12000 and translated_text !~ '[<>]'),
  translation_source text not null default 'auto' check (translation_source in ('auto','manual')),
  translation_status text not null default 'pending' check (translation_status in ('pending','completed','failed','outdated')),
  generation uuid not null default gen_random_uuid(),
  error_code text check (error_code ~ '^[a-z0-9_]{1,80}$'),
  translated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(entity_type, entity_id, field_name, locale)
);
create index content_translations_entity_idx on public.content_translations(entity_type,entity_id);
create index content_translations_reuse_idx on public.content_translations(locale,source_hash)
  where translation_source='auto' and translation_status='completed';

create table public.content_translation_jobs (
  id uuid primary key default gen_random_uuid(),
  translation_id uuid not null references public.content_translations(id) on delete cascade,
  generation uuid not null,
  source_text text not null,
  source_hash text not null,
  force_refresh boolean not null default false,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  attempts integer not null default 0 check (attempts between 0 and 6),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  reserved_lease_token uuid,
  reserved_characters integer,
  reserved_day date,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(translation_id,generation)
);
create index content_translation_jobs_due_idx on public.content_translation_jobs(next_attempt_at,created_at)
  where status in ('queued','running');
create table public.content_translation_usage (
  usage_day date primary key,
  requests_reserved integer not null default 0,
  characters_reserved bigint not null default 0,
  responses_ok integer not null default 0,
  responses_failed integer not null default 0
);

alter table public.content_translation_locales enable row level security;
alter table public.content_translation_limits enable row level security;
alter table public.content_translations enable row level security;
alter table public.content_translation_jobs enable row level security;
alter table public.content_translation_usage enable row level security;
revoke all on public.content_translation_locales, public.content_translation_limits, public.content_translations,
  public.content_translation_jobs, public.content_translation_usage from public, anon, authenticated;
grant select on public.content_translations to anon, authenticated;
grant select on public.content_translation_locales, public.content_translation_limits,
  public.content_translation_jobs, public.content_translation_usage to authenticated;
create policy content_translations_published_read on public.content_translations for select to anon,authenticated
  using (entity_type='roadmap' and exists (select 1 from public.roadmap_items r where r.id::text=entity_id and r.publication_status='published'));
create policy content_translations_admin_read on public.content_translations for select to authenticated using ((select public.is_site_admin()));
create policy content_translation_locales_admin_read on public.content_translation_locales for select to authenticated using ((select public.is_site_admin()));
create policy content_translation_limits_admin_read on public.content_translation_limits for select to authenticated using ((select public.is_site_admin()));
create policy content_translation_jobs_admin_read on public.content_translation_jobs for select to authenticated using ((select public.is_site_admin()));
create policy content_translation_usage_admin_read on public.content_translation_usage for select to authenticated using ((select public.is_site_admin()));

create function public.content_source_hash(p_source text) returns text language sql immutable
set search_path='' as $$ select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_source,'UTF8')),'hex'); $$;

-- Adapter boundary: only Roadmap is supported now. Future entity adapters extend
-- this function, source synchronization and deletion trigger, not the table shape.
create function public.lock_content_source(p_entity_type text,p_entity_id text,p_field text)
returns text language plpgsql security definer set search_path='' as $$
declare r public.roadmap_items;
begin
  if p_entity_type <> 'roadmap' or p_field not in ('title','description','category')
    or p_entity_id !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then
    raise exception 'Unsupported content reference' using errcode='22023';
  end if;
  select * into r from public.roadmap_items where id=p_entity_id::uuid for update;
  if not found then raise exception 'Content not found' using errcode='P0002'; end if;
  return case p_field when 'title' then r.title when 'description' then r.description else r.category end;
end; $$;

create function public.validate_content_translation_reference() returns trigger
language plpgsql security definer set search_path='' as $$
declare source text;
begin
  source := public.lock_content_source(new.entity_type,new.entity_id,new.field_name);
  new.entity_id := new.entity_id::uuid::text;
  if new.source_text is distinct from source or new.source_hash <> public.content_source_hash(source) then
    raise exception 'Source version conflict' using errcode='40001';
  end if;
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end; $$;
create trigger validate_content_translation_reference before insert or update on public.content_translations
  for each row execute function public.validate_content_translation_reference();

create function public.sync_roadmap_translations(p_id uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare f text; l record; source text; hash text; t public.content_translations; changed integer:=0;
begin
  -- All mutations lock source -> translation -> job, in that order.
  perform 1 from public.roadmap_items where id=p_id for update;
  if not found then return 0; end if;
  foreach f in array array['title','description','category'] loop
    source := public.lock_content_source('roadmap',p_id::text,f);
    hash := public.content_source_hash(source);
    for l in select locale from public.content_translation_locales where enabled loop
      select * into t from public.content_translations where entity_type='roadmap' and entity_id=p_id::text and field_name=f and locale=l.locale for update;
      if found and t.source_hash=hash then continue; end if;
      if t.id is null then
        insert into public.content_translations(entity_type,entity_id,field_name,locale,source_text,source_hash,translation_status,translated_text,translated_source_hash)
        values('roadmap',p_id::text,f,l.locale,source,hash,case when source='' then 'completed' else 'pending' end,
          case when source='' then '' else null end,case when source='' then hash else null end) returning * into t;
      else
        update public.content_translations set source_text=source,source_hash=hash,generation=gen_random_uuid(),error_code=null,
          translation_status=case when translation_source='manual' then 'outdated' when source='' then 'completed' else 'outdated' end,
          translated_text=case when source='' and translation_source='auto' then '' else translated_text end,
          translated_source_hash=case when source='' and translation_source='auto' then hash else translated_source_hash end
        where id=t.id returning * into t;
      end if;
      update public.content_translation_jobs set status='cancelled',updated_at=now() where translation_id=t.id and status in ('queued','running');
      if t.translation_source='auto' and source<>'' then
        insert into public.content_translation_jobs(translation_id,generation,source_text,source_hash) values(t.id,t.generation,source,hash)
        on conflict(translation_id,generation) do nothing;
      end if;
      changed:=changed+1;
      t:=null;
    end loop;
  end loop;
  return changed;
end; $$;

create function public.roadmap_translation_outbox() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then
    delete from public.content_translations where entity_type='roadmap' and entity_id=old.id::text;
    return old;
  end if;
  perform public.sync_roadmap_translations(new.id);
  return new;
end; $$;
create trigger roadmap_translation_outbox after insert or update of title,description,category on public.roadmap_items
  for each row execute function public.roadmap_translation_outbox();
create trigger roadmap_translation_cleanup after delete on public.roadmap_items
  for each row execute function public.roadmap_translation_outbox();

create function public.get_public_content_translations(p_entity_ids text[],p_locale text default 'zh-CN')
returns setof public.content_translations language sql stable security invoker set search_path='' as $$
  select t.* from public.content_translations t join public.roadmap_items r on r.id::text=t.entity_id
  where t.entity_type='roadmap' and t.locale=p_locale and r.publication_status='published'
    and t.entity_id=any(array(select lower(value) from unnest(p_entity_ids) value)) and cardinality(p_entity_ids)<=100;
$$;

create function public.edit_content_translation(p_entity_id text,p_field text,p_locale text,p_text text,p_expected_source text,p_expected_generation uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare source text; t public.content_translations;
begin
  if not coalesce(public.is_site_admin(),false) then raise exception 'Administrator access required' using errcode='42501'; end if;
  source:=public.lock_content_source('roadmap',p_entity_id,p_field);
  p_entity_id:=p_entity_id::uuid::text;
  if source is distinct from p_expected_source then raise exception 'Source version conflict' using errcode='40001'; end if;
  if p_text is null or char_length(p_text)>12000 or p_text ~ '[<>]' or (source<>'' and btrim(p_text)='')
    or not exists(select 1 from public.content_translation_locales where locale=p_locale and enabled) then
    raise exception 'Invalid translation' using errcode='22023';
  end if;
  select * into t from public.content_translations where entity_type='roadmap' and entity_id=p_entity_id and field_name=p_field and locale=p_locale for update;
  if (t.generation is distinct from p_expected_generation) then raise exception 'Translation version conflict' using errcode='40001'; end if;
  insert into public.content_translations(entity_type,entity_id,field_name,locale,source_text,source_hash,translated_source_hash,translated_text,translation_source,translation_status,translated_at)
    values('roadmap',p_entity_id,p_field,p_locale,source,public.content_source_hash(source),public.content_source_hash(source),p_text,'manual','completed',now())
  on conflict(entity_type,entity_id,field_name,locale) do update set translated_text=excluded.translated_text,
    translation_source='manual',translation_status='completed',translated_source_hash=excluded.translated_source_hash,
    generation=gen_random_uuid(),translated_at=now(),error_code=null
  returning * into t;
  update public.content_translation_jobs set status='cancelled',updated_at=now() where translation_id=t.id and status in ('queued','running');
  return t.generation;
end; $$;

create function public.regenerate_content_translation(p_entity_id text,p_field text,p_locale text,p_expected_source text,p_expected_generation uuid,p_confirm_manual boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare source text; t public.content_translations;
begin
  if not coalesce(public.is_site_admin(),false) then raise exception 'Administrator access required' using errcode='42501'; end if;
  source:=public.lock_content_source('roadmap',p_entity_id,p_field);
  p_entity_id:=p_entity_id::uuid::text;
  if source is distinct from p_expected_source then raise exception 'Source version conflict' using errcode='40001'; end if;
  select * into t from public.content_translations where entity_type='roadmap' and entity_id=p_entity_id and field_name=p_field and locale=p_locale for update;
  if t.generation is distinct from p_expected_generation then raise exception 'Translation version conflict' using errcode='40001'; end if;
  if not exists(select 1 from public.content_translation_locales where locale=p_locale and enabled) then raise exception 'Unsupported locale' using errcode='22023'; end if;
  if t.id is null then
    insert into public.content_translations(entity_type,entity_id,field_name,locale,source_text,source_hash)
      values('roadmap',p_entity_id,p_field,p_locale,source,public.content_source_hash(source)) returning * into t;
  end if;
  -- Missing fields can accept NULL; existing rows require an exact fence.
  if p_expected_generation is not null and t.generation<>p_expected_generation then raise exception 'Translation version conflict' using errcode='40001'; end if;
  if p_expected_generation is null and t.translation_source='manual' then raise exception 'Translation version conflict' using errcode='40001'; end if;
  if t.translation_source='manual' and p_confirm_manual is distinct from true then raise exception 'Manual confirmation required' using errcode='42501'; end if;
  update public.content_translations set translation_source='auto',translation_status=case when source='' then 'completed' else 'pending' end,
    source_text=source,source_hash=public.content_source_hash(source),generation=gen_random_uuid(),error_code=null,
    translated_text=case when source='' then '' else translated_text end,
    translated_source_hash=case when source='' then public.content_source_hash(source) else translated_source_hash end
    where id=t.id returning * into t;
  update public.content_translation_jobs set status='cancelled',updated_at=now() where translation_id=t.id and status in ('queued','running');
  if source<>'' then insert into public.content_translation_jobs(translation_id,generation,source_text,source_hash,force_refresh) values(t.id,t.generation,source,t.source_hash,true); end if;
  return t.generation;
end; $$;

create function public.backfill_content_translations(p_after_id uuid default null,p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r record; count integer:=0; changed integer:=0; last_id uuid;
begin
  if not coalesce(public.is_site_admin(),false) then raise exception 'Administrator access required' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 25 then raise exception 'Invalid batch size' using errcode='22023'; end if;
  for r in select id from public.roadmap_items where p_after_id is null or id>p_after_id order by id limit p_limit loop
    changed:=changed+public.sync_roadmap_translations(r.id); count:=count+1; last_id:=r.id;
  end loop;
  return jsonb_build_object('processed',count,'changed',changed,'next_cursor',case when count=p_limit then last_id else null end);
end; $$;

-- Worker-only RPCs. Never granted to anon/authenticated. A lease is a fencing
-- token, not authorization: only service_role may call these functions.
create function public.claim_content_translation_job()
returns table(id uuid,lease_token uuid,source_text text,target_code text,attempts integer)
language plpgsql security definer set search_path='' as $$
declare j public.content_translation_jobs; t public.content_translations; lim public.content_translation_limits; code text; cached text; source text;
begin
  select * into lim from public.content_translation_limits where singleton;
  if not coalesce(lim.enabled,false) then return; end if;
  for scan in 1..30 loop
    select q.* into j from public.content_translation_jobs q
      where (q.status='queued' and q.next_attempt_at<=now()) or (q.status='running' and q.lease_until<now())
      order by q.next_attempt_at,q.created_at,q.id limit 1;
    if not found then return; end if;
    select * into t from public.content_translations where content_translations.id=j.translation_id;
    if not found then return; end if;
    -- Same lock order as source edits/manual edits/completion. No API is called
    -- inside this transaction; concurrent workers recheck after acquiring locks.
    begin source:=public.lock_content_source(t.entity_type,t.entity_id,t.field_name);
    exception when no_data_found then continue; end;
    select * into t from public.content_translations where content_translations.id=j.translation_id for update;
    select q.* into j from public.content_translation_jobs q where q.id=j.id for update skip locked;
    if not found then return; end if;
    if not ((j.status='queued' and j.next_attempt_at<=now()) or (j.status='running' and j.lease_until<now())) then return; end if;
    select provider_code into code from public.content_translation_locales where locale=t.locale and enabled;
    if t.id is null or t.generation<>j.generation or t.translation_source='manual' or code is null then
      update public.content_translation_jobs set status='cancelled',updated_at=now() where content_translation_jobs.id=j.id;
      return query select j.id,null::uuid,''::text,''::text,0; return;
    end if;
    if j.attempts>=lim.max_attempts then
      update public.content_translation_jobs set status='failed',error_code='attempts_exhausted',updated_at=now() where content_translation_jobs.id=j.id;
      update public.content_translations set translation_status='failed',error_code='attempts_exhausted' where content_translations.id=t.id;
      return query select j.id,null::uuid,''::text,''::text,0; return;
    end if;
    if not j.force_refresh then
      select c.translated_text into cached from public.content_translations c where c.id<>t.id and c.locale=t.locale
        and c.source_hash=j.source_hash and c.translated_source_hash=j.source_hash and c.source_text=j.source_text
        and c.translation_source='auto' and c.translation_status='completed' and btrim(c.translated_text)<>'' limit 1;
      if found then
        update public.content_translations set translated_text=cached,translated_source_hash=j.source_hash,
          translation_status='completed',translated_at=now(),error_code=null,generation=gen_random_uuid() where content_translations.id=t.id;
        update public.content_translation_jobs set status='completed',updated_at=now() where content_translation_jobs.id=j.id;
        return query select j.id,null::uuid,''::text,''::text,0; return;
      end if;
    end if;
    update public.content_translation_jobs set status='running',lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now()
      where content_translation_jobs.id=j.id returning * into j;
    return query select j.id,j.lease_token,j.source_text,code,j.attempts+1;
    return;
  end loop;
end; $$;

create function public.reserve_content_translation_call(p_job_id uuid,p_lease_token uuid,p_characters integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare j public.content_translation_jobs; lim public.content_translation_limits; usage public.content_translation_usage; day date:=(now() at time zone 'UTC')::date;
begin
  select * into lim from public.content_translation_limits where singleton for update;
  select * into j from public.content_translation_jobs where id=p_job_id for update;
  if not found or j.status<>'running' or j.lease_token is distinct from p_lease_token or j.lease_until<now() then return false; end if;
  if j.reserved_lease_token=p_lease_token then return true; end if;
  if p_characters is null or p_characters not between 1 and 100000 then raise exception 'Invalid character reservation' using errcode='22023'; end if;
  insert into public.content_translation_usage(usage_day) values(day) on conflict do nothing;
  select * into usage from public.content_translation_usage where usage_day=day for update;
  if not coalesce(lim.enabled,false) or usage.requests_reserved>=lim.daily_request_limit or usage.characters_reserved+p_characters>lim.daily_char_limit then
    update public.content_translation_jobs set status='queued',lease_token=null,lease_until=null,next_attempt_at=(day+1)::timestamp at time zone 'UTC',error_code='daily_budget',updated_at=now() where id=j.id;
    return false;
  end if;
  update public.content_translation_usage set requests_reserved=requests_reserved+1,characters_reserved=characters_reserved+p_characters where usage_day=day;
  update public.content_translation_jobs set attempts=attempts+1,reserved_lease_token=p_lease_token,reserved_characters=p_characters,reserved_day=day where id=j.id;
  return true;
end; $$;

create function public.finish_content_translation_job(p_job_id uuid,p_lease_token uuid,p_text text)
returns boolean language plpgsql security definer set search_path='' as $$
declare j public.content_translation_jobs; t public.content_translations; source text;
begin
  select * into j from public.content_translation_jobs where id=p_job_id;
  if not found then return false; end if;
  select * into t from public.content_translations where id=j.translation_id;
  if not found then return false; end if;
  source:=public.lock_content_source(t.entity_type,t.entity_id,t.field_name);
  select * into t from public.content_translations where id=t.id for update;
  select * into j from public.content_translation_jobs where id=p_job_id for update;
  if j.status<>'running' or j.lease_token is distinct from p_lease_token or j.reserved_lease_token is distinct from p_lease_token or j.lease_until<now() then return false; end if;
  if p_text is null or btrim(p_text)='' or char_length(p_text)>12000 or p_text ~ '[<>]' then raise exception 'Invalid provider result' using errcode='22023'; end if;
  update public.content_translation_usage set responses_ok=responses_ok+1 where usage_day=j.reserved_day;
  if t.generation<>j.generation or t.source_hash<>j.source_hash or t.translation_source='manual' or public.content_source_hash(source)<>j.source_hash then
    update public.content_translation_jobs set status='cancelled',updated_at=now() where id=j.id; return false;
  end if;
  update public.content_translations set translated_text=p_text,translated_source_hash=j.source_hash,translation_status='completed',error_code=null,
    translated_at=now(),generation=gen_random_uuid() where id=t.id;
  update public.content_translation_jobs set status='completed',lease_token=null,lease_until=null,updated_at=now() where id=j.id;
  return true;
exception when no_data_found then return false;
end; $$;

create function public.fail_content_translation_job(p_job_id uuid,p_lease_token uuid,p_error_code text,p_retryable boolean,p_delay_seconds integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare j public.content_translation_jobs; t public.content_translations; lim public.content_translation_limits; source text; retry boolean;
begin
  select * into j from public.content_translation_jobs where id=p_job_id;
  if not found then return false; end if;
  select * into t from public.content_translations where id=j.translation_id;
  if not found then return false; end if;
  source:=public.lock_content_source(t.entity_type,t.entity_id,t.field_name);
  select * into t from public.content_translations where id=t.id for update;
  select * into j from public.content_translation_jobs where id=p_job_id for update;
  if j.status<>'running' or j.lease_token is distinct from p_lease_token or j.lease_until<now() then return false; end if;
  if t.generation<>j.generation or t.translation_source='manual' then update public.content_translation_jobs set status='cancelled' where id=j.id; return false; end if;
  if p_error_code !~ '^[a-z0-9_]{1,80}$' or p_delay_seconds not between 1 and 3600 then raise exception 'Invalid failure report' using errcode='22023'; end if;
  select * into lim from public.content_translation_limits where singleton;
  retry:=p_retryable and j.attempts<lim.max_attempts;
  update public.content_translation_jobs set status=case when retry then 'queued' else 'failed' end,error_code=p_error_code,
    next_attempt_at=now()+make_interval(secs=>p_delay_seconds),lease_token=null,lease_until=null,updated_at=now() where id=j.id;
  update public.content_translations set translation_status=case when retry then case when translated_text is null then 'pending' else 'outdated' end else 'failed' end,error_code=p_error_code where id=t.id;
  if j.reserved_lease_token=p_lease_token then update public.content_translation_usage set responses_failed=responses_failed+1 where usage_day=j.reserved_day; end if;
  return true;
exception when no_data_found then return false;
end; $$;

-- No implicit PUBLIC function execution; internal helpers are not callable by
-- PostgREST clients. Existing administrator membership and source RLS stay intact.
revoke all on function public.content_source_hash(text), public.lock_content_source(text,text,text),
  public.validate_content_translation_reference(), public.sync_roadmap_translations(uuid),public.roadmap_translation_outbox(),
  public.get_public_content_translations(text[],text), public.edit_content_translation(text,text,text,text,text,uuid),
  public.regenerate_content_translation(text,text,text,text,uuid,boolean),public.backfill_content_translations(uuid,integer),
  public.claim_content_translation_job(),public.reserve_content_translation_call(uuid,uuid,integer),
  public.finish_content_translation_job(uuid,uuid,text),public.fail_content_translation_job(uuid,uuid,text,boolean,integer)
  from public,anon,authenticated;
grant execute on function public.get_public_content_translations(text[],text) to anon,authenticated;
grant execute on function public.edit_content_translation(text,text,text,text,text,uuid),
  public.regenerate_content_translation(text,text,text,text,uuid,boolean),public.backfill_content_translations(uuid,integer) to authenticated;
grant execute on function public.claim_content_translation_job(),public.reserve_content_translation_call(uuid,uuid,integer),
  public.finish_content_translation_job(uuid,uuid,text),public.fail_content_translation_job(uuid,uuid,text,boolean,integer) to service_role;
commit;
