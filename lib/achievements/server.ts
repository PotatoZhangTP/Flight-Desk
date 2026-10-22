import type { SupabaseClient } from "@supabase/supabase-js";

export type AchievementCategory = { id: string; slug: string; name_en: string; name_zh: string; description_en: string; description_zh: string; display_order: number; icon_key: string };
export type AchievementLevel = { id: string; achievement_definition_id: string; level_key: "bronze" | "silver" | "gold" | "platinum"; level_order: number; threshold_value: number; threshold_unit: string; name_en: string; name_zh: string };
export type AchievementDefinition = { id: string; slug: string; category_id: string; name_en: string; name_zh: string; description_en: string; description_zh: string; badge_type: "progressive" | "standalone"; icon_key: string; unlock_rule_type: string; unlock_rule_config: Record<string, unknown>; display_order: number; levels: AchievementLevel[] };
export type UserAchievement = { achievement_definition_id: string; achievement_level_id: string | null; unlocked_at: string };
export type AchievementProgress = { value: number | null; unit: string | null; level: AchievementLevel | null; nextLevel: AchievementLevel | null; isMaxLevel: boolean };
export type AchievementItem = AchievementDefinition & { unlocked: UserAchievement | null; progress: AchievementProgress };
export type AchievementCabin = {
  ready: boolean;
  categories: AchievementCategory[];
  items: AchievementItem[];
  featured: AchievementItem[];
  unlockedCount: number;
  totalCount: number;
  completionRate: number;
  latest: AchievementItem | null;
  highestTier: AchievementLevel | null;
  loadError?: boolean;
  loadErrorSource?: "categories" | "definitions" | "levels" | "metrics" | "user_achievements";
  loadErrorCode?: string;
  refreshError?: boolean;
  hasFeaturedPreference?: boolean;
};
type AchievementMetricRow = { metric_type: string; metric_value: number | string | null };

function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

function logAchievementError(scope: string, error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined) {
  if (!error) return;
  console.error(`[achievements] ${scope} failed`, { code: error.code, message: error.message, details: error.details, hint: error.hint });
}

function calculateProgress(definition: Omit<AchievementDefinition, "levels">, metrics: Map<string, number>): number | null {
  return metrics.get(definition.unlock_rule_type) ?? null;
}

