"use client";

import { useMemo, useState } from "react";
import Link from "@/components/navigation-link";
import { T } from "@/components/i18n";

type CountryOption = { code: string; name: string };
type Props = { values: Record<string, string | undefined>; countries?: CountryOption[] };

export function AllFlightsFilters({ values, countries = [] }: Props) {
  const [open, setOpen] = useState(false);
  const selectedCountry = (values.destinationCountry || "").toUpperCase();
  const selectedCountryName = countries.find(country => country.code === selectedCountry)?.name || selectedCountry;
  const [countryName, setCountryName] = useState(selectedCountryName);
  const [selectedCode, setSelectedCode] = useState(selectedCountry);
  const count = useMemo(() => ["q", "airport", "destinationCountry", "from", "to", "departure", "arrival", "aircraft", "minDuration", "maxDuration", "status"].filter(key => Boolean(values[key])).length, [values]);
  const filteredCountries = countries.filter(country => `${country.name} ${country.code}`.toLowerCase().includes(countryName.toLowerCase())).slice(0, 12);

  return <section className="mt-6">
    <div className="flex justify-end"><button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className="inline-flex items-center gap-2 rounded-full border border-brand px-4 py-2 text-sm font-bold text-brand transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><span aria-hidden="true">⌕</span>{open ? <T id="dashboard.hideFilters" /> : <T id="dashboard.showFilters" />}{count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-xs text-on-brand">{count}</span>}<span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>⌄</span></button></div>
    <div className={`grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out ${open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="min-h-0 overflow-visible"><form className="grid gap-3 overflow-visible rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3">
      <input name="q" defaultValue={values.q || ""} placeholder="Search Flights" className="rounded-xl border border-line-strong bg-surface px-3 py-2" />
      <input name="aircraft" defaultValue={values.aircraft || ""} placeholder="Aircraft Type" className="rounded-xl border border-line-strong bg-surface px-3 py-2" />
      <div className="relative"><input value={countryName} onChange={event => { setCountryName(event.target.value); setSelectedCode(""); }} placeholder="Country" aria-label="Country" autoComplete="off" className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2" /><input type="hidden" name="destinationCountry" value={selectedCode} />{countryName && filteredCountries.length > 0 && !selectedCode && <div className="absolute inset-x-0 top-full z-40 mt-1 max-h-56 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg">{filteredCountries.map(country => <button key={country.code} type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-soft" onMouseDown={event => event.preventDefault()} onClick={() => { setCountryName(country.name); setSelectedCode(country.code); }}>{country.name} <span className="text-xs text-muted">{country.code}</span></button>)}</div>}{selectedCode && <button type="button" aria-label="Clear Country" className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-lg text-muted hover:text-brand" onClick={() => { setCountryName(""); setSelectedCode(""); }}>×</button>}</div>
      <label className="text-xs font-bold uppercase tracking-wider text-subtle">From<input name="from" type="date" defaultValue={values.from || ""} className="mt-1 block w-full rounded-xl border border-line-strong bg-surface px-3 py-2" /></label>
      <label className="text-xs font-bold uppercase tracking-wider text-subtle">To<input name="to" type="date" defaultValue={values.to || ""} className="mt-1 block w-full rounded-xl border border-line-strong bg-surface px-3 py-2" /></label>
      <input name="departure" defaultValue={values.departure || ""} placeholder="Departure Airport" className="rounded-xl border border-line-strong bg-surface px-3 py-2" /><input name="arrival" defaultValue={values.arrival || ""} placeholder="Arrival Airport" className="rounded-xl border border-line-strong bg-surface px-3 py-2" /><input name="minDuration" type="number" min="0" step="0.1" defaultValue={values.minDuration || ""} placeholder="Min Duration (Hours)" className="rounded-xl border border-line-strong bg-surface px-3 py-2" /><input name="maxDuration" type="number" min="0" step="0.1" defaultValue={values.maxDuration || ""} placeholder="Max Duration (Hours)" className="rounded-xl border border-line-strong bg-surface px-3 py-2" />
      <select name="status" defaultValue={values.status || ""} className="rounded-xl border border-line-strong bg-surface px-3 py-2"><option value="">All Statuses</option><option value="completed">Completed</option><option value="planned">Planned</option></select><div className="flex gap-2"><button className="rounded-xl bg-brand px-4 py-2 font-bold text-on-brand"><T id="common.search" /></button><Link href="/flights" className="rounded-xl border border-line px-4 py-2 font-bold text-brand"><T id="dashboard.clearFilters" /></Link></div>
    </form></div></div>
  </section>;
}
