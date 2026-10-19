import type { SupabaseClient } from "@supabase/supabase-js";

export type AchievementCategory = { id: string; slug: string; name_en: string; name_zh: string; description_en: string; description_zh: string; display_order: number; icon_key: string };
export type AchievementLevel = { id: string; achievement_definition_id: string; level_key: "bronze" | "silver" | "gold" | "platinum"; level_order: number; threshold_value: number; threshold_unit: string; name_en: string; name_zh: string };
export type AchievementDefinition = { id: string; slug: string; category_id: string; name_en: string; name_zh: string; description_en: string; description_zh: string; badge_type: "progressive" | "standalone"; icon_key: string; unlock_rule_type: string; unlock_rule_config: Record<string, unknown>; display_order: number; levels: AchievementLevel[] };
export type UserAchievement = { achievement_definition_id: string; achievement_level_id: string | null; unlocked_at: string };
export type AchievementProgress = { value: number | null; unit: string | null; level: AchievementLevel | null; nextLevel: AchievementLevel | null; isMaxLevel: boolean };
export type AchievementItem = AchievementDefinition & { unlocked: UserAchievement | null; progress: AchievementProgress };
export type AchievementCabin = { ready: boolean; categories: AchievementCategory[]; items: AchievementItem[]; featured: AchievementItem[]; unlockedCount: number; totalCount: number; completionRate: number; latest: AchievementItem | null; highestTier: AchievementLevel | null };

const fallbackSlugs = ["first-flight", "frequent-flyer", "country-collector", "challenge-accepted", "heritage-keeper"];

function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

function calculateProgress(definition: Omit<AchievementDefinition, "levels">, values: { completedFlights: number; actualMinutes: number; dailyChallenges: number; memorialFlights: number; challengeCategories: Set<string>; scheduledLongHaul: boolean }): number | null {
  switch (definition.unlock_rule_type) {
    case "completed_flight_count": return values.completedFlights;
    case "actual_duration_minutes": return values.actualMinutes;
    case "daily_challenge_count": return values.dailyChallenges;
    case "memorial_flight_count": return values.memorialFlights;
    case "first_completed_flight": return values.completedFlights ? 1 : 0;
    case "first_daily_challenge": return values.dailyChallenges ? 1 : 0;
    case "first_challenge_quick": return values.challengeCategories.has("quick") ? 1 : 0;
    case "first_challenge_regional": return values.challengeCategories.has("regional") ? 1 : 0;
    case "first_challenge_medium": return values.challengeCategories.has("medium") ? 1 : 0;
    case "first_challenge_long": return values.challengeCategories.has("long") ? 1 : 0;
    case "first_memorial_flight": return values.memorialFlights ? 1 : 0;
    case "long_haul_scheduled_minutes": return values.scheduledLongHaul ? 1 : 0;
    default: return null;
  }
}

export async function readAchievementCabin(supabase: SupabaseClient, userId: string): Promise<AchievementCabin> {
  await supabase.rpc("refresh_my_achievements");
  const [categoriesResult, definitionsResult, levelsResult, unlockedResult, flightsResult, challengesResult, memorialsResult] = await Promise.all([
    supabase.from("achievement_categories").select("id,slug,name_en,name_zh,description_en,description_zh,display_order,icon_key").order("display_order"),
    supabase.from("achievement_definitions").select("id,slug,category_id,name_en,name_zh,description_en,description_zh,badge_type,icon_key,unlock_rule_type,unlock_rule_config,display_order").order("display_order"),
    supabase.from("achievement_levels").select("id,achievement_definition_id,level_key,level_order,threshold_value,threshold_unit,name_en,name_zh").order("level_order"),
    supabase.from("user_achievements").select("achievement_definition_id,achievement_level_id,unlocked_at").eq("user_id", userId).order("unlocked_at", { ascending: false }),
    supabase.from("flights").select("id,status,actual_duration_minutes,scheduled_duration_minutes").eq("user_id", userId).eq("status", "completed"),
    supabase.from("daily_challenge_completions").select("id,category").eq("user_id", userId),
    supabase.from("memorial_participation").select("flight_id").eq("user_id", userId),
  ]);
  if (categoriesResult.error || definitionsResult.error || levelsResult.error || unlockedResult.error) return { ready: false, categories: [], items: [], featured: [], unlockedCount: 0, totalCount: 0, completionRate: 0, latest: null, highestTier: null };

  const completedFlights = flightsResult.data ?? [];
  const completedIds = new Set(completedFlights.map(flight => flight.id));
  const values = {
    completedFlights: completedFlights.length,
    actualMinutes: completedFlights.reduce((sum, flight) => sum + (flight.actual_duration_minutes ?? 0), 0),
    dailyChallenges: challengesResult.data?.length ?? 0,
    memorialFlights: (memorialsResult.data ?? []).filter(item => item.flight_id && completedIds.has(item.flight_id)).length,
    challengeCategories: new Set((challengesResult.data ?? []).map(item => item.category)),
    scheduledLongHaul: completedFlights.some(flight => (flight.scheduled_duration_minutes ?? 0) >= 420),
  };
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
    const value = calculateProgress(definition, values);
    const level = value === null ? null : [...levels].reverse().find(item => value >= Number(item.threshold_value)) ?? null;
    const nextLevel = value === null ? levels[0] ?? null : levels.find(item => value < Number(item.threshold_value)) ?? null;
    return { ...definition, unlock_rule_config: asRecord(definition.unlock_rule_config), levels, unlocked: unlockedByDefinition.get(definition.id) ?? null, progress: { value, unit: levels[0]?.threshold_unit ?? null, level, nextLevel, isMaxLevel: Boolean(level && !nextLevel) } };
  });
  const unlockedItems = items.filter(item => item.unlocked).sort((a, b) => String(b.unlocked?.unlocked_at).localeCompare(String(a.unlocked?.unlocked_at)));
  const fallbackItems = fallbackSlugs.map(slug => items.find(item => item.slug === slug)).filter((item): item is AchievementItem => item !== undefined);
  const featured = [...unlockedItems, ...fallbackItems].filter((item, index, list) => list.findIndex(candidate => candidate.id === item.id) === index).slice(0, 5);
  const highestTier = unlockedItems.flatMap(item => item.levels.filter(level => level.id === item.unlocked?.achievement_level_id)).sort((a, b) => b.level_order - a.level_order)[0] ?? null;
  return { ready: true, categories: (categoriesResult.data ?? []) as AchievementCategory[], items, featured, unlockedCount: unlockedItems.length, totalCount: items.length, completionRate: items.length ? Math.round((unlockedItems.length / items.length) * 100) : 0, latest: unlockedItems[0] ?? null, highestTier };
}