export async function readAchievementCabin(
  supabase: SupabaseClient,
  userId: string,
): Promise<AchievementCabin> {
  const timeout = () => AbortSignal.timeout(8000);
  const metricsTimeout = () => AbortSignal.timeout(30000);
  // Ensure the server-side Supabase client has resolved the auth cookie before
  // invoking the auth.uid()-scoped progress RPC. This avoids a transient
  // 42501 when the Dashboard and Achievements page render in parallel.
  await supabase.auth.getUser();
  const [categoriesResult, definitionsResult, levelsResult, metricsResult, featuredPreferencesResult, initialUnlockedResult] = await Promise.all([
    supabase.from("achievement_categories").select("id,slug,name_en,name_zh,description_en,description_zh,display_order,icon_key").order("display_order").abortSignal(timeout()),
    supabase.from("achievement_definitions").select("id,slug,category_id,name_en,name_zh,description_en,description_zh,badge_type,icon_key,unlock_rule_type,unlock_rule_config,display_order").order("display_order").abortSignal(timeout()),
    supabase.from("achievement_levels").select("id,achievement_definition_id,level_key,level_order,threshold_value,threshold_unit,name_en,name_zh").order("level_order").abortSignal(timeout()),
    supabase.rpc("get_my_achievement_progress").abortSignal(metricsTimeout()),
    supabase.from("user_achievement_featured_preferences").select("featured_definition_ids").eq("user_id", userId).abortSignal(timeout()).maybeSingle(),
    supabase.from("user_achievements").select("achievement_definition_id,achievement_level_id,unlocked_at").eq("user_id", userId).order("unlocked_at", { ascending: false }).abortSignal(timeout()),
  ]);
  if (categoriesResult.error || definitionsResult.error || levelsResult.error || metricsResult.error || initialUnlockedResult.error) {
    logAchievementError("categories", categoriesResult.error);
    logAchievementError("definitions", definitionsResult.error);
    logAchievementError("levels", levelsResult.error);
    logAchievementError("metrics", metricsResult.error);
    logAchievementError("user achievements", initialUnlockedResult.error);
    // Do not turn a failed query into the normal empty state. The UI needs to
    // distinguish a database failure from a user with no unlocked badges.
    const loadErrorSource = categoriesResult.error ? "categories" : definitionsResult.error ? "definitions" : levelsResult.error ? "levels" : metricsResult.error ? "metrics" : "user_achievements";
    const failedResult = categoriesResult.error || definitionsResult.error || levelsResult.error || metricsResult.error || initialUnlockedResult.error;
    return { ready: false, loadError: true, loadErrorSource, loadErrorCode: failedResult?.code, categories: [], items: [], featured: [], unlockedCount: 0, totalCount: 0, completionRate: 0, latest: null, highestTier: null };
  }

  const metrics = new Map<string, number>();
  for (const row of (metricsResult.data ?? []) as AchievementMetricRow[]) {
    const value = Number(row.metric_value);
    if (row.metric_type && Number.isFinite(value)) metrics.set(row.metric_type, value);
  }
  const levelRows = (levelsResult.data ?? []) as AchievementLevel[];
  const levelsByDefinition = new Map<string, AchievementLevel[]>();
  for (const level of levelRows) levelsByDefinition.set(level.achievement_definition_id, [...(levelsByDefinition.get(level.achievement_definition_id) ?? []), level]);
  const levelById = new Map(levelRows.map(level => [level.id, level]));
  const definitions = (definitionsResult.data ?? []) as Omit<AchievementDefinition, "levels">[];
  const buildItems = (awardRows: UserAchievement[]) => {
    const awardsByDefinition = new Map<string, UserAchievement[]>();
    for (const award of awardRows) awardsByDefinition.set(award.achievement_definition_id, [...(awardsByDefinition.get(award.achievement_definition_id) ?? []), award]);
    return definitions.map(definition => {
      const levels = (levelsByDefinition.get(definition.id) ?? []).sort((a, b) => a.level_order - b.level_order);
      const value = calculateProgress(definition, metrics);
      const level = value === null ? null : [...levels].reverse().find(item => value >= Number(item.threshold_value)) ?? null;
      const nextLevel = value === null ? levels[0] ?? null : levels.find(item => value < Number(item.threshold_value)) ?? null;
      const currentLevelOrder = level?.level_order ?? 0;
      const unlocked = (awardsByDefinition.get(definition.id) ?? [])
        .filter(award => (award.achievement_level_id ? levelById.get(award.achievement_level_id)?.level_order ?? 0 : 0) <= currentLevelOrder)
        .sort((left, right) => {
          const leftOrder = left.achievement_level_id ? levelById.get(left.achievement_level_id)?.level_order ?? 0 : 0;
          const rightOrder = right.achievement_level_id ? levelById.get(right.achievement_level_id)?.level_order ?? 0 : 0;
          return rightOrder - leftOrder;
        })[0] ?? null;
      return { ...definition, unlock_rule_config: asRecord(definition.unlock_rule_config), levels, unlocked, progress: { value, unit: levels[0]?.threshold_unit ?? null, level, nextLevel, isMaxLevel: Boolean(level && !nextLevel) } };
    });
  };
  let awardRows = (initialUnlockedResult.data ?? []) as UserAchievement[];
  let items: AchievementItem[] = buildItems(awardRows);
  let refreshError = false;
  const awardedLevelIds = new Set(awardRows.map(award => award.achievement_level_id).filter(Boolean));
  const needsBackfill = items.some(item => item.progress.value !== null && item.levels.some(level => Number(level.threshold_value) <= item.progress.value! && !awardedLevelIds.has(level.id)));
  if (needsBackfill) {
    const refreshResult = await supabase.rpc("refresh_my_achievements").abortSignal(timeout());
    logAchievementError("refresh_my_achievements", refreshResult.error);
    refreshError = Boolean(refreshResult.error);
    if (!refreshResult.error) {
      const refreshedAwards = await supabase.from("user_achievements").select("achievement_definition_id,achievement_level_id,unlocked_at").eq("user_id", userId).order("unlocked_at", { ascending: false }).abortSignal(timeout());
      logAchievementError("refreshed user achievements", refreshedAwards.error);
      if (!refreshedAwards.error) {
        awardRows = (refreshedAwards.data ?? []) as UserAchievement[];
        items = buildItems(awardRows);
      } else refreshError = true;
    }
  }
  const unlockedItems = items.filter(item => item.unlocked).sort((a, b) => String(b.unlocked?.unlocked_at).localeCompare(String(a.unlocked?.unlocked_at)));
  logAchievementError("featured preferences", featuredPreferencesResult.error);
  const storedFeaturedIds = Array.isArray(featuredPreferencesResult.data?.featured_definition_ids)
    ? featuredPreferencesResult.data.featured_definition_ids as string[]
    : [];
  // A preference is only a placement request. It must never make a locked or
  // stale definition appear as an earned badge. An empty/missing preference is
  // intentionally rendered as empty Featured Cabin so the user gets guidance.
  const featured = storedFeaturedIds
    .map(id => items.find(item => item.id === id))
    .filter((item): item is AchievementItem => Boolean(item?.unlocked))
    .slice(0, 5);
  const highestTier = unlockedItems.flatMap(item => item.levels.filter(level => level.id === item.unlocked?.achievement_level_id)).sort((a, b) => b.level_order - a.level_order)[0] ?? null;
  return { ready: true, categories: (categoriesResult.data ?? []) as AchievementCategory[], items, featured, unlockedCount: unlockedItems.length, totalCount: items.length, completionRate: items.length ? Math.round((unlockedItems.length / items.length) * 100) : 0, latest: unlockedItems[0] ?? null, highestTier, refreshError, hasFeaturedPreference: Boolean(featuredPreferencesResult.data) };
}
