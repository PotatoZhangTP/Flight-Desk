"use client";

import { useEffect, useRef, useState } from "react";
import { useText } from "@/components/i18n";

type AircraftOption = { code: string; name: string; manufacturer: string | null; family: string | null; aliases: string[] };

export function AircraftPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useText();
  const [options, setOptions] = useState<AircraftOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (!query) { setOptions([]); setLoading(false); return; }
    const timer = window.setTimeout(async () => {
      requestRef.current?.abort();
      const controller = new AbortController(); requestRef.current = controller;
      setLoading(true); setError(false);
      try {
        const response = await fetch(`/api/aircraft-catalog?q=${encodeURIComponent(query)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("catalog");
        const result = await response.json();
        if (!controller.signal.aborted) setOptions(Array.isArray(result.items) ? result.items : []);
      } catch (caught) { if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => () => requestRef.current?.abort(), []);

  return <div className="relative">
    <label className="block text-sm font-semibold text-muted" htmlFor="aircraft-type-picker">{t("Aircraft type (optional)")}</label>
    <input
      ref={inputRef}
      id="aircraft-type-picker"
      value={value}
      onChange={event => { onChange(event.target.value); setOpen(true); }}
      onFocus={() => setOpen(true)}
      onKeyDown={event => { if (event.key === "Escape") setOpen(false); if (event.key === "ArrowDown" && options[0]) { event.preventDefault(); onChange(options[0].code); setOpen(false); } }}
      autoComplete="off"
      placeholder={t("e.g. Boeing 737-800")}
      className="mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-3 text-sm font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
      aria-autocomplete="list"
      aria-controls="aircraft-type-results"
    />
    {open && value.trim() && <div id="aircraft-type-results" role="listbox" className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-line bg-elevated p-1 shadow-xl">
      {loading && <p className="px-3 py-2 text-xs text-muted">{t("Loading…")}</p>}
      {!loading && error && <p className="px-3 py-2 text-xs text-muted">{t("Catalog unavailable. You can still enter a manual aircraft type.")}</p>}
      {!loading && !error && options.map(option => <button key={option.code} type="button" role="option" className="flex w-full min-w-0 items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-brand-soft focus:bg-brand-soft focus:outline-none" onMouseDown={event => event.preventDefault()} onClick={() => { onChange(option.code); setOpen(false); inputRef.current?.focus(); }}>
        <span className="mt-0.5 shrink-0 rounded-md bg-brand-soft px-2 py-1 text-xs font-bold text-brand">{option.code}</span>
        <span className="min-w-0"><strong className="block truncate text-sm text-ink">{option.name}</strong><span className="block text-xs text-muted">{option.manufacturer ? option.manufacturer[0].toUpperCase() + option.manufacturer.slice(1) : t("Unclassified")}{option.family ? ` · ${option.family}` : ""}</span></span>
      </button>)}
      {!loading && !error && !options.length && <p className="px-3 py-2 text-xs text-muted">{t("No matching aircraft. You can enter a manual aircraft type.")}</p>}
    </div>}
  </div>;
}
