"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { airportCodes, type Airport } from "@/lib/airports";
import { CountryFlag } from "@/components/country-flag";

const inputClass = "mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

export function AirportPicker({ label, selected, onChange, onSelect }: {
  label: string; selected: Airport | null;
  onChange: (airport: Airport | null) => void; onSelect: (airport: Airport) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState(selected?.name || "");
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [options, setOptions] = useState<Airport[]>([]);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const searchRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id]);

  useEffect(() => {
    if (manual || selected || !open || query.trim().length < 2) return;
    let live = true;
    const controller = new AbortController();
    setOptions([]); setActive(-1); setStatus("loading");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/airports?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok || !Array.isArray(body.airports)) throw new Error("Lookup failed");
        if (live) { setOptions(body.airports); setStatus("ready"); }
      } catch {
        if (live) { setOptions([]); setStatus("error"); }
      }
    }, 250);
    return () => { live = false; clearTimeout(timer); controller.abort(); };
  }, [query, manual, selected, open]);

  function select(airport: Airport) {
    setQuery(airport.name); setOpen(false); setOptions([]); setActive(-1);
    onSelect(airport);
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); setActive(-1); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); setOpen(true);
      setActive((value) => !options.length ? -1 : value < 0 ? (event.key === "ArrowDown" ? 0 : options.length - 1) : (value + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if (event.key === "Enter" && !selected) {
      event.preventDefault();
      if (open && options[active]) select(options[active]);
    }
  }
  function startManual() {
    const airport: Airport = selected ? { ...selected, id: null, origin: "manual" } : {
      id: null, origin: "manual", name: query.trim(), ident: null, iata: null, icao: null,
      countryCode: null, countryName: null, municipality: null, timezone: null, latitude: null, longitude: null,
    };
    setManual(true); setOpen(false); onChange(airport);
    setTimeout(() => nameRef.current?.focus(), 0);
  }
  const expanded = open && !manual && !selected && query.trim().length >= 2;
  return <div className="relative min-w-0" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    {manual ? <div className="space-y-3 rounded-xl border border-line bg-surface-muted p-4">
      <p className="text-sm font-semibold text-ink">{label} · manual entry</p>
      <label className="block text-sm text-muted">Airport name<input ref={nameRef} required maxLength={500} value={selected?.name || ""} onChange={(e) => onChange({ ...selected!, name: e.target.value })} className={inputClass} /></label>
      <div className="grid grid-cols-2 gap-3">
        {([['iata', 'IATA (optional)', 3], ['icao', 'ICAO (optional)', 4], ['countryCode', 'Country code (optional)', 2], ['ident', 'Ident (optional)', 80]] as const).map(([key, title, max]) =>
          <label key={key} className="block text-xs text-muted">{title}<input value={selected?.[key] || ""} maxLength={max}
            pattern={key === 'iata' ? '[A-Za-z]{3}' : key === 'icao' ? '[A-Za-z]{4}' : key === 'countryCode' ? '[A-Za-z]{2}' : undefined}
            onChange={(e) => onChange({ ...selected!, [key]: e.target.value.toUpperCase() || null, ...(key === "countryCode" ? { countryName: null } : {}) })} className={inputClass} /></label>)}
      </div>
      <p className="text-xs text-muted">Choose the airport&apos;s IANA timezone below. Manual entries do not change the shared airport database.</p>
      <button type="button" className="text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand" onClick={() => {
        setManual(false); setQuery(""); onChange(null); setStatus("idle"); setTimeout(() => searchRef.current?.focus(), 0);
      }}>Back to airport search</button>
    </div> : <>
      <label htmlFor={id} className="text-sm font-semibold text-muted">{label}</label>
      <input ref={searchRef} id={id} role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-results`}
        aria-activedescendant={expanded && active >= 0 && options[active] ? `${id}-option-${active}` : undefined}
        aria-describedby={`${id}-help`} autoComplete="off" maxLength={80}
        value={selected ? selected.name : query} placeholder="Search IATA, ICAO, name, city or country"
        onFocus={() => setOpen(true)} onKeyDown={keyDown}
        onChange={(e) => { setQuery(e.target.value); onChange(null); setOptions([]); setActive(-1); setOpen(true); }} className={inputClass} />
      {expanded && <div className="absolute left-0 right-0 z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-xl">
        {status === "loading" && <p role="status" className="px-3 py-3 text-sm text-muted">Searching airports…</p>}
        {status === "error" && <p role="alert" className="px-3 py-3 text-sm text-danger-fg">Airport search is unavailable. Try again or enter manually.</p>}
        {status === "ready" && !options.length && <p role="status" className="px-3 py-3 text-sm text-muted">No matching airports. Try another name or enter manually.</p>}
        <ul id={`${id}-results`} role="listbox" aria-label={`${label} suggestions`}>
          {options.map((airport, index) => <li key={airport.id} id={`${id}-option-${index}`} role="option" aria-selected={active === index}
            onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => select(airport)}
            className={`cursor-pointer rounded-lg px-3 py-3 text-sm ${active === index ? 'bg-brand-soft' : 'hover:bg-surface-muted'}`}>
            <p className="font-semibold text-ink"><CountryFlag code={airport.countryCode} /> {airport.name}</p>
            <p className="mt-1 text-xs text-muted">{airportCodes(airport)}</p>
            <p className="mt-1 text-xs text-muted">{[airport.municipality, airport.countryName || airport.countryCode].filter(Boolean).join(", ") || "Location unavailable"}</p>
            {!airport.timezone && <p className="mt-1 text-xs text-muted">Timezone needs manual selection</p>}
          </li>)}
        </ul>
        <button type="button" onClick={startManual} className="block w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-brand hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand">Enter airport manually</button>
      </div>}
      <p id={`${id}-help`} className="mt-2 text-xs text-muted">{selected ? <><CountryFlag code={selected.countryCode} /> {airportCodes(selected)} · {selected.origin === "snapshot" ? "Saved flight information" : selected.timezone ? "Recommended timezone: " + selected.timezone : "Select timezone below"}</> : "Type at least 2 characters. Arrow keys to browse, Enter to select."}</p>
      {!expanded && <button type="button" onClick={startManual} className="mt-2 text-xs font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">{selected ? "Edit airport manually" : "Enter airport manually"}</button>}
    </>}
  </div>;
}
