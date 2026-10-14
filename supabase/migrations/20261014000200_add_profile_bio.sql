alter table public.profiles
  add column if not exists bio text;

comment on column public.profiles.bio is 'Private profile biography, visible only to the owning user until public profiles are explicitly implemented.';
