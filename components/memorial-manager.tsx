"use client";
import { useState, type FormEvent } from "react";
import { AirportPicker } from "@/components/airport-picker";
import type { Airport } from "@/lib/airports";
import { T } from "@/components/i18n";
import { defaultDisplayTone, normalizeDisplayTone, normalizeMemorialType, type MemorialPresentation } from "@/lib/memorial-presentation";
import {
  saveMemorial,
  deleteMemorial,
} from "@/app/admin/memorial-flights/actions";

type Event = MemorialPresentation & {
  id: string;
  event_key: string;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  event_date?: string;
  publish_start_date?: string;
  publish_end_date?: string;
  event_year: number;
  event_month: number;
  event_day: number;
  publish_year: number;
  publish_month: number;
  publish_day: number;
  recurring: boolean;
  departure_iata: string;
  departure_icao: string;
  arrival_iata: string;
  arrival_icao: string;
  suggested_aircraft: string | null;
  enabled: boolean;
};
const input =
  "mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
const dateValue = (
  value: string | undefined,
  year: number,
  month: number,
  day: number,
) =>
  value ||
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const airportSnapshot = (iata: string, icao: string): Airport => ({
  id: null,
  origin: "snapshot",
  ident: icao,
  iata,
  icao,
  name: iata,
  countryCode: null,
  countryName: null,
  municipality: null,
  timezone: null,
  latitude: null,
  longitude: null,
});

