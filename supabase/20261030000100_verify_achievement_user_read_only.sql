-- Current-user Achievement verification (READ ONLY)
-- Replace the email below, then run after:
--   1) the Achievement migration,
--   2) the updated application deployment, and
--   3) one authenticated visit to Dashboard or Achievements (lazy backfill).

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

DO $input_check$
DECLARE
  v_email constant text := 'REPLACE_WITH_LOGIN_EMAIL';
BEGIN
  IF position('@' IN v_email) = 0 THEN
    RAISE EXCEPTION 'Replace REPLACE_WITH_LOGIN_EMAIL before running this verification';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(v_email)) THEN
    RAISE EXCEPTION 'No auth.users row exists for %', v_email;
  END IF;
END;
$input_check$;

-- Dashboard-compatible time source versus the database Achievement metric.
WITH target AS (
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower('REPLACE_WITH_LOGIN_EMAIL')
), direct_total AS (
  SELECT coalesce(sum(
    CASE
      WHEN flight.actual_duration_minutes >= 0 THEN flight.actual_duration_minutes
      WHEN flight.scheduled_duration_minutes >= 0 THEN flight.scheduled_duration_minutes
      WHEN flight.duration_minutes >= 0 THEN flight.duration_minutes
      ELSE 0
    END
  ), 0)::numeric AS total_minutes
  FROM public.flights AS flight
  INNER JOIN target ON target.id = flight.user_id
  WHERE flight.status = 'completed'
), metric_total AS (
  SELECT metric.metric_value AS total_hours
  FROM target
  CROSS JOIN LATERAL public.achievement_metrics_for_user(target.id) AS metric
  WHERE metric.metric_type = 'total_flight_hours'
)
SELECT
  direct_total.total_minutes,
  direct_total.total_minutes / 60.0 AS direct_total_hours,
  metric_total.total_hours AS achievement_total_hours,
  CASE
    WHEN metric_total.total_hours >= 1000 THEN 'Purple'
    WHEN metric_total.total_hours >= 500 THEN 'Gold'
    WHEN metric_total.total_hours >= 100 THEN 'Silver'
    WHEN metric_total.total_hours >= 10 THEN 'Bronze'
    ELSE 'Locked'
  END AS expected_time_aloft_tier,
  CASE
    WHEN metric_total.total_hours >= 1000 THEN 0
    WHEN metric_total.total_hours >= 500 THEN 1000 - metric_total.total_hours
    WHEN metric_total.total_hours >= 100 THEN 500 - metric_total.total_hours
    WHEN metric_total.total_hours >= 10 THEN 100 - metric_total.total_hours
    ELSE 10 - metric_total.total_hours
  END AS hours_to_next_tier
FROM direct_total
CROSS JOIN metric_total;

-- All 14 live metrics, expected current tier and next threshold.
WITH target AS (
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower('REPLACE_WITH_LOGIN_EMAIL')
), metrics AS (
  SELECT metric.metric_type, metric.metric_value
  FROM target
  CROSS JOIN LATERAL public.achievement_metrics_for_user(target.id) AS metric
)
SELECT
  definition.slug,
  definition.name_en,
  definition.unlock_rule_type AS metric_type,
  metric.metric_value,
  current_level.name_en AS expected_current_level,
  next_level.name_en AS next_level,
  next_level.threshold_value AS next_threshold,
  greatest(next_level.threshold_value - metric.metric_value, 0) AS remaining_to_next
FROM public.achievement_definitions AS definition
INNER JOIN metrics AS metric
  ON metric.metric_type = definition.unlock_rule_type
LEFT JOIN LATERAL (
  SELECT level.name_en, level.level_order
  FROM public.achievement_levels AS level
  WHERE level.achievement_definition_id = definition.id
    AND level.threshold_value <= metric.metric_value
  ORDER BY level.level_order DESC
  LIMIT 1
) AS current_level ON true
LEFT JOIN LATERAL (
  SELECT level.name_en, level.threshold_value
  FROM public.achievement_levels AS level
  WHERE level.achievement_definition_id = definition.id
    AND level.threshold_value > metric.metric_value
  ORDER BY level.level_order
  LIMIT 1
) AS next_level ON true
WHERE definition.slug = ANY (ARRAY[
  'frequent-flyer', 'time-aloft', 'distance-traveller',
  'country-collector', 'airport-explorer', 'continental-explorer',
  'city-hopper', 'fleet-collector', 'boeing-explorer',
  'airbus-explorer', 'route-collector', 'international-routes',
  'challenge-pilot', 'heritage-keeper'
])
ORDER BY definition.slug;

-- This result must be empty after the user's lazy backfill has run.
WITH target AS (
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower('REPLACE_WITH_LOGIN_EMAIL')
), eligible AS (
  SELECT target.id AS user_id, definition.id AS definition_id, level.id AS level_id
  FROM target
  CROSS JOIN LATERAL public.achievement_metrics_for_user(target.id) AS metric
  INNER JOIN public.achievement_definitions AS definition
    ON definition.unlock_rule_type = metric.metric_type
  INNER JOIN public.achievement_levels AS level
    ON level.achievement_definition_id = definition.id
    AND level.threshold_value <= metric.metric_value
  WHERE definition.slug = ANY (ARRAY[
    'frequent-flyer', 'time-aloft', 'distance-traveller',
    'country-collector', 'airport-explorer', 'continental-explorer',
    'city-hopper', 'fleet-collector', 'boeing-explorer',
    'airbus-explorer', 'route-collector', 'international-routes',
    'challenge-pilot', 'heritage-keeper'
  ])
)
SELECT definition.slug, level.name_en AS missing_award
FROM eligible
INNER JOIN public.achievement_definitions AS definition
  ON definition.id = eligible.definition_id
INNER JOIN public.achievement_levels AS level ON level.id = eligible.level_id
LEFT JOIN public.user_achievements AS award
  ON award.user_id = eligible.user_id
  AND award.achievement_definition_id = eligible.definition_id
  AND award.achievement_level_id = eligible.level_id
WHERE award.id IS NULL
ORDER BY definition.slug, level.level_order;

-- Stored award history. For a 323-hour user this must include Time Aloft
-- Bronze and Silver, and must not include Gold or Purple.
WITH target AS (
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower('REPLACE_WITH_LOGIN_EMAIL')
)
SELECT
  definition.slug,
  level.level_key AS stored_level_key,
  level.name_en AS display_name,
  award.achieved_at,
  award.unlocked_at
FROM target
INNER JOIN public.user_achievements AS award ON award.user_id = target.id
INNER JOIN public.achievement_definitions AS definition
  ON definition.id = award.achievement_definition_id
LEFT JOIN public.achievement_levels AS level ON level.id = award.achievement_level_id
WHERE definition.slug = ANY (ARRAY[
  'frequent-flyer', 'time-aloft', 'distance-traveller',
  'country-collector', 'airport-explorer', 'continental-explorer',
  'city-hopper', 'fleet-collector', 'boeing-explorer',
  'airbus-explorer', 'route-collector', 'international-routes',
  'challenge-pilot', 'heritage-keeper'
])
ORDER BY definition.slug, level.level_order;

COMMIT;
