-- Allow an authenticated Preview request to create today's shared challenges
-- when SUPABASE_SERVICE_ROLE_KEY is not configured in that deployment.
-- The function itself accepts only the current UTC date, runs as its owner,
-- uses an advisory lock, and never accepts a user id or writes user data.
BEGIN;

DO $check$
BEGIN
  IF to_regprocedure('public.ensure_daily_challenges(date)') IS NULL THEN
    RAISE EXCEPTION 'Required public.ensure_daily_challenges(date) function is missing';
  END IF;
END
$check$;

REVOKE ALL ON FUNCTION public.ensure_daily_challenges(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_daily_challenges(date) TO authenticated, service_role;

COMMIT;
