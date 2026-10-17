BEGIN;

ALTER TABLE public.memorial_events
  ADD COLUMN IF NOT EXISTS publish_year integer,
  ADD COLUMN IF NOT EXISTS publish_month integer,
  ADD COLUMN IF NOT EXISTS publish_day integer;

UPDATE public.memorial_events
SET publish_year = COALESCE(publish_year, event_year),
    publish_month = COALESCE(publish_month, event_month),
    publish_day = COALESCE(publish_day, event_day)
WHERE publish_year IS NULL
   OR publish_month IS NULL
   OR publish_day IS NULL;

ALTER TABLE public.memorial_events
  ALTER COLUMN publish_year SET NOT NULL,
  ALTER COLUMN publish_month SET NOT NULL,
  ALTER COLUMN publish_day SET NOT NULL;

ALTER TABLE public.memorial_events
  DROP CONSTRAINT IF EXISTS memorial_events_publish_year_check,
  DROP CONSTRAINT IF EXISTS memorial_events_publish_month_check,
  DROP CONSTRAINT IF EXISTS memorial_events_publish_day_check;

ALTER TABLE public.memorial_events
  ADD CONSTRAINT memorial_events_publish_year_check
    CHECK (publish_year BETWEEN 1900 AND 2200),
  ADD CONSTRAINT memorial_events_publish_month_check
    CHECK (publish_month BETWEEN 1 AND 12),
  ADD CONSTRAINT memorial_events_publish_day_check
    CHECK (publish_day BETWEEN 1 AND 31);

COMMIT;
