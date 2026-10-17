alter table public.profiles
  add column if not exists passport_cover_background text not null default '#171427',
  add column if not exists passport_title_color text not null default '#d5b36a',
  add column if not exists passport_brand_color text not null default '#d5b36a',
  add column if not exists passport_title_font text not null default 'Georgia',
  add column if not exists passport_cover_texture text not null default 'plain',
  add column if not exists passport_inner_background text not null default '#f7f0df',
  add column if not exists passport_inner_title_color text not null default '#34291c',
  add column if not exists passport_inner_font text not null default 'Georgia',
  add column if not exists passport_inner_texture text not null default 'plain';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'passport_cover_background_hex_check') then
    alter table public.profiles add constraint passport_cover_background_hex_check check (passport_cover_background ~ '^#[0-9A-Fa-f]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'passport_title_color_hex_check') then
    alter table public.profiles add constraint passport_title_color_hex_check check (passport_title_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'passport_brand_color_hex_check') then
    alter table public.profiles add constraint passport_brand_color_hex_check check (passport_brand_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;
