"use client";

import { useMemo, useState } from "react";
import { T, useLanguage, useText } from "@/components/i18n";
import { AchievementBadge } from "@/components/achievement-badge";
import { achievementCategoryCatalog } from "@/lib/achievements/categories";
import type { AchievementCabin, AchievementItem } from "@/lib/achievements/server";

function label(item: { name_en: string; name_zh: string; description_en: string; description_zh: string }, zh: boolean) { return { name: zh ? item.name_zh : item.name_en, description: zh ? item.description_zh : item.description_en }; }

export function AchievementCabin({ cabin }: { cabin: AchievementCabin }) {
  const [category, setCategory] = useState("all"); const [flippedId, setFlippedId] = useState<string | null>(null); const [featuredIds, setFeaturedIds] = useState<string[]>([]); const [featuredOpen, setFeaturedOpen] = useState(true);
  const { locale } = useLanguage(); const t = useText(); const zh = locale === "zh-CN";
  const visible = useMemo(() => cabin.items.filter(item => category === "all" || item.category_id === category), [cabin.items, category]);
  const categories = useMemo(() => achievementCategoryCatalog.map(config => cabin.categories.find(categoryItem => categoryItem.slug === config.slug) ?? { ...config, id: `placeholder-${config.slug}`, display_order: achievementCategoryCatalog.findIndex(item => item.slug === config.slug) + 1, icon_key: "achievement" }), [cabin.categories]);
  const selectedCategory = useMemo(() => category === "all" ? null : categories.find(item => item.id === category), [categories, category]);
  const featuredItems = useMemo(() => featuredIds.map(id => cabin.items.find(item => item.id === id) ?? null), [cabin.items, featuredIds]);
  const addToFeatured = (item: AchievementItem) => setFeaturedIds(ids => ids.includes(item.id) || ids.length >= 5 ? ids : [...ids, item.id]);
  const removeFromFeatured = (item: AchievementItem) => setFeaturedIds(ids => ids.filter(id => id !== item.id));
  if (!cabin.ready) return <section className="mt-8 rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center text-muted"><T id="achievements.setupRequired" /></section>;
  return <div className="achievement-cabin pb-12">
    <section className="achievement-hero"><div className="achievement-hero-copy"><h1 className="text-4xl font-bold tracking-tight sm:text-5xl"><T id="achievements.title" /></h1></div><div className="achievement-summary-grid">{[["achievements.unlocked", String(cabin.unlockedCount)],["achievements.completionRate", `${cabin.completionRate}%`],["achievements.latest", cabin.latest ? label(cabin.latest, zh).name : t("achievements.none")],["achievements.highestTier", cabin.highestTier ? (zh ? cabin.highestTier.name_zh : cabin.highestTier.name_en) : t("achievements.none")]].map(([key,value]) => <div key={key} className="achievement-summary"><span><T id={key} /></span><strong>{value}</strong></div>)}</div></section>
    <section className={`achievement-cabin-featured spotlight-card ${featuredOpen ? "" : "is-collapsed"}`}><div className="achievement-cabin-featured-header"><h2 className="text-2xl font-bold"><T source="Featured Cabin" /></h2><button type="button" className="achievement-cabin-toggle" onClick={() => setFeaturedOpen(open => !open)} aria-expanded={featuredOpen} aria-label={featuredOpen ? (zh ? "折叠 Featured Cabin" : "Collapse Featured Cabin") : (zh ? "展开 Featured Cabin" : "Expand Featured Cabin")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={featuredOpen ? "" : "is-collapsed"}><path d="m6 15 6-6 6 6" /></svg></button></div><div className={`achievement-window-row ${featuredOpen ? "" : "is-collapsed"}`} aria-hidden={!featuredOpen}>{Array.from({ length: 5 }, (_, index) => <FeaturedAchievementWindow key={index} index={index} label={t("achievements.featured")} item={featuredItems[index] ?? undefined} />)}</div></section>
    <nav className="achievement-category-nav" aria-label={t("achievements.categories")}>{[{ id: "all", name_en: t("achievements.allCategories"), name_zh: t("achievements.allCategories") }, ...categories].map(item => { const count = item.id === "all" ? cabin.unlockedCount : cabin.items.filter(entry => entry.category_id === item.id && entry.unlocked).length; const total = item.id === "all" ? cabin.totalCount : cabin.items.filter(entry => entry.category_id === item.id).length; return <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={category === item.id ? "is-active" : ""}><span>{zh ? item.name_zh : item.name_en}</span><small>{count} / {total}</small></button>; })}</nav>
    <section className="achievement-list">{selectedCategory && <p className="eyebrow achievement-list-title">{zh ? selectedCategory.name_zh : selectedCategory.name_en}</p>}{visible.length ? <div className="achievement-gallery">{visible.map(item => <AchievementCard key={item.id} item={item} zh={zh} flipped={flippedId === item.id} featured={featuredIds.includes(item.id)} featuredFull={featuredIds.length >= 5} onFlip={() => setFlippedId(current => current === item.id ? null : item.id)} onAddToFeatured={() => addToFeatured(item)} onRemoveFromFeatured={() => removeFromFeatured(item)} />)}</div> : <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted"><T id="achievements.emptyFilter" /></div>}</section>
  </div>;
}

function FeaturedAchievementWindow({ index, label: windowLabel, item }: { index: number; label: string; item?: AchievementItem }) {
  if (item) {
    const copy = `${item.name_en} — ${item.unlocked ? "Unlocked" : "Locked"}`;
    return <button type="button" className="achievement-window" title={copy}><AchievementBadge item={item} compact /><span className="sr-only">{copy}</span></button>;
  }
  return <div className="achievement-window achievement-window-placeholder" role="img" aria-label={`${windowLabel} ${index + 1}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" aria-hidden="true"><path d="m3 13.5 18-3.5-7.2 4.2-1.8 5.3-1.5-.2.4-5.5-6.5.8Z" /><path d="M12 5v4" /></svg></div>;
}

function AchievementCard({ item, zh, flipped, featured, featuredFull, onFlip, onAddToFeatured, onRemoveFromFeatured }: { item: AchievementItem; zh: boolean; flipped: boolean; featured: boolean; featuredFull: boolean; onFlip: () => void; onAddToFeatured: () => void; onRemoveFromFeatured: () => void }) {
  const copy = label(item, zh);
  const level = item.unlocked?.achievement_level_id ? item.levels.find(entry => entry.id === item.unlocked?.achievement_level_id) : item.progress.level;
  const next = item.progress.nextLevel;
  const value = item.progress.value ?? 0;
  const target = Number(next?.threshold_value ?? level?.threshold_value ?? 0);
  const progress = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const remaining = next ? Math.max(0, Number(next.threshold_value) - value) : 0;
  const unit = formatAchievementUnit(item.progress.unit, remaining || value, zh);
  const progressCopy = next
    ? (zh ? `距离下一等级还差 ${remaining} ${unit}` : `${remaining} more ${unit} to the next level`)
    : (zh ? "已达到最高等级" : "Highest tier reached");

  return <article className={`achievement-card spotlight-card ${item.unlocked ? "is-unlocked" : "is-locked"} ${flipped ? "is-flipped" : ""}`}>
    <div className="achievement-card-inner">
      <button type="button" className="achievement-card-face achievement-card-front" onClick={onFlip} aria-pressed={flipped}>
        <AchievementBadge item={item} />
        <h3>{copy.name}</h3>
      </button>
      <div className="achievement-card-face achievement-card-back" onClick={onFlip}>
        <div>
          <h3>{copy.name}</h3>
          {level && <p className="achievement-tier">{zh ? level.name_zh : level.name_en}</p>}
        </div>
        <div className="achievement-progress">
          <div className="achievement-progress-label"><span>{value} / {target} {formatAchievementUnit(item.progress.unit, target, zh)}</span><span>{progress}%</span></div>
          <div className="achievement-progress-track"><i style={{ width: `${progress}%` }} /></div>
          <p>{progressCopy}</p>
        </div>
        <button type="button" className={`${featured ? "button-danger" : "button-primary"} achievement-feature-button`} disabled={!featured && featuredFull} onClick={event => { event.stopPropagation(); if (featured) onRemoveFromFeatured(); else onAddToFeatured(); }}>
          <T source={featured ? "Remove from Featured" : "Add to Featured"} />
        </button>
      </div>
    </div>
  </article>;
}

function formatAchievementUnit(unit: string | null | undefined, quantity: number, zh: boolean) {
  if (!unit) return "";
  if (zh) {
    const zhUnits: Record<string, string> = { flights: "趟航班", countries: "个国家", routes: "条航线", airports: "座机场" };
    return zhUnits[unit] ?? unit;
  }
  return quantity === 1 && unit.endsWith("s") ? unit.slice(0, -1) : unit;
}