function MemorialForm({
  event,
  mode,
  onCancel,
  onSaved,
  onMessage,
  onDirty,
}: {
  event?: Event;
  mode: "add" | "edit";
  onCancel: () => void;
  onSaved: () => void;
  onMessage: (message: string) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const [departure, setDeparture] = useState<Airport | null>(
    event ? airportSnapshot(event.departure_iata, event.departure_icao) : null,
  );
  const [arrival, setArrival] = useState<Airport | null>(
    event ? airportSnapshot(event.arrival_iata, event.arrival_icao) : null,
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [memorialType, setMemorialType] = useState(normalizeMemorialType(event?.memorial_type));
  const [displayTone, setDisplayTone] = useState(normalizeDisplayTone(event?.display_tone, event?.memorial_type));
  async function submit(eventObject: FormEvent<HTMLFormElement>) {
    eventObject.preventDefault();
    if (saving) return;
    const form = new FormData(eventObject.currentTarget);
    if (
      !departure?.iata ||
      !departure.icao ||
      !arrival?.iata ||
      !arrival.icao
    ) {
      setStatus("Select both airports from the airport search.");
      return;
    }
    form.set("departure_iata", departure.iata);
    form.set("departure_icao", departure.icao);
    form.set("arrival_iata", arrival.iata);
    form.set("arrival_icao", arrival.icao);
    setSaving(true);
    setStatus("");
    const result = await saveMemorial(form);
    setSaving(false);
    if (result.error) {
      setStatus(result.error);
      onMessage(result.error);
      return;
    }
    setStatus("Saved");
    onMessage("Saved");
    onDirty(false);
    onSaved();
  }
  const eventDate = event
    ? dateValue(
        event.event_date,
        event.event_year,
        event.event_month,
        event.event_day,
      )
    : "";
  const startDate = event
    ? dateValue(
        event.publish_start_date,
        event.publish_year,
        event.publish_month,
        event.publish_day,
      )
    : "";
  const endDate = event
    ? dateValue(
        event.publish_end_date,
        event.publish_year,
        event.publish_month,
        event.publish_day,
      )
    : "";
  const defaultMessage = memorialType === "historical_anniversary"
    ? "Commemorating a milestone in aviation history."
    : "In remembrance of the X people aboard.";
  return (
    <form
      onSubmit={submit}
      onChange={() => onDirty(true)}
      className="mt-5 rounded-2xl border border-line bg-page p-5"
    >
      <input type="hidden" name="id" value={event?.id || ""} />
      <h3 className="text-lg font-bold text-brand">
        {mode === "add" ? (
          "Add New Memorial Flight"
        ) : (
          <>
            Edit Memorial Flight
            <span className="ml-2 text-muted">· {event?.title_en}</span>
          </>
        )}
      </h3>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-muted">
          <T id="memorial.type" />
          <select name="memorial_type" value={memorialType} onChange={e => { const next = normalizeMemorialType(e.target.value); setMemorialType(next); setDisplayTone(defaultDisplayTone(next)); onDirty(true); }} className={input}>
            <option value="accident_memorial"><T id="memorial.typeAccident" /></option>
            <option value="historical_anniversary"><T id="memorial.typeHistorical" /></option>
          </select>
        </label>
        <label className="text-sm font-semibold text-muted">
          <T source="Display Tone" />
          <select name="display_tone" value={displayTone} onChange={e => { setDisplayTone(normalizeDisplayTone(e.target.value, memorialType)); onDirty(true); }} className={input}>
            <option value="remembering"><T source="Remembering" /></option>
            <option value="celebrating"><T source="Celebrating" /></option>
          </select>
        </label>
        <label className="text-sm font-semibold text-muted md:col-span-2">
          <T id="memorial.messageEn" />
          <textarea name="memorial_message_en" defaultValue={event?.memorial_message_en || (mode === "add" ? defaultMessage : "")} className={input} rows={2} maxLength={600} />
          <span className="mt-1 block text-xs font-normal"><T id="memorial.messageHelp" /></span>
        </label>
        <label className="text-sm font-semibold text-muted md:col-span-2">
          <T id="memorial.messageZh" />
          <textarea name="memorial_message_zh" defaultValue={event?.memorial_message_zh || ""} className={input} rows={2} maxLength={600} />
        </label>
        <label className="text-sm font-semibold text-muted">
          Event Key
          <input
            name="event_key"
            required
            defaultValue={event?.event_key || ""}
            className={input}
          />
        </label>
        <label className="text-sm font-semibold text-muted">
          Suggested Aircraft
          <input
            name="suggested_aircraft"
            defaultValue={event?.suggested_aircraft || ""}
            className={input}
          />
        </label>
        <label className="text-sm font-semibold text-muted">
          English Title
          <input
            name="title_en"
            required
            defaultValue={event?.title_en || ""}
            className={input}
          />
        </label>
        <label className="text-sm font-semibold text-muted">
          中文标题
          <input
            name="title_zh"
            required
            defaultValue={event?.title_zh || ""}
            className={input}
          />
        </label>
        <label className="text-sm font-semibold text-muted md:col-span-2">
          English Description
          <textarea
            name="description_en"
            required
            defaultValue={event?.description_en || ""}
            className={input}
            rows={3}
          />
        </label>
        <label className="text-sm font-semibold text-muted md:col-span-2">
          中文说明
          <textarea
            name="description_zh"
            required
            defaultValue={event?.description_zh || ""}
            className={input}
            rows={3}
          />
        </label>
        <AirportPicker
          label="Departure Airport"
          selected={departure}
          onChange={(value) => {
            setDeparture(value);
            onDirty(true);
          }}
          onSelect={(value) => {
            setDeparture(value);
            onDirty(true);
          }}
        />
        <AirportPicker
          label="Arrival Airport"
          selected={arrival}
          onChange={(value) => {
            setArrival(value);
            onDirty(true);
          }}
          onSelect={(value) => {
            setArrival(value);
            onDirty(true);
          }}
        />
        <label className="text-sm font-semibold text-muted">
          Historical Event Date
          <input
            name="event_date"
            type="date"
            min="1900-01-01"
            max="2200-12-31"
            required
            defaultValue={eventDate}
            className={input}
          />
        </label>
        <label className="text-sm font-semibold text-muted">
          Publish Start Date
          <input
            name="publish_start_date"
            type="date"
            min="1900-01-01"
            max="2200-12-31"
            required
            defaultValue={startDate}
            className={input}
          />
        </label>
        <label className="text-sm font-semibold text-muted">
          Publish End Date
          <input
            name="publish_end_date"
            type="date"
            min="1900-01-01"
            max="2200-12-31"
            required
            defaultValue={endDate}
            className={input}
          />
        </label>
        <div className="space-y-3 pt-7 text-sm font-semibold text-muted">
          <label className="flex gap-2">
            <input
              name="recurring"
              type="checkbox"
              defaultChecked={event?.recurring ?? true}
            />
            Recurring annually
          </label>
          <label className="flex gap-2">
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={event?.enabled ?? true}
            />
            Enabled
          </label>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button className="button-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        {status && (
          <span
            role={status === "Saved" ? "status" : "alert"}
            className={`text-sm font-semibold ${status === "Saved" ? "text-brand" : "text-danger-fg"}`}
          >
            {status}
          </span>
        )}
      </div>
    </form>
  );
}

