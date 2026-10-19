import type { AchievementItem } from "@/lib/achievements/server";
import type { CSSProperties } from "react";

const tierColor: Record<string, string> = { bronze: "#b77645", silver: "#9ba8b5", gold: "#d5b36a", platinum: "#b7b8d7" };

function BadgeGlyph({ iconKey }: { iconKey: string }) {
  if (iconKey.includes("747") || iconKey.includes("triple-seven") || iconKey.includes("superjumbo")) return <path d="M3 13.5 21 10l-7.2 4.2-1.8 5.3-1.5-.2.4-5.5-6.5.8Z" />;
  if (iconKey.includes("globe") || iconKey.includes("country") || iconKey.includes("world") || iconKey.includes("around")) return <><circle cx="12" cy="12" r="7" /><path d="M5 12h14M12 5c2.2 2 2.2 12 0 14M12 5c-2.2 2-2.2 12 0 14" /></>;
  if (iconKey.includes("night") || iconKey.includes("red-eye") || iconKey.includes("sunrise") || iconKey.includes("new-year")) return <><path d="M16.5 4.5a6.5 6.5 0 1 0 3 12.2A7 7 0 1 1 16.5 4.5Z" /><path d="m7 17 10-4-4 3-1 3-1-3Z" /></>;
  if (iconKey.includes("heritage") || iconKey.includes("memorial")) return <><path d="M12 4c2.2 2.2 3 4 3 5.7A3 3 0 0 1 9 9.7C9 8 9.8 6.2 12 4Z" /><path d="M8 19h8M9.5 15.5h5" /></>;
  if (iconKey.includes("challenge")) return <><path d="m12 3 2.2 5.3L20 9l-4.4 3.7 1.3 5.6-4.9-3-4.9 3 1.3-5.6L4 9l5.8-.7Z" /></>;
  if (iconKey.includes("airport") || iconKey.includes("route") || iconKey.includes("capital")) return <><path d="M4 17c3.5-7 7.8-9.7 16-10" /><path d="m14 5 6 2-4 4M4 17h16" /></>;
  return <><path d="m3 13.5 18-3.5-7.2 4.2-1.8 5.3-1.5-.2.4-5.5-6.5.8Z" /><path d="M12 5v4" /></>;
}

export function AchievementBadge({ item, compact = false }: { item: AchievementItem; compact?: boolean }) {
  const tier = item.unlocked?.achievement_level_id ? item.levels.find(level => level.id === item.unlocked?.achievement_level_id)?.level_key : item.progress.level?.level_key;
  const color = tier ? tierColor[tier] : "#8b8a98";
  return <div className={`achievement-badge ${item.unlocked ? "achievement-badge-unlocked" : "achievement-badge-locked"} ${compact ? "achievement-badge-compact" : ""}`} style={{ "--achievement-metal": color } as CSSProperties} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55"><BadgeGlyph iconKey={item.icon_key} /></svg></div>;
}
