"use client";
import { T, useText, UiError, LocalizedDuration } from "@/components/i18n";


import { useEffect, useId, useMemo, useRef, useState } from "react";
import { airportCodes, airportFromSnapshot, type Airport } from "@/lib/airports";
import { getScheduledDuration, getScheduledFlightTime, snapshotClockChoice, type PlannedTime } from "@/lib/flight-time";
import { normalizeFlightInput } from "@/lib/flight-input";
import { createFlight, updateFlight } from "@/app/flights/actions";
import { CountryFlag } from "@/components/country-flag";
import { AirportPicker } from "@/components/airport-picker";
import { AsyncButton } from "./async-button";
import { useTransition } from "react";
import { unstable_rethrow } from "next/navigation";

type Side = "departure" | "arrival";
type FormState = PlannedTime & { airport: Airport | null; terminal: string; gate: string };
type FlightInitialData = { id?: string } & Record<string, unknown>;
const inputClass = "mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-3 text-sm font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

function initialText(data: Record<string, unknown>, key: string) {
  return typeof data[key] === "string" ? data[key] as string : "";
}
function initialSide(data: Record<string, unknown>, side: Side): FormState {
  const airport = airportFromSnapshot(data, side);
  const date = initialText(data, side + "_local_date") || (side === "departure" ? initialText(data, "flight_date") : "");
  const time = initialText(data, side + "_local_time").slice(0, 5);
  const timezone = initialText(data, side + "_timezone");
  return {
    airport, date, time, timezone,
    terminal: initialText(data, side + "_terminal"), gate: initialText(data, side + "_gate"),
    disambiguation: snapshotClockChoice(date, time, timezone, initialText(data, side + "_scheduled_at_utc") || null),
  };
}

