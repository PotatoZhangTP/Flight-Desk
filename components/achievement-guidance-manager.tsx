"use client";

import { useMemo, useState } from "react";
import { saveAchievementGuidance } from "@/app/admin/achievement-guidance/actions";

type Definition = { id: string; slug: string; name_en: string; name_zh: string; badge_type: string };
type Level = { id: string; achievement_definition_id: string; level_key: string; level_order: number; name_en: string; name_zh: string };
type Guidance = { achievement_level_id: string; guidance_en: string; guidance_zh: string; updated_at: string };

export function AchievementGuidanceManager({ definitions, levels, guidance }: { definitions: Definition[]; levels: Level[]; guidance: Guidance[] }) {
  const [selectedId, setSelectedId] = useState(definitions[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const selected = definitions.find(item => item.id === selectedId);
  const selectedLevels = useMemo(() => levels.filter(level => level.achievement_definition_id === selectedId).sort((a, b) => a.level_order - b.level_order), [levels, selectedId]);
  const guidanceByLevel = useMemo(() => new Map(guidance.map(item => [item.achievement_level_id, item])), [guidance]);
  return <div className="mt-10 grid gap-6 lg:grid-cols-[16rem_1fr]">
    <nav className="rounded-2xl border border-line bg-surface p-3" aria-label="Badge series"><p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-muted">Badge series</p>{definitions.map(item => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setMessage(""); }} className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${item.id === selectedId ? "bg-brand-soft text-brand" : "text-muted hover:bg-brand-soft/50"}`}>{item.name_en}</button>)}</nav>
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">{selected ? <><h2 className="text-2xl font-bold">{selected.name_en}</h2><p className="mt-1 text-sm text-muted">{selected.slug}</p><div className="mt-6 space-y-5">{selectedLevels.map(level => { const saved = guidanceByLevel.get(level.id); return <form key={level.id} action={async formData => { const result = await saveAchievementGuidance(formData); setMessage(result.error ?? result.success ?? ""); }} className="rounded-2xl border border-line p-4"><input type="hidden" name="level_id" value={level.id} /><h3 className="font-bold">{level.level_key === "platinum" ? "Purple" : level.name_en}</h3><label className="mt-3 block text-sm font-semibold">English<textarea name="guidance_en" defaultValue={saved?.guidance_en ?? ""} maxLength={5000} rows={3} className="mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal outline-none focus:border-brand" placeholder="Explain how this level is unlocked." /></label><label className="mt-3 block text-sm font-semibold">简体中文<textarea name="guidance_zh" defaultValue={saved?.guidance_zh ?? ""} maxLength={5000} rows={3} className="mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal outline-none focus:border-brand" placeholder="说明该等级的解锁条件。" /></label><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-muted">{saved?.updated_at ? `Updated ${new Date(saved.updated_at).toLocaleString()}` : "Not added yet"}</span><button type="submit" className="button-primary">Save</button></div></form>; })}</div>{message && <p className="mt-4 text-sm font-semibold text-brand" role="status">{message}</p>}</> : <p className="text-muted">No badge series found.</p>}</section>
  </div>;
}
