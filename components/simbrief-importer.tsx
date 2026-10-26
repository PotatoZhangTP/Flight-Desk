"use client";

import { useState, useTransition } from "react";
import Link from "@/components/navigation-link";
import { T, UiError, useText, LocalizedDuration } from "@/components/i18n";
import { AirportPicker } from "@/components/airport-picker";
import type { Airport } from "@/lib/airports";
import { getScheduledDuration } from "@/lib/flight-time";
import { aircraftAliasKey } from "@/lib/aircraft-catalog";
import { fetchLatestSimBrief, importSimBriefFlight, type SimBriefFlightPreview } from "@/app/flights/import/simbrief/actions";

type Config = { navigraph_alias: string | null; pilot_id: string | null } | null;
const input = "mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
function airportValue(value: SimBriefFlightPreview["departure"]): Airport | null {
  if (!value) return null;
  return { id: null, origin: "snapshot", ident: value.icao, iata: value.iata || null, icao: value.icao || null, name: value.name, countryCode: value.countryCode || null, countryName: null, municipality: null, timezone: value.timezone || null, latitude: null, longitude: null };
}

export function SimBriefImporter({ initialConfig }: { initialConfig: Config }) {
  const t = useText();
  const [preview, setPreview] = useState<SimBriefFlightPreview | null>(null);
  const [departure, setDeparture] = useState<Airport | null>(null);
  const [arrival, setArrival] = useState<Airport | null>(null);
  const [fields, setFields] = useState({ airline: "", flightNumber: "", aircraftType: "", registration: "", departureDate: "", departureTime: "", arrivalDate: "", arrivalTime: "", departureTimezone: "UTC", arrivalTimezone: "UTC" });
  const [status, setStatus] = useState("");
  const [success, setSuccess] = useState("");
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [similarId, setSimilarId] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [stage, setStage] = useState<"fetch" | "review">("fetch");
  const update = (key: keyof typeof fields, value: string) => setFields(current => ({ ...current, [key]: value }));
  function fetchPlan() {
    setStatus(""); setSuccess(""); setDuplicateId(null); setSimilarId(null);
    startTransition(async () => {
      const result = await fetchLatestSimBrief() as { error?: string; preview?: SimBriefFlightPreview };
      if (result.error || !result.preview) { setStatus(result.error || "simbrief.invalidResponse"); return; }
      const next = result.preview;
      setPreview(next); setDeparture(airportValue(next.departure)); setArrival(airportValue(next.arrival));
      setFields({ airline: next.airline, flightNumber: next.flightNumber, aircraftType: next.aircraftType, registration: next.registration, departureDate: next.departureDate, departureTime: next.departureTime, arrivalDate: next.arrivalDate, arrivalTime: next.arrivalTime, departureTimezone: next.departure?.timezone || "UTC", arrivalTimezone: next.arrival?.timezone || "UTC" });
      setStage("review");
    });
  }
  async function save(forceSimilar = false) {
    if (!preview || !departure || !arrival) return;
    setStatus(""); setSuccess(""); setDuplicateId(null); setSimilarId(null);
    const result = await importSimBriefFlight({ preview, forceSimilar, airline: fields.airline, flightNumber: fields.flightNumber, aircraftType: fields.aircraftType, registration: fields.registration, departure: { name: departure.name, iata: departure.iata || "", icao: departure.icao || "", countryCode: departure.countryCode || "", timezone: fields.departureTimezone, date: fields.departureDate, time: fields.departureTime }, arrival: { name: arrival.name, iata: arrival.iata || "", icao: arrival.icao || "", countryCode: arrival.countryCode || "", timezone: fields.arrivalTimezone, date: fields.arrivalDate, time: fields.arrivalTime } }) as { error?: string; duplicateId?: string; similarId?: string; flightId?: string; success?: string };
    if (result.error) { setStatus(result.error); if (result.duplicateId) setDuplicateId(result.duplicateId); if (result.similarId) setSimilarId(result.similarId); return; }
    setSuccess(result.success || "simbrief.imported");
    setStatus("");
    if (result.flightId) setDuplicateId(result.flightId);
  }
  if (stage === "fetch") return <section className="mt-8 rounded-2xl border border-line bg-surface p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-ink"><T id="simbrief.fetch" /></h2><p className="mt-2 text-sm text-muted">{initialConfig?.navigraph_alias || initialConfig?.pilot_id ? `${initialConfig.navigraph_alias || `Pilot ID ${initialConfig.pilot_id}`}` : <T id="simbrief.configureFirst" />}</p></div><span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">1 / 2</span></div>{!initialConfig ? <Link href="/settings?section=integrations" className="button-secondary mt-6 inline-flex"><T id="settings.integrations" /></Link> : <button type="button" disabled={busy} onClick={fetchPlan} className="button-primary mt-6">{busy ? t("simbrief.fetching") : <T id="simbrief.fetch" />}</button>}{status && <p role="alert" className="mt-4 text-sm font-semibold text-danger-fg"><UiError message={status} /></p>}</section>;
  const departurePlan = { date: fields.departureDate, time: fields.departureTime, timezone: fields.departureTimezone };
  const arrivalPlan = { date: fields.arrivalDate, time: fields.arrivalTime, timezone: fields.arrivalTimezone };
  const duration = getScheduledDuration(departurePlan, arrivalPlan);
  return <section className="mt-8 space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-ink"><T id="simbrief.review" /></h2><button type="button" className="button-secondary" onClick={() => { setStage("fetch"); setStatus(""); }}><T id="common.cancel" /></button></div>{preview?.warnings.length ? <div className="rounded-xl border border-brand/30 bg-brand-soft/40 p-4 text-sm text-muted"><p className="font-bold text-brand"><T id="simbrief.reviewNotice" /></p><ul className="mt-2 list-disc space-y-1 pl-5">{preview.warnings.map(warning => <li key={warning}><UiError message={warning} /></li>)}</ul></div> : null}<div className="rounded-2xl border border-line bg-surface p-6"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-muted"><T id="simbrief.airline" /><input value={fields.airline} onChange={e => update("airline", e.target.value)} className={input} /></label><label className="text-sm font-semibold text-muted"><T id="simbrief.flightNumber" /><input value={fields.flightNumber} onChange={e => update("flightNumber", e.target.value)} className={input} /></label><label className="text-sm font-semibold text-muted"><T source="Aircraft type (optional)" /><input value={fields.aircraftType} onChange={e => update("aircraftType", e.target.value)} className={input} /><span className="mt-1 block text-xs text-subtle">{preview?.aircraftDisplayName || aircraftAliasKey(fields.aircraftType) || "—"}</span></label><label className="text-sm font-semibold text-muted"><T id="simbrief.aircraftRegistration" /><input value={fields.registration} onChange={e => update("registration", e.target.value)} className={input} /></label></div><div className="mt-6 grid gap-6 md:grid-cols-2"><div><AirportPicker label="Departure airport" selected={departure} onChange={setDeparture} onSelect={value => { setDeparture(value); update("departureTimezone", value.timezone || "UTC"); }} /><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs font-bold uppercase tracking-wider text-subtle">Date<input type="date" value={fields.departureDate} onChange={e => update("departureDate", e.target.value)} className={input} /></label><label className="text-xs font-bold uppercase tracking-wider text-subtle">Time<input type="time" value={fields.departureTime} onChange={e => update("departureTime", e.target.value)} className={input} /></label></div><label className="mt-3 block text-xs font-bold uppercase tracking-wider text-subtle">Timezone<input value={fields.departureTimezone} onChange={e => update("departureTimezone", e.target.value)} className={input} /></label></div><div><AirportPicker label="Arrival airport" selected={arrival} onChange={setArrival} onSelect={value => { setArrival(value); update("arrivalTimezone", value.timezone || "UTC"); }} /><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs font-bold uppercase tracking-wider text-subtle">Date<input type="date" value={fields.arrivalDate} onChange={e => update("arrivalDate", e.target.value)} className={input} /></label><label className="text-xs font-bold uppercase tracking-wider text-subtle">Time<input type="time" value={fields.arrivalTime} onChange={e => update("arrivalTime", e.target.value)} className={input} /></label></div><label className="mt-3 block text-xs font-bold uppercase tracking-wider text-subtle">Timezone<input value={fields.arrivalTimezone} onChange={e => update("arrivalTimezone", e.target.value)} className={input} /></label></div></div><div className="mt-6 grid gap-4 sm:grid-cols-3 border-t border-line pt-5 text-sm"><p><span className="block text-xs font-bold uppercase tracking-wider text-subtle"><T id="simbrief.plannedDuration" /></span><span className="mt-1 block font-semibold text-ink"><LocalizedDuration minutes={duration.minutes} scheduled /></span></p><p><span className="block text-xs font-bold uppercase tracking-wider text-subtle"><T id="simbrief.distance" /></span><span className="mt-1 block font-semibold text-ink"><T id="simbrief.calculatedDistance" /></span></p><p><span className="block text-xs font-bold uppercase tracking-wider text-subtle"><T id="simbrief.flightStatus" /></span><span className="mt-1 block font-semibold text-ink"><T id="simbrief.planned" /></span></p></div></div>{status && <div className="rounded-xl bg-danger-bg p-4 text-sm text-danger-fg"><UiError message={status} />{similarId && <div className="mt-3 flex flex-wrap gap-2"><Link href={`/flights/${similarId}`} className="button-secondary"><T id="simbrief.viewExisting" /></Link><button type="button" disabled={busy} onClick={() => void save(true)} className="button-primary"><T id="simbrief.import" /></button></div>}{duplicateId && !similarId && <div className="mt-3"><Link href={`/flights/${duplicateId}`} className="button-secondary"><T id="simbrief.viewExisting" /></Link></div>}</div>}{success && <div className="rounded-xl bg-brand-soft p-4 text-sm font-semibold text-brand"><T id="simbrief.imported" /><div className="mt-3 flex flex-wrap gap-2"><Link href="/flights" className="button-secondary"><T id="simbrief.viewAllFlights" /></Link><button type="button" onClick={() => { setStage("fetch"); setPreview(null); setSuccess(""); }} className="button-primary"><T id="simbrief.addAnother" /></button></div></div>} {!success && !duplicateId && <button type="button" disabled={busy || !departure || !arrival} onClick={() => void save()} className="button-primary">{busy ? t("simbrief.importing") : <T id="simbrief.import" />}</button>}</section>;
}
