-- Column defaults apply only to future profile rows; existing saved designs are untouched.
alter table public.profiles
  alter column passport_cover_background set default '#171427',
  alter column passport_title_color set default '#D5B36A',
  alter column passport_brand_color set default '#D5B36A',
  alter column passport_title_font set default 'Georgia',
  alter column passport_cover_texture set default 'plain',
  alter column passport_cover_texture_color set default '#B9AA88';
