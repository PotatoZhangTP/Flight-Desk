"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { T, useLanguage, useText } from "@/components/i18n";
import { AchievementBadge } from "@/components/achievement-badge";
import { achievementBadgeAsset, achievementTierFor } from "@/lib/achievements/badge-assets";
import { achievementCategoryCatalog } from "@/lib/achievements/categories";
import type { AchievementCabin, AchievementItem } from "@/lib/achievements/server";

function label(item: { name_en: string; name_zh: string; description_en: string; description_zh: string }, zh: boolean) { return { name: zh ? item.name_zh : item.name_en, description: zh ? item.description_zh : item.description_en }; }

export function AchievementCabin({ cabin }: { cabin: AchievementCabin }) {
  const [category, setCategory] = useState("all"); const [flippedId, setFlippedId] = useState<string | null>(null); const [featuredIds, setFeaturedIds] = useState<string[]>(() => cabin.featured.map(item => item.id)); const [featuredOpen, setFeaturedOpen] = useState(true); const [selectedFeaturedId, setSelectedFeaturedId] = useState<string | null>(null); const [featuredError, setFeaturedError] = useState<string | null>(null); const [featuredSaving, setFeaturedSaving] = useState(false); const [previewItem, setPreviewItem] = useState<AchievementItem | null>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null); const previewDialogRef = useRef<HTMLDivElement | null>(null);
  const { locale } = useLanguage(); const t = useText(); const zh = locale === "zh-CN";
  const visible = useMemo(() => cabin.items.filter(item => category === "all" || item.category_id === category), [cabin.items, category]);
  const categories = useMemo(() => achievementCategoryCatalog.map(config => cabin.categories.find(categoryItem => categoryItem.slug === config.slug) ?? { ...config, id: `placeholder-${config.slug}`, display_order: achievementCategoryCatalog.findIndex(item => item.slug === config.slug) + 1, icon_key: "achievement" }), [cabin.categories]);
  const selectedCategory = useMemo(() => category === "all" ? null : categories.find(item => item.id === category), [categories, category]);
  const featuredItems = useMemo(() => featuredIds.map(id => cabin.items.find(item => item.id === id) ?? null), [cabin.items, featuredIds]);
  const saveFeaturedIds = async (nextIds: string[]) => {
    const previousIds = featuredIds;
    setFeaturedError(null);
    setFeaturedIds(nextIds);
    setFeaturedSaving(true);
    try {
      const response = await fetch("/api/achievements/featured", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featuredDefinitionIds: nextIds }) });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not save Featured Cabin.");
      return true;
    } catch (error) {
      setFeaturedIds(previousIds);
      setFeaturedError(error instanceof Error ? error.message : "Could not save Featured Cabin.");
      return false;
    } finally {
      setFeaturedSaving(false);
    }
  };
  const addToFeatured = (item: AchievementItem) => { if (!featuredIds.includes(item.id) && featuredIds.length < 5) void saveFeaturedIds([...featuredIds, item.id]); };
  const removeFromFeatured = (item: AchievementItem) => { if (featuredIds.includes(item.id)) void saveFeaturedIds(featuredIds.filter(id => id !== item.id)); };
  const removeSelectedFeatured = async (event: React.MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); if (!selectedFeaturedId) return; const saved = await saveFeaturedIds(featuredIds.filter(id => id !== selectedFeaturedId)); if (saved) setSelectedFeaturedId(null); };
  const toggleFeaturedOpen = (event: React.MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); setFeaturedOpen(open => !open); setSelectedFeaturedId(null); };
  const openPreview = (item: AchievementItem, trigger: HTMLButtonElement) => { previewTriggerRef.current = trigger; setPreviewItem(item); };
  const closePreview = () => setPreviewItem(null);
  useEffect(() => {
    if (!previewItem) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closePreview(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    previewDialogRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); previewTriggerRef.current?.focus(); };
  }, [previewItem]);
  if (!cabin.ready) return <section className="mt-8 rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center text-muted"><p>{cabin.loadError ? "Achievement data could not be loaded. Please try again shortly." : <T id="achievements.setupRequired" />}</p>{cabin.loadErrorSource && <p className="mt-2 text-xs text-subtle">Reference: ACHIEVEMENTS_{cabin.loadErrorSource.toUpperCase()}</p>}</section>;
  return <div className="achievement-cabin pb-12">
    <section className="achievement-hero"><div className="achievement-hero-copy"><h1 className="text-4xl font-bold tracking-tight sm:text-5xl"><T id="achievements.title" /></h1></div><div className="achievement-summary-grid">{[["achievements.unlocked", String(cabin.unlockedCount)],["achievements.completionRate", `${cabin.completionRate}%`],["achievements.latest", cabin.latest ? label(cabin.latest, zh).name : t("achievements.none")],["achievements.highestTier", cabin.highestTier ? (zh ? cabin.highestTier.name_zh : cabin.highestTier.name_en) : t("achievements.none")]].map(([key,value]) => <div key={key} className="achievement-summary"><span><T id={key} /></span><strong>{value}</strong></div>)}</div></section>
    <section className={`achievement-cabin-featured spotlight-card ${featuredOpen ? "" : "is-collapsed"}`} onClick={() => setSelectedFeaturedId(null)}><div className="achievement-cabin-featured-header"><h2 className="text-2xl font-bold"><T source="Featured Cabin" /></h2><div className="achievement-cabin-actions">{selectedFeaturedId && <button type="button" className="button-danger achievement-remove-featured" disabled={featuredSaving} onClick={removeSelectedFeatured}><T source="Remove from Featured" /></button>}<button type="button" className="achievement-cabin-toggle" onClick={toggleFeaturedOpen} aria-expanded={featuredOpen} aria-label={featuredOpen ? (zh ? "折叠 Featured Cabin" : "Collapse Featured Cabin") : (zh ? "展开 Featured Cabin" : "Expand Featured Cabin")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={featuredOpen ? "" : "is-collapsed"}><path d="m6 15 6-6 6 6" /></svg></button></div></div><div className={`achievement-window-row ${featuredOpen ? "" : "is-collapsed"}`} aria-hidden={!featuredOpen}>{Array.from({ length: 5 }, (_, index) => <FeaturedAchievementWindow key={index} index={index} label={t("achievements.featured")} item={featuredItems[index] ?? undefined} selected={featuredItems[index]?.id === selectedFeaturedId} onSelect={item => setSelectedFeaturedId(current => current === item.id ? null : item.id)} />)}</div>{featuredError && <p className="achievement-featured-error" role="alert">{featuredError}</p>}</section>
    <nav className="achievement-category-nav" aria-label={t("achievements.categories")}>{[{ id: "all", name_en: t("achievements.allCategories"), name_zh: t("achievements.allCategories") }, ...categories].map(item => { const count = item.id === "all" ? cabin.unlockedCount : cabin.items.filter(entry => entry.category_id === item.id && entry.unlocked).length; const total = item.id === "all" ? cabin.totalCount : cabin.items.filter(entry => entry.category_id === item.id).length; return <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={category === item.id ? "is-active" : ""}><span>{zh ? item.name_zh : item.name_en}</span><small>{count} / {total}</small></button>; })}</nav>
    <section className="achievement-list">{selectedCategory && <p className="eyebrow achievement-list-title">{zh ? selectedCategory.name_zh : selectedCategory.name_en}</p>}{visible.length ? <div className="achievement-gallery">{visible.map(item => <AchievementCard key={item.id} item={item} zh={zh} flipped={flippedId === item.id} featured={featuredIds.includes(item.id)} featuredFull={featuredIds.length >= 5} onFlip={() => setFlippedId(current => current === item.id ? null : item.id)} onAddToFeatured={() => addToFeatured(item)} onRemoveFromFeatured={() => removeFromFeatured(item)} onPreview={openPreview} />)}</div> : <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted"><T id="achievements.emptyFilter" /></div>}</section>
    {previewItem && <AchievementPreviewModal item={previewItem} zh={zh} dialogRef={previewDialogRef} onClose={closePreview} />}
  </div>;
}

function FeaturedAchievementWindow({ index, label: windowLabel, item, selected, onSelect }: { index: number; label: string; item?: AchievementItem; selected: boolean; onSelect: (item: AchievementItem) => void }) {
  if (item) {
    const copy = `${item.name_en} — ${item.unlocked ? "Unlocked" : "Locked"}`;
    return <button type="button" className={`achievement-window ${selected ? "is-selected" : ""}`} title={copy} aria-pressed={selected} onClick={event => { event.stopPropagation(); onSelect(item); }}><AchievementBadge item={item} compact eager /><span className="sr-only">{copy}</span></button>;
  }
  return <div className="achievement-window achievement-window-placeholder" role="img" aria-label={`${windowLabel} ${index + 1}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" aria-hidden="true"><path d="m3 13.5 18-3.5-7.2 4.2-1.8 5.3-1.5-.2.4-5.5-6.5.8Z" /><path d="M12 5v4" /></svg></div>;
}

function AchievementCard({ item, zh, flipped, featured, featuredFull, onFlip, onAddToFeatured, onRemoveFromFeatured, onPreview }: { item: AchievementItem; zh: boolean; flipped: boolean; featured: boolean; featuredFull: boolean; onFlip: () => void; onAddToFeatured: () => void; onRemoveFromFeatured: () => void; onPreview: (item: AchievementItem, trigger: HTMLButtonElement) => void }) {
  const copy = label(item, zh);
  const level = item.unlocked?.achievement_level_id ? item.levels.find(entry => entry.id === item.unlocked?.achievement_level_id) : item.progress.level;
  const next = item.progress.nextLevel;
  const value = item.progress.value ?? 0;
  const target = Number(next?.threshold_value ?? level?.threshold_value ?? 0);
  const progress = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const remaining = next ? Math.max(0, Number(next.threshold_value) - value) : 0;
  const unit = formatAchievementUnit(item.progress.unit, remaining || value, zh);
  const displayValue = formatAchievementValue(value, item.progress.unit);
  const displayTarget = formatAchievementValue(target, item.progress.unit);
  const displayRemaining = formatAchievementValue(remaining, item.progress.unit);
  const progressCopy = next
    ? (zh ? `距离下一等级还差 ${displayRemaining} ${unit}` : `${displayRemaining} more ${unit} to the next level`)
    : (zh ? "已达到最高等级" : "Highest tier reached");

  return <article className={`achievement-card spotlight-card ${item.unlocked ? "is-unlocked" : "is-locked"} ${flipped ? "is-flipped" : ""}`}>
    <div className="achievement-card-inner">
      <button type="button" className="achievement-card-face achievement-card-front" onClick={onFlip} aria-pressed={flipped}>
        <AchievementBadge item={item} />
        <h3>{copy.name}</h3>
      </button>
      <div className="achievement-card-face achievement-card-back" onClick={onFlip}>
        {achievementBadgeAsset(item) && <button type="button" className="achievement-preview-expand" aria-label={zh ? `放大预览 ${copy.name}` : `Expand preview for ${copy.name}`} title={zh ? "放大预览" : "Expand preview"} onClick={event => { event.stopPropagation(); onPreview(item, event.currentTarget); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" /></svg></button>}
        <div>
          <h3>{copy.name}</h3>
          {level && <p className="achievement-tier">{zh ? level.name_zh : level.name_en}</p>}
        </div>
        <div className="achievement-progress">
          <div className="achievement-progress-label"><span>{displayValue} / {displayTarget} {formatAchievementUnit(item.progress.unit, target, zh)}</span><span>{progress}%</span></div>
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

function AchievementPreviewModal({ item, zh, dialogRef, onClose }: { item: AchievementItem; zh: boolean; dialogRef: React.RefObject<HTMLDivElement | null>; onClose: () => void }) {
  const imageSrc = achievementBadgeAsset(item);
  const tier = achievementTierFor(item);
  const level = tier ? item.levels.find(entry => entry.level_key === tier) : null;
  const copy = label(item, zh);
  if (!imageSrc) return null;
  return <div className="achievement-preview-backdrop" role="presentation" onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} className="achievement-preview-modal" role="dialog" aria-modal="true" aria-labelledby="achievement-preview-title" tabIndex={-1} onPointerDown={event => event.stopPropagation()}>
      <button type="button" className="achievement-preview-close" aria-label={zh ? "关闭预览" : "Close preview"} onClick={onClose}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
      <Image src={imageSrc} alt={`${copy.name}${level ? ` — ${zh ? level.name_zh : level.name_en}` : ""}`} width={660} height={660} sizes="(max-width: 640px) calc(100vw - 5rem), 480px" quality={90} loading="eager" fetchPriority="high" className="achievement-preview-image" />
      <p id="achievement-preview-title" className="achievement-preview-caption">{level ? (zh ? level.name_zh : level.name_en) : copy.name}</p>
    </div>
  </div>;
}

function formatAchievementUnit(unit: string | null | undefined, quantity: number, zh: boolean) {
  if (!unit) return "";
  if (zh) {
    const zhUnits: Record<string, string> = { flights: "趟航班", hours: "小时", km: "公里", countries: "个国家", airports: "座机场", continents: "个大洲", cities: "座城市", "aircraft types": "种机型", routes: "条航线", challenges: "次挑战", "memorial flights": "次纪念飞行" };
    return zhUnits[unit] ?? unit;
  }
  return quantity === 1 && unit.endsWith("s") ? unit.slice(0, -1) : unit;
}

function formatAchievementValue(value: number, unit: string | null | undefined) {
  if (!Number.isFinite(value)) return "0";
  if (unit === "hours") return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
  return String(Math.round(value));
}