export function FlightForm({ initialData = {} }: { initialData?: FlightInitialData }) {
  const t = useText();
  const [departure, setDeparture] = useState(() => initialSide(initialData, "departure"));
  const [arrival, setArrival] = useState(() => initialSide(initialData, "arrival"));
  const [airline, setAirline] = useState(initialText(initialData, "airline"));
  const [flightNumber, setFlightNumber] = useState(initialText(initialData, "flight_number"));
  const [aircraftType, setAircraftType] = useState(initialText(initialData, "aircraft_type"));
  const [registration, setRegistration] = useState(initialText(initialData, "registration"));
  const [notes, setNotes] = useState(initialText(initialData, "notes"));
  const actual = typeof initialData.actual_duration_minutes === "number" ? initialData.actual_duration_minutes : null;
  const [actualHours, setActualHours] = useState(actual == null ? "" : String(Math.floor(actual / 60)));
  const [actualMinutes, setActualMinutes] = useState(actual == null ? "" : String(actual % 60));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const duration = useMemo(() => getScheduledDuration(departure, arrival), [departure, arrival]);

  function setSide(side: Side, patch: Partial<FormState>) {
    const clockChanged = ["date", "time", "timezone"].some(key => key in patch);
    const change = (value: FormState) => ({ ...value, ...(clockChanged ? { disambiguation: undefined } : {}), ...patch });
    if (side === "departure") setDeparture(change); else setArrival(change);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || pending) return;
    setError("");
    if (!departure.airport || !arrival.airport) {
      setError("Select both airports or enter their information manually.");
      return;
    }
    if (actualMinutes !== "" && (!Number.isInteger(Number(actualMinutes)) || Number(actualMinutes) < 0 || Number(actualMinutes) > 59)) {
      setError("Actual duration minutes must be between 0 and 59."); return;
    }
    const input: Record<string, unknown> = {
      airline, flightNumber, aircraftType, registration, notes,
      actualDurationMinutes: actualHours !== "" || actualMinutes !== "" ? Number(actualHours || 0) * 60 + Number(actualMinutes || 0) : null,
    };
    for (const [side, state] of [["departure", departure], ["arrival", arrival]] as const) {
      const airport = state.airport!;
      Object.assign(input, {
        [side + "AirportIata"]: airport.iata, [side + "AirportIcao"]: airport.icao,
        [side + "AirportName"]: airport.name, [side + "AirportIdent"]: airport.ident,
        [side + "CountryCode"]: airport.countryCode, [side + "Timezone"]: state.timezone,
        [side + "Date"]: state.date, [side + "Time"]: state.time,
        [side + "Disambiguation"]: state.disambiguation,
        [side + "Terminal"]: state.terminal, [side + "Gate"]: state.gate,
      });
    }
    const validated = normalizeFlightInput(input);
    if (validated.error) { setError(validated.error); return; }
    submitting.current = true; setSaving(true);
    startTransition(async () => { try {
      const result = initialData.id ? await updateFlight(initialData.id, input) : await createFlight(input);
      if (result?.error) setError(result.error);
    } catch (error) {
      unstable_rethrow(error);
      setError("The save could not be confirmed. Your entries are still here. Check your logbook before retrying to avoid a duplicate.");
    } finally { submitting.current = false; setSaving(false); } });
  }

  return <form onSubmit={submit}>
    <fieldset disabled={saving || pending} className="min-w-0 space-y-6">
      <TicketPreview departure={departure} arrival={arrival} airline={airline} flightNumber={flightNumber} duration={duration.minutes} />
      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {([["departure", departure], ["arrival", arrival]] as const).map(([side, state]) => <AirportPicker
            key={side} label={side === "departure" ? "Departure airport" : "Arrival airport"} selected={state.airport}
            onChange={(airport) => setSide(side, { airport })}
            onSelect={(airport) => setSide(side, { airport, timezone: airport.timezone || "" })} />)}
        </div>
        <p className="mt-3 text-xs text-subtle"><T id="airport.credit" />{" "}<a href="https://ourairports.com/data/" target="_blank" rel="noreferrer" className="hover:text-brand">OurAirports</a><T id="airport.boundaries" />{" "}<a href="https://github.com/evansiroky/timezone-boundary-builder" target="_blank" rel="noreferrer" className="hover:text-brand">timezone-boundary-builder / © OpenStreetMap contributors (ODbL)</a>.</p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <TimeFields label="Departure" state={departure} onChange={(patch) => setSide("departure", patch)} />
          <TimeFields label="Arrival" state={arrival} onChange={(patch) => setSide("arrival", patch)} />
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-xl font-bold text-ink"><T id="flight.details" /></h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Airline" value={airline} onChange={setAirline} placeholder={t("e.g. Air China")} />
          <Field label="Flight number" value={flightNumber} onChange={setFlightNumber} placeholder="e.g. CA1234" />
          <Field label="Aircraft type (optional)" value={aircraftType} onChange={setAircraftType} placeholder={t("e.g. Boeing 737-800")} />
          <Field label="Registration (optional)" value={registration} onChange={setRegistration} placeholder="e.g. B-2087" />
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div><label className="text-sm font-semibold text-muted"><T id="flight.scheduled" /></label>
            <div aria-live="polite" className="mt-1.5 rounded-xl bg-page px-4 py-3 text-ink">
              {duration.minutes == null ? <T id="flight.calculated" /> : <LocalizedDuration minutes={duration.minutes} />}
            </div>
          </div>
          <div><p className="text-sm font-semibold text-muted"><T id="flight.actual" />{" "}<span className="font-normal text-subtle"><T id="common.optional" /></span></p>
            <div className="mt-1.5 flex gap-2">
              <input aria-label={t("Actual duration hours")} type="number" min="0" max="99" step="1" value={actualHours} onChange={e => setActualHours(e.target.value)} className={inputClass + " min-w-0"} placeholder={t("Hours")} />
              <input aria-label={t("Actual duration minutes")} type="number" min="0" max="59" step="1" value={actualMinutes} onChange={e => setActualMinutes(e.target.value)} className={inputClass + " min-w-0"} placeholder={t("Minutes")} />
            </div>
          </div>
        </div>
        <label className="mt-5 block text-sm font-semibold text-muted"><T id="flight.notes" /><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} maxLength={10000} className={inputClass} placeholder={t("Anything you want to remember…")} /></label>
      </section>
      {error && <p role="alert" className="rounded-xl bg-danger-bg p-4 text-sm text-danger-fg"><UiError message={error} /></p>}
      <div className="flex justify-end"><AsyncButton busy={saving || pending} busyLabel={t(initialData.id ? "Updating flight…" : "Saving flight…")} className="rounded-full bg-brand px-7 py-3.5 font-bold text-on-brand shadow-lg shadow-brand/10 transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60">
        <T source={initialData.id ? "Save changes →" : "Save flight →"} />
      </AsyncButton></div>
    </fieldset>
  </form>;
}

