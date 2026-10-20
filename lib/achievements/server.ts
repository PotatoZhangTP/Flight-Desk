import type { SupabaseClient } from "@supabase/supabase-js";

export type AchievementCategory = { id: string; slug: string; name_en: string; name_zh: string; description_en: string; description_zh: string; display_order: number; icon_key: string };
export type AchievementLevel = { id: string; achievement_definition_id: string; level_key: "bronze" | "silver" | "gold" | "platinum"; level_order: number; threshold_value: number; threshold_unit: string; name_en: string; name_zh: string };
export type AchievementDefinition = { id: string; slug: string; category_id: string; name_en: string; name_zh: string; description_en: string; description_zh: string; badge_type: "progressive" | "standalone"; icon_key: string; unlock_rule_type: string; unlock_rule_config: Record<string, unknown>; display_order: number; levels: AchievementLevel[] };
export type UserAchievement = { achievement_definition_id: string; achievement_level_id: string | null; unlocked_at: string };
export type AchievementProgress = { value: number | null; unit: string | null; level: AchievementLevel | null; nextLevel: AchievementLevel | null; isMaxLevel: boolean };
export type AchievementItem = AchievementDefinition & { unlocked: UserAchievement | null; progress: AchievementProgress };
export type AchievementCabin = { ready: boolean; categories: AchievementCategory[]; items: AchievementItem[]; featured: AchievementItem[]; unlockedCount: number; totalCount: number; completionRate: number; latest: AchievementItem | null; highestTier: AchievementLevel | null };

const fallbackSlugs = ["frequent-flyer"];

function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

function calculateProgress(definition: Omit<AchievementDefinition, "levels">, completedFlights: number): number | null {
  switch (definition.unlock_rule_type) {
    case "completed_flight_count": return completedFlights;
    default: return null;
  }
}

export async function readAchievementCabin(supabase: SupabaseClient, userId: string): Promise<AchievementCabin> {
  await supabase.rpc("refresh_my_achievements");
  const [categoriesResult, definitionsResult, levelsResult, unlockedResult, flightsResult, featuredPreferencesResult] = await Promise.all([
    supabase.from("achievement_categories").select("id,slug,name_en,name_zh,description_en,description_zh,display_order,icon_key").order("display_order"),
    supabase.from("achievement_definitions").select("id,slug,category_id,name_en,name_zh,description_en,description_zh,badge_type,icon_key,unlock_rule_type,unlock_rule_config,display_order").order("display_order"),
    supabase.from("achievement_levels").select("id,achievement_definition_id,level_key,level_order,threshold_value,threshold_unit,name_en,name_zh").order("level_order"),
    supabase.from("user_achievements").select("achievement_definition_id,achievement_level_id,unlocked_at").eq("user_id", userId).order("unlocked_at", { ascending: false }),
    supabase.from("flights").select("id").eq("user_id", userId).eq("status", "completed"),
    supabase.from("user_achievement_featured_preferences").select("featured_definition_ids").eq("user_id", userId).maybeSingle(),
  ]);
  if (categoriesResult.error || definitionsResult.error || levelsResult.error || unlockedResult.error) return { ready: false, categories: [], items: [], featured: [], unlockedCount: 0, totalCount: 0, completionRate: 0, latest: null, highestTier: null };

  const completedFlightCount = flightsResult.data?.length ?? 0;
  const levelsByDefinition = new Map<string, AchievementLevel[]>();
  for (const level of (levelsResult.data ?? []) as AchievementLevel[]) levelsByDefinition.set(level.achievement_definition_id, [...(levelsByDefinition.get(level.achievement_definition_id) ?? []), level]);
  const levelById = new Map((levelsResult.data ?? [] as AchievementLevel[]).map(level => [level.id, level]));
  const unlockedByDefinition = new Map<string, UserAchievement>();
  for (const item of (unlockedResult.data ?? []) as UserAchievement[]) {
    const current = unlockedByDefinition.get(item.achievement_definition_id);
    const currentOrder = current?.achievement_level_id ? levelById.get(current.achievement_level_id)?.level_order ?? 0 : 0;
    const nextOrder = item.achievement_level_id ? levelById.get(item.achievement_level_id)?.level_order ?? 0 : 0;
    if (!current || nextOrder >= currentOrder) unlockedByDefinition.set(item.achievement_definition_id, item);
  }
  const items: AchievementItem[] = ((definitionsResult.data ?? []) as Omit<AchievementDefinition, "levels">[]).map(definition => {
    const levels = (levelsByDefinition.get(definition.id) ?? []).sort((a, b) => a.level_order - b.level_order);
    const value = calculateProgress(definition, completedFlightCount);
    const level = value === null ? null : [...levels].reverse().find(item => value >= Number(item.threshold_value)) ?? null;
    const nextLevel = value === null ? levels[0] ?? null : levels.find(item => value < Number(item.threshold_value)) ?? null;
    return { ...definition, unlock_rule_config: asRecord(definition.unlock_rule_config), levels, unlocked: unlockedByDefinition.get(definition.id) ?? null, progress: { value, unit: levels[0]?.threshold_unit ?? null, level, nextLevel, isMaxLevel: Boolean(level && !nextLevel) } };
  });
  const unlockedItems = items.filter(item => item.unlocked).sort((a, b) => String(b.unlocked?.unlocked_at).localeCompare(String(a.unlocked?.unlocked_at)));
  const fallbackItems = fallbackSlugs.map(slug => items.find(item => item.slug === slug)).filter((item): item is AchievementItem => item !== undefined);
  const storedFeaturedIds = featuredPreferencesResult.error ? null : featuredPreferencesResult.data?.featured_definition_ids as string[] | undefined;
  const featured = storedFeaturedIds
    ? storedFeaturedIds.map(id => items.find(item => item.id === id)).filter((item): item is AchievementItem => item !== undefined)
    : [...unlockedItems, ...fallbackItems].filter((item, index, list) => list.findIndex(candidate => candidate.id === item.id) === index).slice(0, 5);
  const highestTier = unlockedItems.flatMap(item => item.levels.filter(level => level.id === item.unlocked?.achievement_level_id)).sort((a, b) => b.level_order - a.level_order)[0] ?? null;
  return { ready: true, categories: (categoriesResult.data ?? []) as AchievementCategory[], items, featured, unlockedCount: unlockedItems.length, totalCount: items.length, completionRate: items.length ? Math.round((unlockedItems.length / items.length) * 100) : 0, latest: unlockedItems[0] ?? null, highestTier };
}
