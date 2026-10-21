BEGIN;

UPDATE public.achievement_levels AS level
SET
  name_en = 'Frequent Flyer Purple',
  name_zh = '常旅客・紫',
  updated_at = now()
FROM public.achievement_definitions AS definition
WHERE level.achievement_definition_id = definition.id
  AND definition.slug = 'frequent-flyer'
  AND level.level_key = 'platinum'
  AND (level.name_en IS DISTINCT FROM 'Frequent Flyer Purple' OR level.name_zh IS DISTINCT FROM '常旅客・紫');

COMMIT;
