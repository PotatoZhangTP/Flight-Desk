"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/navigation-link";
import { T } from "@/components/i18n";
import { AddFlightDropdown } from "@/components/add-flight-dropdown";
import { SmartAirportFilter } from "@/components/smart-airport-filter";
import { DurationRangeFilter } from "@/components/duration-range-filter";
import type { Airport } from "@/lib/airports";
import { clearFlightFilters, normalizeFlightCategory } from "@/lib/flight-list-state";

type CountryOption = {
  code: string;
  name: string;
};

type FilterValues = Record<string, string | undefined>;

type AllFlightsFiltersProps = {
  values: FilterValues;
  countries?: CountryOption[];
  departureAirports: Airport[];
  arrivalAirports: Airport[];
  maximumDurationHours?: number;
};

const labelClass =
  "flex min-w-0 flex-col text-[10px] font-bold uppercase tracking-[0.14em] text-subtle";
const controlClass =
  "mt-1 h-9 min-h-9 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/15 sm:h-9 sm:min-h-9";

export function AllFlightsFilters({ values, countries = [], departureAirports, arrivalAirports, maximumDurationHours = 48 }: AllFlightsFiltersProps) {
  const [open, setOpen] = useState(true);
  const [resetVersion, setResetVersion] = useState(0);
  const airports = useMemo(() => {
    const values = new Map<string, Airport>();
    [...departureAirports, ...arrivalAirports].forEach((airport) => values.set(airport.icao || airport.iata || airport.ident || airport.name, airport));
    return [...values.values()];
  }, [arrivalAirports, departureAirports]);
  const clearHref = clearFlightFilters(values);
  const draftKey = JSON.stringify([resetVersion, ...["q", "aircraft", "destinationCountry", "airport", "airportFilter", "airportFilterExact", "departure", "departureExact", "arrival", "arrivalExact", "from", "to", "minDuration", "maxDuration", "flightCategory"].map(key => values[key] || "")]);
  const selectedCountry = (values.destinationCountry ?? "").toUpperCase();
  const selectedCountryName =
    countries.find((country) => country.code === selectedCountry)?.name ?? selectedCountry;
  const [countryName, setCountryName] = useState(selectedCountryName);
  const [selectedCode, setSelectedCode] = useState(selectedCountry);
  useEffect(() => {
    setCountryName(selectedCountryName);
    setSelectedCode(selectedCountry);
  }, [selectedCountry, selectedCountryName]);

  const activeCount = useMemo(
    () =>
      [
        "q",
        "airport",
        "airportFilter",
        "destinationCountry",
        "from",
        "to",
        "departure",
        "arrival",
        "aircraft",
        "minDuration",
        "maxDuration",
        "flightCategory",
      ].filter((key) => values[key] && (key !== "flightCategory" || normalizeFlightCategory(values[key]) !== "all")).length,
    [values],
  );

  const matchingCountries = useMemo(() => {
    const query = countryName.trim().toLowerCase();
    if (!query || selectedCode) return [];
    return countries
      .filter(
        (country) =>
          country.name.toLowerCase().includes(query) ||
          country.code.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [countries, countryName, selectedCode]);

  const countryCodeFor = (value: string) => {
    const query = value.trim().toLowerCase();
    return countries.find(
      (country) =>
        country.code.toLowerCase() === query || country.name.toLowerCase() === query,
    );
  };
  const selectExactCountry = () => {
    const match = countryCodeFor(countryName);
    if (match) {
      setCountryName(match.name);
      setSelectedCode(match.code);
    }
  };

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AddFlightDropdown />
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-brand bg-transparent px-4 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-expanded={open}
        >
          <span aria-hidden="true" className="text-base leading-none">⌕</span>
          <span>
            <T id={open ? "dashboard.hideFilters" : "dashboard.showFilters"} />
          </span>
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-xs font-bold text-on-brand">
              {activeCount}
            </span>
          )}
          <span aria-hidden="true" className="text-sm leading-none">{open ? "⌃" : "⌄"}</span>
        </button>
      </div>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ${
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-visible">
          <form key={draftKey} action="/flights" method="get" onSubmit={(event) => { const match = countryCodeFor(countryName); if (match) { setCountryName(match.name); setSelectedCode(match.code); const input = event.currentTarget.elements.namedItem("destinationCountry"); if (input instanceof HTMLInputElement) input.value = match.code; } }} className="grid gap-x-3 gap-y-2 overflow-visible rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
            {(values.status === "planned" || values.status === "completed") && <input type="hidden" name="status" value={values.status} />}
            {values.sort && <input type="hidden" name="sort" value={values.sort} />}
            {values.dir && <input type="hidden" name="dir" value={values.dir} />}
            <label className={labelClass}>
              Flight Number
              <input name="q" defaultValue={values.q ?? ""} className={controlClass} />
            </label>

            <label className={labelClass}>
              Aircraft Type
              <input
                name="aircraft"
                defaultValue={values.aircraft ?? ""}
                className={controlClass}
              />
            </label>

            <label className={labelClass}>
              Country
              <div className="relative mt-1">
                <input
                  value={countryName}
                  onChange={(event) => {
                    setCountryName(event.target.value);
                    setSelectedCode("");
                  }}
                  onBlur={selectExactCountry}
                  className={controlClass.replace("mt-1 ", "")}
                  autoComplete="off"
                  aria-label="Country"
                />
                <input type="hidden" name="destinationCountry" value={selectedCode} readOnly />
                {selectedCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setCountryName("");
                      setSelectedCode("");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-1 text-lg leading-none text-subtle hover:text-brand"
                    aria-label="Clear country"
                  >
                    ×
                  </button>
                )}
                {matchingCountries.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-surface py-1 shadow-lg">
                    {matchingCountries.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setCountryName(country.name);
                          setSelectedCode(country.code);
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-primary/10"
                      >
                        <span>{country.name}</span>
                        <span className="text-xs text-subtle">{country.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className={labelClass}>
              From
              <input type="date" name="from" defaultValue={values.from ?? ""} className={controlClass} />
            </label>
            <label className={labelClass}>
              To
              <input type="date" name="to" defaultValue={values.to ?? ""} className={controlClass} />
            </label>
            <label className={labelClass}>
              Airport
              <SmartAirportFilter name="airportFilter" label="Airport" initialValue={values.airportFilter ?? ""} initialExact={values.airportFilterExact ?? ""} airports={airports} />
            </label>
            <label className={labelClass}>
              <T id="flight.category" />
              <select name="flightCategory" defaultValue={normalizeFlightCategory(values.flightCategory)} className={controlClass}>
                <option value="all"><T id="flight.categoryAll" /></option>
                <option value="regular"><T id="flight.categoryRegular" /></option>
                <option value="memorial"><T id="flight.categoryMemorial" /></option>
              </select>
            </label>
            <DurationRangeFilter initialMin={values.minDuration ?? ""} initialMax={values.maxDuration ?? ""} maximumHours={maximumDurationHours} />
            <div className="flex flex-wrap justify-end gap-2 sm:col-span-2 lg:col-span-3">
              <Link
                href={clearHref}
                onClick={() => { setCountryName(""); setSelectedCode(""); setResetVersion(value => value + 1); }}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold text-brand transition hover:bg-brand-soft sm:min-h-9"
              >
                <T id="dashboard.clearFilters" />
              </Link>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand transition hover:opacity-90 sm:min-h-9"
              >
                <T id="common.search" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
