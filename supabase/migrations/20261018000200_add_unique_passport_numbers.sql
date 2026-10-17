begin;

-- Immutable Aviation Passport numbers.
-- This migration is fail-closed: it never rewrites a non-NULL number.

-- Serialize this backfill with Auth registration/profile creation. Auth uses
-- auth.users first and then the SECURITY DEFINER profile trigger, so acquire
-- the locks in that same order to avoid assigning against a moving snapshot.
select pg_advisory_xact_lock(hashtextextended('flightdesk.passport-number-migration', 0));
lock table auth.users in share mode;
lock table public.profiles in share row exclusive mode;

create sequence if not exists public.passport_number_seq
  as bigint
  minvalue 2
  start with 2;

alter table public.profiles
  add column if not exists passport_number bigint;

do $$
declare
  sequence_type regtype;
  sequence_minimum bigint;
  sequence_owner name;
begin
  select seq.seqtypid::regtype, seq.seqmin, pg_get_userbyid(cls.relowner)
  into sequence_type, sequence_minimum, sequence_owner
  from pg_sequence seq
  join pg_class cls on cls.oid = seq.seqrelid
  where seq.seqrelid = 'public.passport_number_seq'::regclass;

  if sequence_type is null then
    raise exception 'Passport migration stopped: passport_number_seq is not a valid sequence';
  end if;

  if sequence_type <> 'bigint'::regtype or sequence_minimum <> 2 then
    raise exception 'Passport migration stopped: passport_number_seq must be bigint with MINVALUE 2';
  end if;

  if not has_sequence_privilege(sequence_owner, 'public.passport_number_seq', 'USAGE') then
    raise exception 'Passport migration stopped: sequence owner lacks USAGE privilege';
  end if;
end;
$$;

-- Install the guard before backfilling so a repeated run can safely fill only
-- NULL values. The only permitted transition is NULL -> initial assignment.
create or replace function public.prevent_passport_number_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.passport_number is not null
     and new.passport_number is distinct from old.passport_number then
    raise exception 'Passport numbers are immutable';
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_passport_number_change() from public, anon, authenticated;

do $$
declare
  trigger_is_correct boolean;
begin
  select exists (
    select 1 from pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and tgname = 'protect_passport_number'
      and not tgisinternal
      and tgenabled = 'O'
      and tgfoid = 'public.prevent_passport_number_change()'::regprocedure
      and tgtype = 19
      and pg_get_triggerdef(oid) ilike '%before update of passport_number%'
  ) into trigger_is_correct;

  if not trigger_is_correct then
    if exists (
      select 1 from pg_trigger
      where tgrelid = 'public.profiles'::regclass
        and tgname = 'protect_passport_number'
        and not tgisinternal
    ) then
      execute 'drop trigger protect_passport_number on public.profiles';
    end if;

    create trigger protect_passport_number
      before update of passport_number on public.profiles
      for each row
      execute function public.prevent_passport_number_change();
  end if;
end;
$$;

-- The existing auth trigger must remain present. Its SECURITY DEFINER owner
-- must be able to call nextval() after the default is attached.
do $$
declare
  trigger_owner name;
  trigger_is_security_definer boolean;
  function_definition text;
