create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flight_date date not null,
  flight_number text,
  departure_airport text not null,
  arrival_airport text not null,
  aircraft_type text,
  registration text,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  notes text,
  import_batch_id uuid,
  import_row_number integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public.flights_user_id_date_idx
  on public.flights (user_id, flight_date desc);

alter table public.profiles enable row level security;
alter table public.flights enable row level security;

-- Policies are created conditionally so this migration can be run repeatedly.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can view their own profile') then
    create policy "Users can view their own profile" on public.profiles for select using ((select auth.uid()) = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update their own profile') then
    create policy "Users can update their own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flights' and policyname = 'Users can view their own flights') then
    create policy "Users can view their own flights" on public.flights for select using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flights' and policyname = 'Users can insert their own flights') then
    create policy "Users can insert their own flights" on public.flights for insert with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flights' and policyname = 'Users can update their own flights') then
    create policy "Users can update their own flights" on public.flights for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flights' and policyname = 'Users can delete their own flights') then
    create policy "Users can delete their own flights" on public.flights for delete using ((select auth.uid()) = user_id);
  end if;
end;
$$;

-- The trigger runs as the function owner, while callers cannot execute it directly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

grant usage on schema public to anon, authenticated;
grant select on table public.profiles, public.flights to authenticated;
grant insert, update, delete on table public.profiles, public.flights to authenticated;
