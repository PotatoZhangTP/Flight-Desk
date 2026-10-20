"use client";

import { useMemo, useState } from "react";
import { T, useLanguage, useText } from "@/components/i18n";
import { AchievementBadge } from "@/components/achievement-badge";
import { achievementCategoryCatalog } from "@/lib/achievements/categories";
import type { AchievementCabin, AchievementItem } from "@/lib/achievements/server";

type Filter = "all" | "unlocked" | "locked" | "progressive" | "standalone";
const filters: Filter[] = ["all", "unlocked", "locked", "progressive", "standalone"];

function label(item: { name_en: string; name_zh: string; description_en: string; description_zh: string }, zh: boolean) { return { name: zh ? item.name_zh : item.name_en, description: zh ? item.description_zh : item.description_en }; }

export function AchievementCabin({ cabin }: { cabin: AchievementCabin }) {
  const [filter, setFilter] = useState<Filter>("all"); const [category, setCategory] = useState("all"); const [flippedId, setFlippedId] = useState<string | null>(null); const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const { locale } = useLanguage(); const t = useText(); const zh = locale === "zh-CN";
  const visible = useMemo(() => cabin.items.filter(item => (category === "all" || item.category_id === category) && (filter === "all" || filter === "unlocked" && item.unlocked || filter === "locked" && !item.unlocked || filter === "progressive" && item.badge_type === "progressive" || filter === "standalone" && item.badge_type === "standalone")), [cabin.items, category, filter]);
  const categories = useMemo(() => achievementCategoryCatalog.map(config => cabin.categories.find(categoryItem => categoryItem.slug === config.slug) ?? { ...config, id: `placeholder-${config.slug}`, display_order: achievementCategoryCatalog.findIndex(item => item.slug === config.slug) + 1, icon_key: "achievement" }), [cabin.categories]);
  const featuredItems = useMemo(() => featuredIds.map(id => cabin.items.find(item => item.id === id) ?? null), [cabin.items, featuredIds]);
  const addToFeatured = (item: AchievementItem) => setFeaturedIds(ids => ids.includes(item.id) || ids.length >= 5 ? ids : [...ids, item.id]);
  if (!cabin.ready) return <section className="mt-8 rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center text-muted"><T id="achievements.setupRequired" /></section>;
  return <div className="achievement-cabin pb-12">
    <section className="achievement-hero"><div className="achievement-hero-copy"><p className="eyebrow"><T id="achievements.kicker" /></p><h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl"><T id="achievements.title" /></h1></div><div className="achievement-summary-grid">{[["achievements.unlocked", String(cabin.unlockedCount)],["achievements.completionRate", `${cabin.completionRate}%`],["achievements.latest", cabin.latest ? label(cabin.latest, zh).name : t("achievements.none")],["achievements.highestTier", cabin.highestTier ? (zh ? cabin.highestTier.name_zh : cabin.highestTier.name_en) : t("achievements.none")]].map(([key,value]) => <div key={key} className="achievement-summary"><span><T id={key} /></span><strong>{value}</strong></div>)}</div></section>
    <section className="achievement-cabin-featured spotlight-card"><div><p className="eyebrow"><T id="achievements.featuredKicker" /></p><h2 className="mt-2 text-2xl font-bold"><T id="achievements.featured" /></h2></div><div className="achievement-window-row">{Array.from({ length: 5 }, (_, index) => <FeaturedAchievementWindow key={index} index={index} label={t("achievements.featured")} item={featuredItems[index] ?? undefined} />)}</div></section>
    <nav className="achievement-category-nav" aria-label={t("achievements.categories")}>{[{ id: "all", name_en: t("achievements.allCategories"), name_zh: t("achievements.allCategories") }, ...categories].map(item => { const count = item.id === "all" ? cabin.unlockedCount : cabin.items.filter(entry => entry.category_id === item.id && entry.unlocked).length; const total = item.id === "all" ? cabin.totalCount : cabin.items.filter(entry => entry.category_id === item.id).length; return <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={category === item.id ? "is-active" : ""}><span>{zh ? item.name_zh : item.name_en}</span><small>{count} / {total}</small></button>; })}</nav>
    <div className="mt-8 flex flex-wrap gap-2" aria-label={t("achievements.filters")}>{filters.map(item => <button key={item} type="button" onClick={() => setFilter(item)} className={`button-secondary min-h-0 px-3 py-1.5 text-xs ${filter === item ? "bg-brand-soft" : ""}`}><T id={`achievements.filter.${item}`} /></button>)}</div>
    <section className="mt-6">{cabin.categories.filter(entry => category === "all" || category === entry.id).map(entry => { const items = visible.filter(item => item.category_id === entry.id); if (!items.length) return null; return <div key={entry.id} className="achievement-category-section"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="eyebrow">{zh ? entry.name_zh : entry.name_en}</p><p className="mt-2 text-sm text-muted">{zh ? entry.description_zh : entry.description_en}</p></div><span className="text-sm font-bold text-muted">{items.filter(item => item.unlocked).length} / {items.length}</span></div><div className="achievement-gallery">{items.map(item => <AchievementCard key={item.id} item={item} zh={zh} flipped={flippedId === item.id} featured={featuredIds.includes(item.id)} featuredFull={featuredIds.length >= 5} onFlip={() => setFlippedId(current => current === item.id ? null : item.id)} onAddToFeatured={() => addToFeatured(item)} />)}</div></div>; })}{!visible.length && <div className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center text-muted"><T id="achievements.emptyFilter" /></div>}</section>
  </div>;
}

function FeaturedAchievementWindow({ index, label: windowLabel, item }: { index: number; label: string; item?: AchievementItem }) {
  if (item) {
    const copy = `${item.name_en} — ${item.unlocked ? "Unlocked" : "Locked"}`;
    return <button type="button" className="achievement-window" title={copy}><AchievementBadge item={item} compact /><span className="sr-only">{copy}</span></button>;
  }
  return <div className="achievement-window achievement-window-placeholder" role="img" aria-label={`${windowLabel} ${index + 1}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" aria-hidden="true"><path d="m3 13.5 18-3.5-7.2 4.2-1.8 5.3-1.5-.2.4-5.5-6.5.8Z" /><path d="M12 5v4" /></svg></div>;
}

function AchievementCard({ item, zh, flipped, featured, featuredFull, onFlip, onAddToFeatured }: { item: AchievementItem; zh: boolean; flipped: boolean; featured: boolean; featuredFull: boolean; onFlip: () => void; onAddToFeatured: () => void }) {
  const copy = label(item, zh); const level = item.unlocked?.achievement_level_id ? item.levels.find(entry => entry.id === item.unlocked?.achievement_level_id) : item.progress.level; const next = item.progress.nextLevel; const value = item.progress.value ?? 0; const target = next?.threshold_value ?? level?.threshold_value ?? 0; const progress = target ? Math.min(100, Math.round((value / Number(target)) * 100)) : 0;
  return <article className={`achievement-card ${item.unlocked ? "is-unlocked" : "is-locked"} ${flipped ? "is-flipped" : ""}`}><div className="achievement-card-inner"><button type="button" className="achievement-card-face achievement-card-front" onClick={onFlip} aria-pressed={flipped}><AchievementBadge item={item} /><h3>{copy.name}</h3></button><div className="achievement-card-face achievement-card-back" onClick={onFlip}><div><h3>{copy.name}</h3><p className="achievement-tier">{level ? (zh ? level.name_zh : level.name_en) : <T id="achievements.notStarted" />}</p></div><div className="achievement-progress"><div><span>{value} / {target} {item.progress.unit}</span><span>{progress}%</span></div><i style={{ width: `${progress}%` }} /></div><button type="button" className="button-secondary achievement-feature-button" disabled={featured || featuredFull} onClick={event => { event.stopPropagation(); onAddToFeatured(); }}><T source={featured ? "Added to Featured" : "Add to Featured"} /></button></div></div></article>;
}
