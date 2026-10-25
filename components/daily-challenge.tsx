"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/navigation-link";
import { T, useLanguage, useText } from "@/components/i18n";
import { formatDistance } from "@/lib/preferences";
import { createClient } from "@/lib/supabase/browser";
import { MemorialFlightActions } from "@/components/memorial-flight-actions";
import { sortMemorialFlights } from "@/lib/memorial-flight-order";
import { simbriefUrl } from "@/lib/simbrief-url";
import type { MemorialPresentation } from "@/lib/memorial-presentation";

export type Challenge = { challenge_date: string; category: string; departure_iata: string; departure_icao: string; arrival_iata: string; arrival_icao: string; departure_name: string; arrival_name: string; estimated_minutes: number; distance_km: number; suggested_aircraft: string | null; about: string };
export type Memorial = MemorialPresentation & { id: string; event_key?: string; title_en: string; title_zh: string; description_en: string; description_zh: string; event_date?: string; event_year: number; event_month: number; event_day: number; recurring: boolean; departure_iata: string; departure_icao: string; arrival_iata: string; arrival_icao: string; suggested_aircraft: string | null };
type ChallengeData = { challenges: Challenge[]; memorials: Memorial[]; completedCategories?: string[]; flownCategories?: string[] };

export const challengeCategoryOrder = ["long", "medium", "quick", "regional"] as const;
const categoryRank = new Map<string, number>(challengeCategoryOrder.map((category, index) => [category, index]));
export const challengeCategoryLabel = (category: string) => ({ quick: "Quick Flight", regional: "Regional Flight", medium: "Medium Haul", long: "Long Haul" }[category] || category);
export const sortChallenges = (challenges: Challenge[]) => [...challenges].sort((left, right) => (categoryRank.get(left.category) ?? Number.MAX_SAFE_INTEGER) - (categoryRank.get(right.category) ?? Number.MAX_SAFE_INTEGER));
export const sortChallengesByDuration = (challenges: Challenge[]) => [...challenges].sort((left, right) => right.estimated_minutes - left.estimated_minutes || left.category.localeCompare(right.category));
const utcDate = () => new Date().toISOString().slice(0, 10);

function useDailyChallenges(initial?: ChallengeData) {
  const [data, setData] = useState<ChallengeData | null>(initial || null);
  const [loadedDate, setLoadedDate] = useState(initial?.challenges[0]?.challenge_date || utcDate());
  const [updating, setUpdating] = useState(false);
  const load = useCallback(async (date: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/challenges?date=${date}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error();
      const next = await response.json();
      setData({ challenges: next.challenges || [], memorials: next.memorials || [], completedCategories: next.completedCategories || [], flownCategories: next.flownCategories || [] });
      setLoadedDate(date);
    } catch { /* Preserve the last confirmed data while a refresh fails. */ }
    finally { setUpdating(false); }
  }, []);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let disposed = false;
    const check = () => {
      if (disposed) return;
      const current = utcDate();
      if (current !== loadedDate) void load(current);
      const wait = Date.now() + 86400000 - (Date.now() % 86400000) + 1000 - Date.now();
      timer = setTimeout(check, Math.max(1000, wait));
    };
    const resume = () => { if (utcDate() !== loadedDate) void load(utcDate()); };
    timer = setTimeout(check, Math.max(1000, Date.now() + 86400000 - (Date.now() % 86400000) + 1000 - Date.now()));
    document.addEventListener("visibilitychange", resume); window.addEventListener("focus", resume);
    return () => { disposed = true; clearTimeout(timer); document.removeEventListener("visibilitychange", resume); window.removeEventListener("focus", resume); };
  }, [load, loadedDate]);
  return { data, updating };
}

async function launchCompletionConfetti(button: HTMLButtonElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  const rect = button.getBoundingClientRect();
  const origin = { x: (rect.left + rect.width / 2) / window.innerWidth, y: Math.max(0, (rect.top + 6) / window.innerHeight) };
  const particleCount = window.innerWidth < 640 ? 30 : 46;
  const colors = ["#713cec", "#bda8ff", "#d5b36a", "#f7f0df"];
  confetti({ particleCount, angle: 120, spread: 52, startVelocity: 34, gravity: 1.05, ticks: 170, scalar: 0.82, origin, colors });
  confetti({ particleCount, angle: 60, spread: 52, startVelocity: 34, gravity: 1.05, ticks: 170, scalar: 0.82, origin, colors, shapes: ["square"] });
}

function CheckCircle() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.3 2.3 4.8-5" /></svg>;
}