function TimeFields({ label, state, onChange }: { label: string; state: FormState; onChange: (patch: Partial<FormState>) => void }) {
  const t = useText();
  const listId = useId();
  const [zones, setZones] = useState<string[]>([]);
  useEffect(() => {
    try { setZones(Intl.supportedValuesOf("timeZone")); } catch { /* manual input still accepts valid IANA names */ }
  }, []);
  const clock = getScheduledFlightTime(state.date, state.time, state.timezone, state.disambiguation);
  return <div>
    <h3 className="font-bold text-ink"><T source={label} /><T id="flight.plannedTime" /></h3>
    <div className="mt-3 grid grid-cols-2 gap-3">
      <Field label="Date" ariaLabel={label + " date"} value={state.date} onChange={date => onChange({ date })} type="date" required />
      <Field label="Local time" ariaLabel={label + " local time"} value={state.time} onChange={time => onChange({ time })} type="time" required />
    </div>
    <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-subtle"><T id="flight.timezone" /><input required aria-label={t(label + " timezone")} autoComplete="off" maxLength={100} list={listId} value={state.timezone}
        onChange={e => onChange({ timezone: e.target.value })} className={inputClass} placeholder={t("Select or type IANA timezone")} />
    </label>
    <datalist id={listId}>{[...new Set([...zones, state.timezone].filter(Boolean))].sort().map(zone => <option key={zone} value={zone} />)}</datalist>
    {clock.ambiguous && <label className="mt-3 block text-sm text-muted"><T id="flight.clockChange" /><select required aria-label={t(label + " clock change")} value={state.disambiguation || ""} onChange={e => onChange({ disambiguation: e.target.value as "earlier" | "later" })} className={inputClass}>
        <option value=""><T id="flight.chooseClock" /></option>{clock.choices.map(c => <option key={c.value} value={c.value}>{t(c.value === "earlier" ? "flight.earlierOffset" : "flight.laterOffset", { offset: c.label.match(/UTC([^)]+)/)?.[1] ?? "" })}</option>)}
      </select>
    </label>}
    {clock.error && state.date && state.time && state.timezone && <p role="status" className="mt-2 text-xs text-danger-fg"><UiError message={clock.error} /></p>}
    <div className="mt-3 grid grid-cols-2 gap-3">
      <Field label="Terminal (optional)" ariaLabel={label + " terminal"} value={state.terminal} onChange={terminal => onChange({ terminal })} />
      <Field label="Gate (optional)" ariaLabel={label + " gate"} value={state.gate} onChange={gate => onChange({ gate })} />
    </div>
  </div>;
}

function Field({ label, ariaLabel, value, onChange, type = "text", placeholder, required = false }: {
  label: string; ariaLabel?: string; value: string; onChange: (value: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  const t = useText();
  return <label className="block text-xs font-bold uppercase tracking-wider text-subtle"><T source={label} /><input type={type} aria-label={t(ariaLabel ?? label)} required={required} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ? t(placeholder) : undefined} className={inputClass} /></label>;
}

function TicketPreview({ departure, arrival, airline, flightNumber, duration }: {
  departure: FormState; arrival: FormState; airline: string; flightNumber: string; duration: number | null;
}) {
  return <section className="overflow-hidden rounded-[2rem] border border-line bg-surface shadow-xl shadow-ink/5">
    <div className="bg-panel p-6 text-on-panel">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-panel-accent"><T id="flight.ticket" /></p>
      <div className="mt-8 grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <AirportBlock airport={departure.airport} fallback="Departure" />
        <div className="text-center"><p className="text-sm font-semibold text-panel-accent">{airline || <T id="flight.airline" />} · {flightNumber || <T id="flight.number" />}</p>
          <div className="mt-2 flex items-center justify-center gap-2 text-panel-accent"><span className="h-px w-16 bg-panel-accent" /><span>✈</span><span className="h-px w-16 bg-panel-accent" /></div>
          <p className="mt-2 text-xs text-panel-muted"><LocalizedDuration minutes={duration} scheduled /></p>
        </div>
        <AirportBlock airport={arrival.airport} fallback="Arrival" align="right" />
      </div>
    </div>
    <div className="flex flex-wrap justify-between gap-3 bg-surface-muted px-6 py-4 text-xs text-muted">
      <span>{departure.date || <T source="Departure date" />} · {departure.time || <T source="Local time" />} {departure.timezone}</span>
      <span>{arrival.date || <T source="Arrival date" />} · {arrival.time || <T source="Local time" />} {arrival.timezone}</span>
    </div>
  </section>;
}
function AirportBlock({ airport, fallback, align = "left" }: { airport: Airport | null; fallback: string; align?: "left" | "right" }) {
  return <div className={align === "right" ? "min-w-0 text-right" : "min-w-0 text-left"}>
    <p className="break-words text-2xl font-bold leading-tight sm:text-3xl">{airport?.name || <T source={fallback} />}</p>
    <p className="mt-2 text-sm text-panel-muted">{airport ? <><CountryFlag code={airport.countryCode} /> {airportCodes(airport)}</> : <T source="Select an airport" />}</p>
  </div>;
}
