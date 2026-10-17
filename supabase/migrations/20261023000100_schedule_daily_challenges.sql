BEGIN;

-- Supabase projects with the Cron extension enabled run this as the database
-- scheduler role. The function itself is SECURITY DEFINER and only accepts
-- the current UTC date, so no service-role key is exposed or required.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_namespace
    WHERE nspname = 'cron'
  ) THEN
    RAISE EXCEPTION 'Supabase Cron is not enabled. Enable pg_cron, then rerun this migration.';
  END IF;
END
$$;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'flight-desk-daily-challenges-utc';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'flight-desk-daily-challenges-utc',
    '0 0 * * *',
    $job$SELECT public.ensure_daily_challenges((pg_catalog.timezone('utc', pg_catalog.now()))::date);$job$
  );
END
$$;

COMMIT;
