BEGIN;

ALTER TABLE public.user_achievement_featured_preferences
  ADD COLUMN IF NOT EXISTS display_level_keys jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.user_achievement_featured_preferences
  DROP CONSTRAINT IF EXISTS user_achievement_featured_preferences_display_levels_object;

ALTER TABLE public.user_achievement_featured_preferences
  ADD CONSTRAINT user_achievement_featured_preferences_display_levels_object
  CHECK (jsonb_typeof(display_level_keys) = 'object');

COMMIT;