begin
  select pg_get_functiondef('public.handle_new_user()'::regprocedure)
  into function_definition;

  if function_definition is null then
    raise exception 'Passport migration stopped: public.handle_new_user() is missing';
  end if;

  if position(
    'insert into public.profiles (id, display_name)'
    in lower(function_definition)
  ) = 0 then
    raise exception 'Passport migration stopped: handle_new_user() does not insert the expected Profile fields';
  end if;

  if function_definition ~* 'passport_number' then
    raise exception 'Passport migration stopped: handle_new_user() explicitly references passport_number';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'on_auth_user_created'
      and not tgisinternal
  ) then
    raise exception 'Passport migration stopped: on_auth_user_created trigger is missing';
  end if;

  select pg_get_userbyid(proowner), prosecdef
  into trigger_owner, trigger_is_security_definer
  from pg_proc
  where oid = 'public.handle_new_user()'::regprocedure;

  if trigger_owner is null then
    raise exception 'Passport migration stopped: public.handle_new_user() is missing';
  end if;

  if not trigger_is_security_definer then
    raise exception 'Passport migration stopped: public.handle_new_user() is not SECURITY DEFINER';
  end if;

  if not has_sequence_privilege(trigger_owner, 'public.passport_number_seq', 'USAGE') then
    raise exception 'Passport migration stopped: auth trigger owner lacks sequence USAGE privilege';
  end if;

  if exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and not tgisinternal
      and tgfoid = 'public.handle_new_user()'::regprocedure
      and tgname <> 'on_auth_user_created'
  ) then
    raise exception 'Passport migration stopped: multiple Auth triggers call handle_new_user()';
  end if;
end;
$$;

do $$
declare
  trigger_is_correct boolean;
begin
  select exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'on_auth_user_created'
      and not tgisinternal
      and tgenabled = 'O'
      and tgfoid = 'public.handle_new_user()'::regprocedure
      and (tgtype & 1) <> 0
      and (tgtype & 2) = 0
      and (tgtype & 4) <> 0
      and (tgtype & 24) = 0
  ) into trigger_is_correct;

  if not trigger_is_correct then
    if exists (
      select 1 from pg_trigger
      where tgrelid = 'auth.users'::regclass
        and tgname = 'on_auth_user_created'
        and not tgisinternal
    ) then
      execute 'drop trigger on_auth_user_created on auth.users';
    end if;

    create trigger on_auth_user_created
      after insert on auth.users
      for each row
      execute function public.handle_new_user();
  end if;
end;
$$;

do $$
declare
  missing_email text;
begin
  for missing_email in
    select reserved.email
    from (values
      ('ericz4118@outlook.com'::text),
      ('zhangtuopueric@outlook.com'::text)
    ) as reserved(email)
    where not exists (
      select 1
      from auth.users as auth_user
      join public.profiles as profile on profile.id = auth_user.id
      where lower(auth_user.email) = reserved.email
    )
  loop
    raise exception 'Reserved passport account is missing from auth.users/profiles: %', missing_email;
  end loop;

  if exists (
    select 1 from public.profiles
    where passport_number is not null and passport_number < 0
  ) then
    raise exception 'Passport migration stopped: negative passport_number exists';
  end if;

  if exists (
    select 1 from public.profiles
    group by passport_number
    having passport_number is not null and count(*) > 1
  ) then
    raise exception 'Passport migration stopped: duplicate passport_number exists';
  end if;

  if exists (
    select 1
    from public.profiles as profile
    join auth.users as auth_user on auth_user.id = profile.id
    where lower(auth_user.email) = 'ericz4118@outlook.com'
      and profile.passport_number is not null
      and profile.passport_number <> 0
  ) then
    raise exception 'Passport migration stopped: reserved admin account does not have passport_number 0';
  end if;

  if exists (
    select 1
    from public.profiles as profile
    join auth.users as auth_user on auth_user.id = profile.id
    where lower(auth_user.email) = 'zhangtuopueric@outlook.com'
      and profile.passport_number is not null
      and profile.passport_number <> 1
  ) then
    raise exception 'Passport migration stopped: reserved test account does not have passport_number 1';
  end if;

  if exists (
    select 1
    from public.profiles as profile
    left join auth.users as auth_user on auth_user.id = profile.id
    where profile.passport_number in (0, 1)
      and coalesce(lower(auth_user.email), '') not in (
        'ericz4118@outlook.com', 'zhangtuopueric@outlook.com'
      )
  ) then
    raise exception 'Passport migration stopped: a non-reserved account uses passport_number 0 or 1';
  end if;
