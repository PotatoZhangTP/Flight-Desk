-- Memorial Flight display tone. Run manually in Supabase SQL Editor.
-- Existing memorial type, messages, dates, routes and participation remain unchanged.
BEGIN;

ALTER TABLE public.memorial_events
  ADD COLUMN IF NOT EXISTS display_tone text;

UPDATE public.memorial_events
SET display_tone = CASE
  WHEN memorial_type = 'historical_anniversary' THEN 'celebrating'
  ELSE 'remembering'
END
WHERE display_tone IS NULL;

ALTER TABLE public.memorial_events
  ALTER COLUMN display_tone SET DEFAULT 'remembering',
  ALTER COLUMN display_tone SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.memorial_events'::regclass
      AND conname = 'memorial_events_display_tone_check'
  ) THEN
    ALTER TABLE public.memorial_events
      ADD CONSTRAINT memorial_events_display_tone_check
      CHECK (display_tone IN ('remembering', 'celebrating'));
  END IF;
END;
$$;

COMMENT ON COLUMN public.memorial_events.display_tone IS
  'Administrator-selected visual tone: remembering or celebrating.';

COMMIT;