export function MemorialManager({ events }: { events: Event[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingDirty, setEditingDirty] = useState(false);
  const [message, setMessage] = useState("");
  const editingEvent = events.find((event) => event.id === editingEventId);
  const openEdit = (event: Event) => {
    if (
      editingEventId &&
      editingEventId !== event.id &&
      editingDirty &&
      !window.confirm("Discard unsaved changes to this memorial flight?")
    )
      return;
    setEditingEventId(event.id);
    setEditingDirty(false);
    setMessage("");
  };
  return (
    <div className="mt-8 space-y-6">
      <button
        type="button"
        className="button-primary"
        onClick={() => {
          if (
            addOpen &&
            !window.confirm(
              "Discard unsaved changes to the new memorial flight?",
            )
          )
            return;
          setAddOpen((value) => !value);
        }}
      >
        + Add Memorial Flight
      </button>
      {message && (
        <p
          role="status"
          className="rounded-xl bg-brand-soft p-3 text-sm text-brand"
        >
          {message}
        </p>
      )}
      {addOpen && (
        <MemorialForm
          key="new"
          mode="add"
          onCancel={() => setAddOpen(false)}
          onSaved={() => setAddOpen(false)}
          onMessage={setMessage}
          onDirty={() => {}}
        />
      )}
      {events.map((event) => (
        <article
          key={event.id}
          className="rounded-2xl border border-line bg-surface p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">
                {event.event_key}
              </p>
              <h2 className="mt-1 text-xl font-bold">{event.title_en}</h2>
              <p className="mt-1 text-sm text-muted">
                {event.departure_iata} → {event.arrival_iata} · publish{" "}
                {event.publish_start_date ||
                  `${event.publish_month}/${event.publish_day}`}{" "}
                –{" "}
                {event.publish_end_date ||
                  `${event.publish_month}/${event.publish_day}`}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${event.enabled ? "bg-brand-soft text-brand" : "bg-surface-muted text-muted"}`}
            >
              {event.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="button-secondary"
              onClick={() => openEdit(event)}
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded-full border border-danger-line px-4 py-2 text-sm font-bold text-danger-fg"
              onClick={async () => {
                if (window.confirm("Delete this memorial event?")) {
                  const result = await deleteMemorial(event.id);
                  setMessage(result.success || result.error || "");
                }
              }}
            >
              Delete
            </button>
          </div>
          {editingEventId === event.id && editingEvent && (
            <MemorialForm
              key={event.id}
              event={event}
              mode="edit"
              onCancel={() => {
                setEditingEventId(null);
                setEditingDirty(false);
              }}
              onSaved={() => {
                setEditingEventId(null);
                setEditingDirty(false);
              }}
              onMessage={setMessage}
              onDirty={setEditingDirty}
            />
          )}
        </article>
      ))}
    </div>
  );
}
