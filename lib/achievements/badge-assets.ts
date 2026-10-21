import type { AchievementItem, AchievementLevel } from "@/lib/achievements/server";

const achievementBadgeAssets: Record<string, Partial<Record<AchievementLevel["level_key"], string>>> = {
  "frequent-flyer": {
    bronze: "/achievements/frequent-flyer/bronze.png",
    silver: "/achievements/frequent-flyer/silver.png",
    gold: "/achievements/frequent-flyer/gold.png",
    // The persisted database key remains platinum for compatibility; its product
    // name and visual tier are Purple.
    platinum: "/achievements/frequent-flyer/purple.png",
  },
};

export function achievementTierFor(item: AchievementItem) {
  return item.unlocked?.achievement_level_id
    ? item.levels.find(level => level.id === item.unlocked?.achievement_level_id)?.level_key
    : item.progress.level?.level_key;
}

export function achievementBadgeAsset(item: AchievementItem) {
  const tier = achievementTierFor(item);
  return tier ? achievementBadgeAssets[item.slug]?.[tier] ?? null : null;
}
