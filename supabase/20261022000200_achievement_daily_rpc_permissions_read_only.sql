-- READ-ONLY DIAGNOSTICS
-- Run this in Supabase SQL Editor as an administrator.
-- This script does not modify data, functions, grants, or RLS policies.

SELECT
  routine_specific_name,
  routine_schema,
  routine_name,
  data_type,
  security_type,
  external_language
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'ensure_daily_challenges',
    'get_my_achievement_progress',
    'achievement_metrics_for_user',
    'refresh_my_achievements'
  )
ORDER BY routine_name;

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_userbyid(p.proowner) AS owner_name,
  p.prosecdef AS security_definer,
  p.proacl AS acl,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    (p.proname = 'ensure_daily_challenges' AND p.pronargs = 1 AND p.proargtypes[0] = 'date'::regtype)
    OR (p.proname = 'get_my_achievement_progress' AND p.pronargs = 0)
    OR (p.proname = 'achievement_metrics_for_user' AND p.pronargs = 1 AND p.proargtypes[0] = 'uuid'::regtype)
    OR (p.proname = 'refresh_my_achievements' AND p.pronargs = 0)
  )
ORDER BY p.proname;

SELECT
  to_regprocedure('public.ensure_daily_challenges(date)') AS ensure_daily_challenges,
  to_regprocedure('public.get_my_achievement_progress()') AS get_my_achievement_progress,
  to_regprocedure('public.achievement_metrics_for_user(uuid)') AS achievement_metrics_for_user,
  to_regprocedure('public.refresh_my_achievements()') AS refresh_my_achievements;

SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname = 'flight-desk-daily-challenges-utc';

SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'daily_challenges',
    'challenge_routes',
    'daily_challenge_completions',
    'achievement_categories',
    'achievement_definitions',
    'achievement_levels',
    'user_achievements'
  )
ORDER BY table_name;
