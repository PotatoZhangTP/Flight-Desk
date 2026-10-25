"use client";

import Link from "@/components/navigation-link";
import { LocalizedDate, T, useLanguage } from "@/components/i18n";
import { MemorialFlightActions } from "@/components/memorial-flight-actions";
import { useRouter } from "next/navigation";

export type MemorialFlightDetailEvent = {
  id: string;
  event_key?: string | null;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  event_date?: string | null;
  event_year: number;
  event_month: number;
  event_day: number;
  recurring: boolean;
  departure_iata: string;
  departure_icao: string;
  arrival_iata: string;
  arrival_icao: string;
  suggested_aircraft: string | null;
  memorial_type?: string | null;
  display_tone?: string | null;
};

export function MemorialFlightDetail({
  event,
  events = [event],
  currentEventKey,
}: {
  event: MemorialFlightDetailEvent;
  events?: MemorialFlightDetailEvent[];
  currentEventKey?: string;
}) {
  const router = useRouter();
  const { locale } = useLanguage();
  const currentIndex = Math.max(0, events.findIndex(item => (item.event_key || item.id) === currentEventKey));
  const currentEvent = events[currentIndex] || event;
  const title =
    locale === "zh-CN"
      ? currentEvent.title_zh || currentEvent.title_en
      : currentEvent.title_en || currentEvent.title_zh;
  const story =
    locale === "zh-CN"
      ? currentEvent.description_zh || currentEvent.description_en
      : currentEvent.description_en || currentEvent.description_zh;
  const date =
    currentEvent.event_date ||
    `${currentEvent.event_year}-${String(currentEvent.event_month).padStart(2, "0")}-${String(currentEvent.event_day).padStart(2, "0")}`;

  const goTo = (index: number) => {
    const next = events[index];
    if (!next) return;
    router.push(`/memorial-flights/${encodeURIComponent(next.event_key || next.id)}`);
  };


  return (
    <main className="mx-auto max-w-4xl px-6 py-10 lg:px-12">
      <Link href="/challenges" className="button-secondary inline-flex">
        ←{" "}
        <span className="ml-2">
          <T source="Back To Challenges" />
        </span>
      </Link>
      <section key={currentEvent.id} className="mt-12 rounded-2xl border border-[#d5b36a]/50 bg-[#2b263d] p-6 text-white transition-opacity duration-200 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d5b36a]">
          <T source="Memorial Flight" />
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-2xl font-bold">
          {currentEvent.departure_iata} <span className="text-[#d5b36a]">→</span>{" "}
          {currentEvent.arrival_iata}
        </p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
          <span>
            <T id="memorial.historicalEventDate" />:{" "}
            <LocalizedDate value={date} />
          </span>
          {currentEvent.suggested_aircraft && (
            <span>
              <T id="memorial.suggestedAircraft" />: {currentEvent.suggested_aircraft}
            </span>
          )}
          {currentEvent.recurring && (
            <span className="rounded-full border border-[#d5b36a]/45 px-2.5 py-0.5 text-xs font-bold text-[#d5b36a]">
              <T source="Recurring Annually" />
            </span>
          )}
        </div>
      </section>
      {events.length > 1 && <nav className="mt-7 flex flex-wrap items-center justify-center gap-3" aria-label="Memorial flights pagination">
        <button type="button" disabled={currentIndex === 0} onClick={() => goTo(currentIndex - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-brand text-brand transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-35" aria-label="Previous Memorial Flight">←</button>
        <div className="flex items-center gap-1.5" aria-label={`${currentIndex + 1} / ${events.length}`}>
          {events.map((item, index) => <button key={item.id} type="button" onClick={() => goTo(index)} aria-label={`Memorial Flight ${index + 1}`} aria-current={index === currentIndex ? "page" : undefined} className={`h-2.5 w-2.5 rounded-full transition ${index === currentIndex ? "bg-brand" : "bg-brand/25 hover:bg-brand/50"}`} />)}
        </div>
        <span className="min-w-12 text-center text-sm font-bold text-muted">{currentIndex + 1} / {events.length}</span>
        <button type="button" disabled={currentIndex === events.length - 1} onClick={() => goTo(currentIndex + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-brand text-brand transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-35" aria-label="Next Memorial Flight">→</button>
      </nav>}
      <section key={`${currentEvent.id}-story`} className="mt-8 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-ink">
          <T id="memorial.storyBackground" />
        </h2>
        <div className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-muted">
          {story}
        </div>
      </section>
      <section key={`${currentEvent.id}-actions`} className="mt-8 rounded-2xl border border-line bg-surface p-5"><MemorialFlightActions event={currentEvent} /></section>
    </main>
  );
}
