"use client";

import Link from "@/components/navigation-link";
import { T, useLanguage } from "@/components/i18n";
import type { Memorial } from "@/components/daily-challenge";
import { memorialCardCopy } from "@/lib/memorial-presentation";
import { MemorialArtwork } from "@/components/memorial-artwork";

export function DashboardMemorialCard({ event }: { event: Memorial }) {
  const { locale } = useLanguage();
  const { title, message } = memorialCardCopy(event, locale);
  return <Link href={`/challenges?memorial=${event.event_key || event.id}`} className="grid min-h-[190px] grid-cols-[minmax(0,7fr)_minmax(64px,3fr)] items-center gap-2 rounded-xl border border-[#d5b36a]/40 bg-[#192237] p-4 text-white transition-colors duration-150 hover:border-[#d5b36a]/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d5b36a] sm:gap-4 sm:p-5">
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#d5b36a] sm:text-xs"><T source="Memorial Flight" /></p>
      <h3 className="mt-2 break-words text-lg font-semibold leading-snug text-white sm:text-xl">{title}</h3>
      <p className="mt-2 break-words text-sm font-medium leading-6 text-[#eee5d2]">{event.departure_iata || event.departure_icao} <span className="text-[#d5b36a]">→</span> {event.arrival_iata || event.arrival_icao}{event.suggested_aircraft ? ` · ${event.suggested_aircraft}` : ""}</p>
      {message && <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-white/70">{message}</p>}
    </div>
    <div className="pointer-events-none mx-auto w-full max-w-[144px] select-none"><MemorialArtwork type={event.memorial_type} /></div>
  </Link>;
}
