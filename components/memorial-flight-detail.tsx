"use client";

import { useState } from "react";
import Link from "@/components/navigation-link";
import { LocalizedDate, T, useLanguage, useText } from "@/components/i18n";
import { createClient } from "@/lib/supabase/browser";

export type MemorialFlightDetailEvent = {
  id: string;
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
};

function CheckCircle() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.3 2.3 4.8-5" /></svg>;
}

export function MemorialFlightDetail({ event, initialCompleted }: { event: MemorialFlightDetailEvent; initialCompleted: boolean }) {
  const { locale } = useLanguage();
  const t = useText();
  const [completed, setCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const title = locale === "zh-CN" ? event.title_zh || event.title_en : event.title_en || event.title_zh;
  const story = locale === "zh-CN" ? event.description_zh || event.description_en : event.description_en || event.description_zh;
  const date = event.event_date || `${event.event_year}-${String(event.event_month).padStart(2, "0")}-${String(event.event_day).padStart(2, "0")}`;

  const toggleCompletion = async () => {
    if (saving) return;
    setSaving(true); setMessage(null);
    const client = createClient();
    if (completed) {
      const { error } = await client.from("memorial_participation").delete().eq("event_id", event.id);
      if (error) setMessage(t("Unable to update memorial flight completion."));
      else setCompleted(false);
    } else {
      const { data: identity, error: identityError } = await client.auth.getUser();
      if (identityError || !identity.user) setMessage(t("Unable to update memorial flight completion."));
      else {
        const { error } = await client.from("memorial_participation").insert({ event_id: event.id, user_id: identity.user.id });
        if (error) setMessage(t("Unable to update memorial flight completion."));
        else setCompleted(true);
      }
    }
    setSaving(false);
  };

  return <main className="mx-auto max-w-4xl px-6 py-10 lg:px-12"><Link href="/challenges" className="button-secondary inline-flex">← <span className="ml-2"><T source="Back To Challenges" /></span></Link><section className="mt-8 rounded-2xl border border-[#d5b36a]/50 bg-[#2b263d] p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d5b36a]"><T source="Memorial Flight" /></p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1><p className="mt-4 text-2xl font-bold">{event.departure_iata} <span className="text-[#d5b36a]">→</span> {event.arrival_iata}</p><div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75"><span><T id="memorial.historicalEventDate" />: <LocalizedDate value={date} /></span>{event.suggested_aircraft && <span><T id="memorial.suggestedAircraft" />: {event.suggested_aircraft}</span>}{event.recurring && <span className="rounded-full border border-[#d5b36a]/45 px-2.5 py-0.5 text-xs font-bold text-[#d5b36a]"><T source="Recurring Annually" /></span>}</div></section><section className="mt-6 rounded-2xl border border-line bg-surface p-6 sm:p-8"><h2 className="text-2xl font-bold text-ink"><T id="memorial.storyBackground" /></h2><div className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-muted">{story}</div></section><section className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-5"><a target="_blank" rel="noreferrer" href={`https://dispatch.simbrief.com/options/custom?orig=${event.departure_icao}&dest=${event.arrival_icao}`} className="button-primary">Import to SimBrief ↗</a><Link href={`/flights/new?departure=${event.departure_iata}&arrival=${event.arrival_iata}`} className="button-secondary">Add to My Flights</Link><button type="button" disabled={saving} onClick={() => void toggleCompletion()} className={`button-secondary inline-flex items-center gap-1.5 disabled:cursor-wait disabled:opacity-60 ${completed ? "border-brand bg-brand-soft text-brand" : "border-brand text-brand"}`}>{saving ? <T source="Saving…" /> : <>{completed && <CheckCircle />}<T id={completed ? "memorial.completed" : "memorial.markComplete"} /></>}</button>{message && <p role="alert" className="basis-full text-sm font-semibold text-danger-fg">{message}</p>}</section></main>;
}
