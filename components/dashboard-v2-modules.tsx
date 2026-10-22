"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "@/components/navigation-link";
import { T } from "@/components/i18n";
import type { AviationPassportProps } from "@/components/aviation-passport";
import { AchievementBadge } from "@/components/achievement-badge";
import type { AchievementCabin } from "@/lib/achievements/server";

const AviationPassport = dynamic<AviationPassportProps>(() => import("@/components/aviation-passport").then(module => module.AviationPassport), {
  ssr: false,
  loading: () => <div className="min-h-[420px] rounded-2xl skeleton-shimmer" aria-label="Passport loading" />,
});
const DailyChallengeCarousel = dynamic(() => import("@/components/daily-challenge-carousel").then(module => module.DailyChallengeCarousel), {
  ssr: false,
  loading: () => <div className="h-44 rounded-xl skeleton-shimmer" aria-label="Daily challenge loading" />,
});

export function DailyChallengeModule() { return <section className="dashboard-module spotlight-card"><ModuleHeader title="dashboard.dailyChallenge" href="/challenges" action="dashboard.viewChallenges" /><p className="mt-4 text-sm leading-6 text-muted"><T source="Don't know where to fly? We've got you covered." /></p><div className="mt-5 pb-4"><DailyChallengeCarousel /></div></section>; }
export function AviationPassportModule() { const [page, setPage] = useState(0); return <section className="dashboard-module spotlight-card dashboard-passport"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d5b36a]"><T id="dashboard.passport" /></p><h2 className="mt-2 text-2xl font-bold text-white"><T id="dashboard.passportCover" /></h2></div><span className="text-3xl text-[#d5b36a]" aria-hidden="true">✦</span></div><div className="mt-7 min-h-[190px] rounded-xl border border-[#d5b36a]/40 bg-[#f7f0df] p-6 text-[#34291c] shadow-inner"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b6b32]"><T id="dashboard.passportPage" /> {page + 1}</p><p className="mt-10 max-w-sm text-sm leading-6"><T id="dashboard.passportEmpty" /></p></div><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={page===0} onClick={() => setPage(value => value - 1)} className="button-secondary border-[#d5b36a] bg-transparent text-[#d5b36a] disabled:opacity-40"><T id="dashboard.previous" /></button><button type="button" disabled={page===1} onClick={() => setPage(value => value + 1)} className="button-secondary border-[#d5b36a] bg-transparent text-[#d5b36a] disabled:opacity-40"><T id="dashboard.next" /></button></div></section>; }
export function AchievementsModule({ cabin }: { cabin: AchievementCabin }) {
  const message = !cabin.ready
    ? "Achievements are temporarily unavailable. Please try again shortly."
    : cabin.refreshError
      ? "Achievements could not be refreshed. Your saved flight data is unchanged."
      : cabin.featured.length
        ? null
        : cabin.unlockedCount
          ? "You have unlocked achievements. Add them to Featured Cabin from the full collection."
          : "Milestones from your completed journeys will appear here.";
  const diagnostic = cabin.loadErrorSource ? `ACHIEVEMENTS_${cabin.loadErrorSource.toUpperCase()}${cabin.loadErrorCode ? `_${cabin.loadErrorCode}` : ""}` : null;
  return <section className="dashboard-module spotlight-card"><ModuleHeader title="dashboard.achievements" href="/achievements" action="dashboard.viewAllAchievements" />{message && <p className="mt-4 text-sm leading-6 text-muted" aria-live="polite">{message}</p>}{diagnostic && <p className="mt-2 text-xs text-subtle">Reference: {diagnostic}</p>}{cabin.featured.length > 0 && <div className="mt-6 grid grid-cols-5 gap-2 sm:gap-3">{cabin.featured.map(item => <Link key={item.id} href="/achievements" className="achievement-dashboard-window" title={`${item.name_en} — Unlocked`}><AchievementBadge item={item} compact /><span className="sr-only">{item.name_en}</span></Link>)}</div>}{cabin.ready && !cabin.refreshError && cabin.unlockedCount > 0 && cabin.featured.length === 0 && <Link href="/achievements" className="button-secondary mt-5 inline-flex">Choose featured achievements</Link>}</section>;
}
export function ReportsModule() { const [period, setPeriod] = useState("daily"); return <section className="dashboard-module spotlight-card"><ModuleHeader title="dashboard.reports" /><p className="mt-4 text-sm leading-6 text-muted"><T id="dashboard.reportsHelp" /></p><div className="mt-5 grid grid-cols-2 gap-2">{[["daily","dashboard.daily"],["weekly","dashboard.weekly"],["monthly","dashboard.monthly"],["yearly","dashboard.yearly"]].map(([key,label]) => <button key={key} type="button" onClick={() => setPeriod(key)} className={`button-secondary min-w-0 px-2 py-2 text-xs ${period===key?"bg-brand-soft":""}`}><T id={label} /></button>)}</div></section>; }
export function MemoriesModule() { return <section className="dashboard-module spotlight-card"><ModuleHeader title="dashboard.memories" /><p className="mt-4 text-sm leading-6 text-muted"><T id="dashboard.memoriesHelp" /></p><div className="mt-6 rounded-xl border border-dashed border-line p-6 text-center text-sm text-subtle"><T id="dashboard.noMemories" /></div></section>; }
export function FeedbackModule() { return <section className="dashboard-module spotlight-card"><ModuleHeader title="dashboard.feedback" /><p className="mt-4 text-sm leading-6 text-muted"><T id="dashboard.feedbackHelp" /></p><div className="mt-5 grid gap-2.5"><a href="mailto:feedback@flightdesk.app?subject=Suggest%20a%20Feature" className="button-secondary flex w-full items-center justify-start gap-2.5 whitespace-nowrap px-5 py-2 text-left text-sm"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 3.5h6l1 3 2.5 2.5v7.5H5.5V9L8 6.5l1-3Z"/><path d="M9 16.5h6M10 20.5h4M12 3.5v-2"/></svg><T id="dashboard.suggestFeature" /></a><a href="mailto:feedback@flightdesk.app?subject=Bug%20Report" className="button-secondary flex w-full items-center justify-start gap-2.5 whitespace-nowrap px-5 py-2 text-left text-sm"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 8h8v7a4 4 0 0 1-8 0V8Z"/><path d="M10 8V5m4 3V5M5 11H2m20 0h-3M6 7 4 5m14 2 2-2M6 15 3.5 17m17-2 2.5 2"/></svg><T id="dashboard.bugReport" /></a></div></section>; }
function ModuleHeader({ title, href, action }: { title: string; href?: string; action?: string }) { return <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold"><T id={title} /></h2>{href&&action&&<Link href={href} className="button-secondary"><T id={action} /></Link>}</div>; }
export function AviationPassportDataModule(props: AviationPassportProps) { return <AviationPassport {...props} />; }
