alter table public.profiles
  add column if not exists passport_cover_texture_color text not null default '#b9aa88';
