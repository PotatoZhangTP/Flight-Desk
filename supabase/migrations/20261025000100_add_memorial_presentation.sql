-- Memorial card presentation only. Run manually in Supabase SQL Editor.
-- Existing dates, routes, descriptions, participation and RLS remain intact.
BEGIN;

ALTER TABLE public.memorial_events
  ADD COLUMN IF NOT EXISTS memorial_type text NOT NULL DEFAULT 'accident_memorial',
  ADD COLUMN IF NOT EXISTS memorial_message_en text,
  ADD COLUMN IF NOT EXISTS memorial_message_zh text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.memorial_events'::regclass
      AND conname = 'memorial_events_memorial_type_check'
  ) THEN
    ALTER TABLE public.memorial_events
      ADD CONSTRAINT memorial_events_memorial_type_check
      CHECK (memorial_type IN ('accident_memorial', 'historical_anniversary'));
  END IF;
END;
$$;

COMMENT ON COLUMN public.memorial_events.memorial_type IS
  'Administrator-selected card artwork: accident_memorial or historical_anniversary.';
COMMENT ON COLUMN public.memorial_events.memorial_message_en IS
  'Optional administrator-authored short English memorial message; description is the legacy fallback.';
COMMENT ON COLUMN public.memorial_events.memorial_message_zh IS
  'Optional administrator-authored short Chinese memorial message; description is the legacy fallback.';

COMMIT;
