-- Immutable Aviation Passport numbers.
--
-- This migration is intentionally fail-closed. It never rewrites a non-NULL
-- passport_number. If either reserved account is missing, or existing data
-- conflicts with the reserved values, the migration aborts for review.

begin;

create sequence if not exists public.passport_number_seq
  as bigint
  minvalue 2
  start with 2;

alter table public.profiles
  add column if not exists passport_number bigint;

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
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and tgname = 'protect_passport_number'
      and not tgisinternal
  ) then
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
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'on_auth_user_created'
      and not tgisinternal
  ) then
    raise exception 'Passport migration stopped: on_auth_user_created trigger is missing';
  end if;

  select pg_get_userbyid(proowner)
  into trigger_owner
  from pg_proc
  where oid = 'public.handle_new_user()'::regprocedure;

  if trigger_owner is null then
    raise exception 'Passport migration stopped: public.handle_new_user() is missing';
  end if;

  if not has_sequence_privilege(trigger_owner, 'public.passport_number_seq', 'USAGE') then
    raise exception 'Passport migration stopped: auth trigger owner lacks sequence USAGE privilege';
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

-- Keep the next generated value above every existing value and above the
-- sequence's current position. This is intentionally the last mutating step;
-- sequence increments can survive a transaction rollback in PostgreSQL, so a
-- failed migration must not advance it before all validations complete.
select setval(
  'public.passport_number_seq',
  greatest(
    coalesce((select max(passport_number) from public.profiles), 1) + 1,
    coalesce((select last_value from public.passport_number_seq), 1) + 1,
    2
  ),
  false
);

commit;