function ChallengeCard({ item, compact = false, selected = false, completed = false, flownBefore = false, saving = false, onSelect, onToggleComplete, showActions = false }: { item: Challenge; compact?: boolean; selected?: boolean; completed?: boolean; flownBefore?: boolean; saving?: boolean; onSelect?: () => void; onToggleComplete?: (item: Challenge, button: HTMLButtonElement) => void; showActions?: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const { preferences } = useLanguage();
  const t = useText();
  const select = (event: React.MouseEvent) => { event.stopPropagation(); onSelect?.(); };
  const flip = () => setFlipped(value => !value);
  return <div className={`challenge-card spotlight-card relative rounded-2xl border [perspective:1000px] ${selected ? "border-brand/70 shadow-sm shadow-brand/20" : "border-transparent"}`} data-spotlight-active={selected ? "true" : "false"}>
    <button type="button" aria-label={`Select ${item.departure_iata} to ${item.arrival_iata}`} aria-pressed={selected} onClick={select} className={`absolute right-4 top-4 z-30 grid h-8 w-8 place-items-center rounded-full border-2 text-sm transition ${selected ? "border-brand bg-brand text-on-brand ring-2 ring-brand/20" : "border-line-strong bg-surface text-transparent hover:border-brand hover:ring-2 hover:ring-brand/15"}`}><span aria-hidden="true">✓</span></button>
    {(completed || flownBefore) && <div className="pointer-events-none absolute right-14 top-4 z-30 flex max-w-[calc(100%-5rem)] flex-wrap justify-end gap-1" aria-label={[completed && t("Completed"), flownBefore && t("Flown Before")].filter(Boolean).join(", ")}>{completed && <span className="rounded-full border border-brand/35 bg-brand-soft px-2 py-1 text-[9px] font-bold tracking-[0.08em] text-brand">COMPLETED</span>}{flownBefore && <span className="rounded-full border border-line-strong bg-page px-2 py-1 text-[9px] font-bold tracking-[0.08em] text-muted">FLOWN BEFORE</span>}</div>}
    <div className={`relative min-h-[160px] transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
      <button type="button" onClick={flip} className="group block min-h-[160px] w-full rounded-2xl border border-line bg-surface p-4 pr-16 text-left [backface-visibility:hidden] hover:border-brand/50">
        <span className="block text-sm font-bold text-brand"><T source={challengeCategoryLabel(item.category)} /></span>
        <span className="mt-2 block text-2xl font-bold">{item.departure_iata} <span className="text-brand">→</span> {item.arrival_iata}</span>
        <span className="mt-1.5 block text-sm text-muted">{item.departure_name} → {item.arrival_name}</span>
        <span className="mt-2 block text-sm text-muted">{t("flight.durationValue", { hours: Math.floor(item.estimated_minutes / 60), minutes: item.estimated_minutes % 60 })} · {formatDistance(item.distance_km, preferences.distanceUnit)} · {item.suggested_aircraft || "—"}</span>
      </button>
      <button type="button" onClick={flip} aria-label={t("Why this route?")} className="absolute inset-0 block min-h-[160px] w-full rounded-2xl border border-line bg-surface p-4 pr-16 text-left [backface-visibility:hidden] [transform:rotateY(180deg)]">
        <span className="block text-sm font-bold text-ink"><T source="Why this route?" /></span>
        <span className="mt-2 block text-sm leading-5 text-muted">{item.about}</span>
      </button>
    </div>
    {showActions && selected && !flipped && <div className="flex min-w-0 flex-wrap justify-center gap-2.5 px-4 pb-4 pt-3 sm:flex-nowrap">
      <a target="_blank" rel="noreferrer" href={simbriefUrl(item)} className="button-primary min-w-0 shrink whitespace-nowrap !px-2 !text-[12px] !tracking-[-0.2px]">Import to SimBrief ↗</a>
      <Link href={`/flights/new?departure=${item.departure_iata}&arrival=${item.arrival_iata}`} className="button-secondary min-w-0 shrink whitespace-nowrap !px-2 !text-[12px] !tracking-[-0.2px]">Add to My Flights</Link>
      <button type="button" disabled={saving} onClick={event => { event.stopPropagation(); onToggleComplete?.(item, event.currentTarget); }} className={`button-secondary inline-flex min-w-0 shrink items-center gap-1 whitespace-nowrap !px-2 !text-[12px] !tracking-[-0.2px] disabled:cursor-wait disabled:opacity-60 ${completed ? "border-brand bg-brand-soft text-brand" : "border-brand text-brand"}`}>{saving ? <T source="Saving…" /> : <>{completed && <CheckCircle />}<T source={completed ? "Completed" : "Mark as Complete"} /></>}</button>
    </div>}
  </div>;
}

export function DailyChallengeCards({ compact = false }: { compact?: boolean }) {
  const { data, updating } = useDailyChallenges();
  const [chosen, setChosen] = useState("");
  if (!data) return <div className="rounded-xl border border-dashed border-brand/30 bg-brand-soft/30 p-5 text-sm text-muted"><T source="Loading today’s flight assignments…" /></div>;
  if (!data.challenges.length) return <div className="rounded-xl border border-dashed border-brand/30 bg-brand-soft/30 p-5 text-sm text-muted"><T source="No Recommendations Available" /></div>;
  return <div aria-busy={updating} className={compact ? "grid gap-2" : "grid gap-4 sm:grid-cols-2"}>{sortChallenges(data.challenges).map(item => <ChallengeCard key={item.category} item={item} compact={compact} selected={chosen === item.category} onSelect={() => setChosen(chosen === item.category ? "" : item.category)} showActions={!compact} />)}</div>;
}

export function DailyChallengePage({ initial, selected }: { initial: ChallengeData; selected?: string }) {
  const { data, updating } = useDailyChallenges(initial);
  const current = data || initial;
  const [chosen, setChosen] = useState(selected || "");
  const [completedCategories, setCompletedCategories] = useState<string[]>(initial.completedCategories || []);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const t = useText();
  useEffect(() => { setCompletedCategories(current.completedCategories || []); }, [current.completedCategories]);
  const toggleCompletion = async (challenge: Challenge, button: HTMLButtonElement) => {
    if (savingCategory) return;
    const wasCompleted = completedCategories.includes(challenge.category);
    setSavingCategory(challenge.category); setNotice(null);
    const client = createClient();
    const { data, error: resultError } = await client.rpc("toggle_daily_challenge_completion", {
      p_challenge_date: challenge.challenge_date,
      p_category: challenge.category,
    });
    const result = Array.isArray(data) ? data[0] : data;
    const error = resultError;
    if (error) {
      console.error("[daily-challenge] completion update failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        challengeDate: challenge.challenge_date,
        category: challenge.category,
        action: wasCompleted ? "delete" : "insert",
      });
      setNotice(t("Unable to update challenge completion."));
    }
    else {
      // Awards and progress use the same database-side metrics as the
      // Achievement page. A refresh failure must not undo the saved completion.
      const refresh = await client.rpc("refresh_my_achievements");
      if (refresh.error) {
        console.error("[daily-challenge] achievement refresh failed after completion was saved", {
          code: refresh.error.code,
          message: refresh.error.message,
          details: refresh.error.details,
          hint: refresh.error.hint,
        });
      }
      if (result?.completed === false || wasCompleted) {
        setCompletedCategories(categories => categories.filter(category => category !== challenge.category));
      }
      else {
        setCompletedCategories(categories => [...new Set([...categories, challenge.category])]);
        setNotice(t("Challenge completed! Great flight, Captain!"));
        try { await launchCompletionConfetti(button); } catch { /* Completion remains saved if animation fails to load. */ }
      }
    }
    setSavingCategory(null);
  };
  return <div aria-busy={updating} className="space-y-8"><section><p className="eyebrow"><T source="Today's Flight Assignments" /></p><h1 className="mt-3 text-4xl font-bold tracking-tight text-brand"><T source="Daily Challenge" /></h1><p className="mt-3 text-muted"><T source="Discover a new route every day." /></p>{notice && <p role="status" className="mt-4 text-sm font-semibold text-brand">{notice}</p>}<div className="mt-7 grid gap-4 sm:grid-cols-2">{sortChallengesByDuration(current.challenges).map(item => <ChallengeCard key={item.category} item={item} selected={chosen === item.category} completed={completedCategories.includes(item.category)} flownBefore={(current.flownCategories || []).includes(item.category)} saving={savingCategory === item.category} onSelect={() => setChosen(chosen === item.category ? "" : item.category)} onToggleComplete={toggleCompletion} showActions />)}</div></section>{current.memorials.length > 0 && <section className="grid gap-5 md:gap-7">{sortMemorialFlights(current.memorials).map(event => <article key={event.id} className="flex flex-col gap-4 rounded-2xl border border-[#d5b36a]/50 bg-[#2b263d] p-6 text-white"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-[#d5b36a]"><T source="Memorial Flight" /></p><Link href={`/memorial-flights/${event.event_key || event.id}`} className="button-secondary inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap !border-[#d5b36a]/70 !bg-transparent !px-3 !py-2 !text-xs !text-[#ead291] hover:!bg-white/5 hover:!text-[#ead291] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5b36a]"><T source="View Details" /> ↗</Link></div><div><h2 className="text-2xl font-bold">{event.title_en}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">{event.description_en}</p><p className="mt-3 font-bold">{event.departure_iata} → {event.arrival_iata}</p></div><MemorialFlightActions event={event} dark /></article>)}</section>}</div>;
}
