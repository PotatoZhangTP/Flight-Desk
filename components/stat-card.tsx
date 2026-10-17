import { T, StatisticValue } from "@/components/i18n";
import type { ReactNode } from "react";

const statAccent: Record<string, string> = {
  "Total Flights": "bg-[#7554C8]",
  "Flight Time": "bg-[#4F83D1]",
  Airports: "bg-[#36A6A0]",
  Countries: "bg-[#E6A04B]",
  Aircraft: "bg-[#D77BA4]",
  "Total Distance": "bg-[#6474C8]",
};

export function StatCard({ label, value, detail, accent }: { label: string; value: string; detail?: string; accent?: string }) {
  const display = label === "Flight Time" && detail ? (value === "0h" ? detail : `${value} ${detail}`) : value;
  return <div className="interaction-card group relative w-full min-w-0 overflow-hidden rounded-2xl border border-line bg-surface p-3.5 shadow-sm shadow-ink/5 sm:p-4"><StatDecor label={label} /><div className={`relative mb-2.5 h-1.5 w-10 rounded-full ${statAccent[label] || accent || "bg-brand"}`} /><p className="relative text-[11px] font-bold uppercase tracking-[0.14em] text-subtle"><T source={label} /></p><p className="relative mt-2 whitespace-nowrap text-2xl font-bold tracking-tight text-ink"><StatisticValue value={display} /></p></div>;
}

function StatDecor({ label }: { label: string }) {
  const common = "absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-brand/10 transition-opacity duration-200 group-hover:opacity-80 sm:right-4";
  const icons: Record<string, ReactNode> = {
    "Total Flights": <><path d="M4 16h16M7 12h10M10 8h4" /><path d="m12 4 2 4-2 4-2-4 2-4Z" /><circle cx="6" cy="16" r="1" /><circle cx="18" cy="16" r="1" /></>,
    "Flight Time": <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2M8 2l-2 2M16 2l2 2" /></>,
    Airports: <><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" /><circle cx="12" cy="11" r="2" /><path d="M3 21h18" /></>,
    Countries: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18M5 7h14M5 17h14" /></>,
    Aircraft: <><path d="m4 14 7-2 3-7 2 1-1 6 5 2c1 .3 1 1.7 0 2l-5 1 1 5-2 1-3-5-7-1c-1-.2-1-1.8 0-2Z" /></>,
    "Total Distance": <><path d="M4 18c3-8 6 4 9-4s5-2 7-8" /><circle cx="4" cy="18" r="1.5" /><circle cx="20" cy="6" r="1.5" /><path d="m17 6 3 0 0 3" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={common}>{icons[label]}</svg>;
}