end;
$$;

do $$
declare
  profile_trigger_owner name;
begin
  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.profiles'::regclass
  ) then
    raise exception 'Passport migration stopped: profiles RLS is disabled';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and cmd in ('INSERT', 'ALL')
  ) then
    raise exception 'Passport migration stopped: profiles has an INSERT/ALL RLS policy';
  end if;

  select pg_get_userbyid(proowner)
  into profile_trigger_owner
  from pg_proc
  where oid = 'public.handle_new_user()'::regprocedure;

  if not has_table_privilege(
    profile_trigger_owner,
    'public.profiles',
    'INSERT'
  ) then
    raise exception 'Passport migration stopped: Auth trigger owner lacks profiles INSERT privilege';
  end if;
end;
$$;

-- Auth creates Profiles through the SECURITY DEFINER trigger. Direct Profile
-- insertion by anon/authenticated users is never allowed.
revoke insert on table public.profiles from public, anon, authenticated;

-- Reserve the two designated values only when those profiles are still NULL.
-- Existing values are never overwritten.
update public.profiles as profile
set passport_number = case lower(auth_user.email)
  when 'ericz4118@outlook.com' then 0
  when 'zhangtuopueric@outlook.com' then 1
end
from auth.users as auth_user
where auth_user.id = profile.id
  and profile.passport_number is null
  and lower(auth_user.email) in (
    'ericz4118@outlook.com', 'zhangtuopueric@outlook.com'
  );

-- Fill only NULL values. Existing numbers remain stable; unused numbers are
-- selected in registration order, starting at 2. Sequence gaps are allowed.
with null_profiles as (
  select
    profile.id,
    row_number() over (
      order by coalesce(auth_user.created_at, profile.created_at), profile.id
    ) as ordinal
  from public.profiles as profile
  left join auth.users as auth_user on auth_user.id = profile.id
  where profile.passport_number is null
    and coalesce(lower(auth_user.email), '') not in (
      'ericz4118@outlook.com', 'zhangtuopueric@outlook.com'
    )
), available_numbers as (
  select candidate.number, row_number() over (order by candidate.number) as ordinal
  from generate_series(
    2::bigint,
    greatest(
      2::bigint,
      coalesce((select max(passport_number) from public.profiles), 1::bigint)
        + (select count(*) from null_profiles) + 2
    )
  ) as candidate(number)
  where not exists (
    select 1 from public.profiles as used
    where used.passport_number = candidate.number
  )
)
update public.profiles as profile
set passport_number = available_numbers.number
from null_profiles
join available_numbers on available_numbers.ordinal = null_profiles.ordinal
where profile.id = null_profiles.id;

alter table public.profiles
  alter column passport_number set default nextval('public.passport_number_seq'),
  alter column passport_number set not null;

create unique index if not exists profiles_passport_number_key
  on public.profiles (passport_number);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_passport_number_nonnegative'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_passport_number_nonnegative
      check (passport_number >= 0);
  end if;
end;
$$;

revoke all on sequence public.passport_number_seq from public, anon, authenticated;

-- Advance the sequence only when its next value could collide. In particular,
-- a repeated migration must not call setval() unnecessarily. is_called=false
-- means last_value itself is returned by the next nextval(); is_called=true
-- means nextval() returns last_value + 1.
do $$
declare
  sequence_last bigint;
  sequence_called boolean;
  next_available bigint;
  required_next bigint;
begin
  select last_value, is_called
  into sequence_last, sequence_called
  from public.passport_number_seq;

  select coalesce(max(passport_number), 1) + 1
  into required_next
  from public.profiles;

  next_available := case
    when sequence_called then sequence_last + 1
    else sequence_last
  end;

  if next_available < greatest(required_next, 2) then
    perform setval(
      'public.passport_number_seq',
      greatest(required_next, 2),
      false
    );
  end if;
end;
$$;

commit;
