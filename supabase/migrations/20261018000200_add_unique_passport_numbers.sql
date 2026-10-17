-- Assign immutable, sequential Aviation Passport numbers.
-- 000000 and 000001 are reserved for the two designated accounts; all other
-- profiles are ordered by the Supabase Auth registration timestamp.

create sequence if not exists public.passport_number_seq
  as bigint
  minvalue 2
  start with 2;

alter table public.profiles
  add column if not exists passport_number bigint;

drop trigger if exists protect_passport_number on public.profiles;

update public.profiles as profile
set passport_number = case lower(auth_user.email)
  when 'ericz4118@outlook.com' then 0
  when 'zhangtuopueric@outlook.com' then 1
end
from auth.users as auth_user
where auth_user.id = profile.id
  and lower(auth_user.email) in ('ericz4118@outlook.com', 'zhangtuopueric@outlook.com');

with ordered_profiles as (
  select
    profile.id,
    row_number() over (
      order by coalesce(auth_user.created_at, profile.created_at), profile.id
    ) + 1 as assigned_number
  from public.profiles as profile
  left join auth.users as auth_user on auth_user.id = profile.id
  where coalesce(lower(auth_user.email), '') not in (
    'ericz4118@outlook.com',
    'zhangtuopueric@outlook.com'
  )
)
update public.profiles as profile
set passport_number = ordered_profiles.assigned_number
from ordered_profiles
where profile.id = ordered_profiles.id;

select setval(
  'public.passport_number_seq',
  greatest(coalesce((select max(passport_number) from public.profiles), 1) + 1, 2),
  false
);

alter table public.profiles
  alter column passport_number set default nextval('public.passport_number_seq'),
  alter column passport_number set not null;

create unique index if not exists profiles_passport_number_key
  on public.profiles (passport_number);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_passport_number_nonnegative'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_passport_number_nonnegative
      check (passport_number >= 0);
  end if;
end;
$$;

create or replace function public.prevent_passport_number_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.passport_number is distinct from old.passport_number then
    raise exception 'Passport numbers are immutable';
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_passport_number_change() from public, anon, authenticated;

create trigger protect_passport_number
  before update of passport_number on public.profiles
  for each row
  execute function public.prevent_passport_number_change();

revoke all on sequence public.passport_number_seq from public, anon, authenticated;
