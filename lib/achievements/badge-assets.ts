import type { AchievementItem, AchievementLevel } from "@/lib/achievements/server";

export type AchievementBadgeAssetTier = "bronze" | "silver" | "gold" | "purple";

type BadgeAssetSeries = Readonly<Record<AchievementBadgeAssetTier, string>>;

const badgeAssetTiers: readonly AchievementBadgeAssetTier[] = ["bronze", "silver", "gold", "purple"];

function defineBadgeAssetSeries(folder: string, filePrefix: string): BadgeAssetSeries {
  return Object.fromEntries(
    badgeAssetTiers.map(tier => [
      tier,
      `/achievements/${folder}/${filePrefix} ${tier[0].toUpperCase()}${tier.slice(1)}.png`,
    ]),
  ) as Record<AchievementBadgeAssetTier, string>;
}

/**
 * The single source of truth for official Achievement artwork.
 *
 * Definition slugs are stable database identifiers. Asset tiers use the
 * product-facing Purple name; `achievementAssetTierFor` translates the legacy
 * persisted `platinum` level key without changing existing achievement data.
 */
export const achievementBadgeAssets = {
  "frequent-flyer": defineBadgeAssetSeries("frequent-flyer", "Frequent Flyer"),
  "time-aloft": defineBadgeAssetSeries("time-aloft", "Time Aloft"),
  "distance-traveller": defineBadgeAssetSeries("distance-traveller", "Distance Traveller"),
  "country-collector": defineBadgeAssetSeries("country-collector", "Country Collector"),
  "airport-explorer": defineBadgeAssetSeries("airport-explorer", "Airport Explorer"),
  "continental-explorer": defineBadgeAssetSeries("continental-explorer", "Continental Explorer"),
  "city-hopper": defineBadgeAssetSeries("city-hopper", "City Hopper"),
  "fleet-collector": defineBadgeAssetSeries("fleet-collector", "Fleet Collector"),
  "boeing-explorer": defineBadgeAssetSeries("boeing-explorer", "Boeing Explorer"),
  "airbus-explorer": defineBadgeAssetSeries("airbus-explorer", "Airbus Explorer"),
  "route-collector": defineBadgeAssetSeries("route-collector", "Route Collector"),
  "international-routes": defineBadgeAssetSeries("international-routes", "International Routes"),
  "challenge-pilot": defineBadgeAssetSeries("challenge-pilot", "Challenge Pilot"),
  "heritage-keeper": defineBadgeAssetSeries("heritage-keeper", "Heritage Keeper"),
} as const satisfies Record<string, BadgeAssetSeries>;

export const specialAchievementBadgeAssets: Readonly<Record<string, string>> = {
  "first-flight": "/achievements/special/first-flight.png",
  "first-international-flight": "/achievements/special/first-international-flight.png",
  "widebody-debut": "/achievements/special/widebody-debut.png",
  "narrowbody-debut": "/achievements/special/narrowbody-debut.png",
  "queen-of-the-skies": "/achievements/special/queen-of-the-skies.png",
  "superjumbo-experience": "/achievements/special/superjumbo experience.png",
  "across-the-atlantic": "/achievements/special/across-the-atlantic.png",
  "across-the-pacific": "/achievements/special/across-the-pacific.png",
  "around-the-world": "/achievements/special/around-the-world.png",
  "long-haul-pioneer": "/achievements/special/long-haul-pioneer.png",
  "new-year-in-the-sky": "/achievements/special/new-year-in-the-sky.png",
  "first-memorial-flight": "/achievements/special/first-memorial-flight.png",
  "round-tripper": "/achievements/special/round-tripper.png",
  "challenge-accepted": "/achievements/special/challenge-accepted.png",
};

export type AchievementBadgeSeriesSlug = keyof typeof achievementBadgeAssets;

function normalizeAchievementSlug(slug: string) {
  return slug.trim().toLowerCase().replaceAll("_", "-").replace(/\s+/g, "-");
}

export function achievementAssetTierFor(levelKey: AchievementLevel["level_key"]): AchievementBadgeAssetTier {
  return levelKey === "platinum" ? "purple" : levelKey;
}

export function achievementTierFor(item: AchievementItem) {
  if (item.displayLevelKey) return item.displayLevelKey;
  return item.unlocked?.achievement_level_id
    ? item.levels.find(level => level.id === item.unlocked?.achievement_level_id)?.level_key
    : item.progress.level?.level_key;
}

export function achievementBadgeAssetFor(slug: string, levelKey: AchievementLevel["level_key"]) {
  const normalizedSlug = normalizeAchievementSlug(slug) as AchievementBadgeSeriesSlug;
  const series = achievementBadgeAssets[normalizedSlug];
  return series?.[achievementAssetTierFor(levelKey)] ?? null;
}

export function achievementBadgeAssetForDefinition(slug: string) {
  const normalizedSlug = normalizeAchievementSlug(slug);
  return specialAchievementBadgeAssets[normalizedSlug] ?? null;
}

export function achievementBadgeAsset(item: AchievementItem) {
  if (item.badge_type === "standalone") return achievementBadgeAssetForDefinition(item.slug);
  const tier = achievementTierFor(item);
  return tier ? achievementBadgeAssetFor(item.slug, tier) : null;
}
