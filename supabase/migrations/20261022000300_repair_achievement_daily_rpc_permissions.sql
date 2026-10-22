-- Repair only the two authenticated RPC entry points used by the app.
-- Internal metric functions remain private.
BEGIN;

DO $check$
BEGIN
  IF to_regprocedure('public.ensure_daily_challenges(date)') IS NULL THEN
    RAISE EXCEPTION 'Required public.ensure_daily_challenges(date) function is missing';
  END IF;
  IF to_regprocedure('public.get_my_achievement_progress()') IS NULL THEN
    RAISE EXCEPTION 'Required public.get_my_achievement_progress() function is missing';
  END IF;
  IF to_regprocedure('public.achievement_metrics_for_user(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Required public.achievement_metrics_for_user(uuid) function is missing';
  END IF;
END
$check$;

-- Daily generation is global and idempotent, but the function itself accepts
-- only the current UTC date. No user id or private data is accepted.
REVOKE ALL ON FUNCTION public.ensure_daily_challenges(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_daily_challenges(date) TO authenticated, service_role;

-- This is the only public metrics entry point. It derives auth.uid() inside
-- the function and must not accept a caller-supplied user id.
REVOKE ALL ON FUNCTION public.get_my_achievement_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_achievement_progress() TO authenticated;

-- Keep the arbitrary-user internal function private. The SECURITY DEFINER
-- refresh function calls it server-side after deriving auth.uid().
REVOKE ALL ON FUNCTION public.achievement_metrics_for_user(uuid) FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
