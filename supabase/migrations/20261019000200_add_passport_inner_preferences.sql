alter table public.profiles
  add column if not exists passport_inner_background text not null default '#f7f0df',
  add column if not exists passport_inner_title_color text not null default '#34291c',
  add column if not exists passport_inner_font text not null default 'Georgia',
  add column if not exists passport_inner_texture text not null default 'plain',
  add column if not exists passport_inner_texture_color text not null default '#b9aa88';
