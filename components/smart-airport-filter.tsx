"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CountryFlag } from "@/components/country-flag";
import { useText } from "@/components/i18n";
import { airportCodes, type Airport } from "@/lib/airports";

type Props = { name: string; label: string; initialValue: string; initialExact: string; airports: Airport[] };
const inputClass = "h-9 min-h-9 w-full rounded-lg border border-line-strong bg-surface px-3 pr-8 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/15";

export function SmartAirportFilter({ name, label, initialValue, initialExact, airports }: Props) {
  const t = useText();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialValue);
  const [exact, setExact] = useState(initialExact);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    setQuery(initialValue);
    setExact(initialExact);
    setOpen(false);
    setActive(-1);
  }, [initialExact, initialValue]);

  useEffect(() => {
    function close(event: MouseEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const options = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    if (exact || search.length < 2 || !open) return [];
    return airports.filter((airport) => [airport.iata, airport.icao, airport.ident, airport.name, airport.municipality, airport.countryName].some((value) => value?.toLocaleLowerCase().includes(search))).slice(0, 12);
  }, [airports, exact, open, query]);

  const selectExact = (airport: Airport) => {
    const display = `${airport.iata || airport.icao || airport.ident || airport.name} · ${airport.name}`;
    setQuery(display); setExact(`${airport.icao || ""}|${airport.iata || ""}`); setOpen(false);
  };
  const chooseFuzzy = () => { setExact(""); setOpen(false); };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const itemCount = options.length ? options.length + 1 : 0;
    if (event.key === "Escape") { setOpen(false); setActive(-1); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); setOpen(true);
      setActive(value => itemCount ? (value + (event.key === "ArrowDown" ? 1 : -1) + itemCount) % itemCount : -1);
    }
    if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      if (active === 0) chooseFuzzy(); else if (options[active - 1]) selectExact(options[active - 1]);
    }
  };
  const expanded = open && !exact && query.trim().length >= 2;
  return <div ref={root} className="relative mt-1 min-w-0">
    <input type="hidden" name={`${name}Exact`} value={exact} readOnly />
    <input id={id} name={name} value={query} placeholder={t("flight.airportPlaceholder")} autoComplete="off" role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-results`} aria-activedescendant={active >= 0 ? `${id}-option-${active}` : undefined} onFocus={() => setOpen(true)} onKeyDown={keyDown} onChange={event => { setQuery(event.target.value); setExact(""); setOpen(true); setActive(-1); }} className={inputClass} />
    {(query || exact) && <button type="button" onClick={() => { setQuery(""); setExact(""); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 px-1 text-lg leading-none text-subtle hover:text-brand" aria-label={`Clear ${label}`}>×</button>}
    {expanded && <div id={`${id}-results`} role="listbox" className="absolute left-0 z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
      {options.length > 0 && <button id={`${id}-option-0`} type="button" role="option" aria-selected={active === 0} onMouseEnter={() => setActive(0)} onMouseDown={event => event.preventDefault()} onClick={chooseFuzzy} className={`w-full rounded-lg px-3 py-2.5 text-left ${active === 0 ? "bg-brand-soft" : "hover:bg-brand-soft"}`}><span className="block text-sm font-semibold text-ink">{t("flight.searchAllAirports", { query: query.trim() })}</span><span className="mt-0.5 block text-xs text-muted">{t("flight.includeMatchingAirports")}</span></button>}
      {!options.length && <p role="status" className="px-3 py-2.5 text-sm text-muted">{t("flight.noMatchingAirports")}</p>}
      {options.map((airport, index) => <button key={airport.id || `${airport.icao}-${airport.iata}`} id={`${id}-option-${index + 1}`} type="button" role="option" aria-selected={active === index + 1} onMouseEnter={() => setActive(index + 1)} onMouseDown={event => event.preventDefault()} onClick={() => selectExact(airport)} className={`block w-full rounded-lg px-3 py-2.5 text-left ${active === index + 1 ? "bg-brand-soft" : "hover:bg-brand-soft"}`}><span className="block text-sm font-semibold text-ink">{airportCodes(airport)}</span><span className="mt-0.5 block text-xs text-muted">{airport.name}</span><span className="mt-0.5 block text-xs text-muted"><CountryFlag code={airport.countryCode} /> {[airport.municipality, airport.countryName].filter(Boolean).join(", ")}</span></button>)}
    </div>}
  </div>;
}
