"use client";
import { T, useText } from "@/components/i18n";
export function JourneyDemo() {
  const t = useText();
  return <figure aria-label={t("Product demo of an illustrative flight from Beijing to New York, not a real user record")} className="landing-ticket mx-auto w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-sm shadow-ink/5">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-7"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted"><T id="landing.demoTitle" /></span></div>
    <div className="px-5 py-6 sm:px-7 sm:py-7">
      <svg aria-hidden="true" viewBox="0 0 500 60" className="mx-auto mb-4 w-full max-w-lg text-brand" fill="none"><path d="M25 45 Q250 -25 475 45" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" /><circle cx="25" cy="45" r="3" fill="currentColor" /><circle cx="475" cy="45" r="3" fill="currentColor" /><circle cx="250" cy="10" r="14" fill="var(--surface)" /><path transform="translate(238 -2)" d="M22 12c0-1-2-2-4-2h-4L8 3H5l3 7H4L2 7H1l1 5-1 5h1l2-3h4l-3 7h3l6-7h4c2 0 4-1 4-2Z" fill="currentColor" stroke="currentColor" strokeWidth=".6" strokeLinejoin="round" /></svg>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6"><div><p className="text-[11px] font-medium uppercase tracking-wider text-muted"><T id="flight.departure" /></p><p className="mt-2 break-words text-base font-bold tracking-tight sm:text-2xl"><T id="landing.beijing" /></p><p className="mt-2 text-xs text-muted">ZBAA</p></div><div className="w-24 text-center sm:w-44"><p className="mb-2 text-[10px] font-semibold tracking-wide text-brand sm:text-xs">CA981</p><svg aria-hidden="true" viewBox="0 0 180 20" className="h-5 w-full text-brand" fill="none"><path d="M2 10h174m-8-7 8 7-8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div><div className="text-right"><p className="text-[11px] font-medium uppercase tracking-wider text-muted"><T id="flight.arrival" /></p><p className="mt-2 break-words text-base font-bold tracking-tight sm:text-2xl"><T id="landing.newYork" /></p><p className="mt-2 text-xs text-muted">KJFK</p></div></div>
    </div>
    <figcaption className="border-t border-line px-5 py-3 text-xs leading-5 text-muted sm:px-7"><T id="landing.demoHelp" /></figcaption>
  </figure>;
}
