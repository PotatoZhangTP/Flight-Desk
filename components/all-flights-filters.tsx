"use client";

import { useMemo, useState } from "react";
import Link from "@/components/navigation-link";
import { T } from "@/components/i18n";

type CountryOption = {
  code: string;
  name: string;
};

type FilterValues = Record<string, string | undefined>;

type AllFlightsFiltersProps = {
  values: FilterValues;
  countries?: CountryOption[];
};

const labelClass =
  "flex min-w-0 flex-col text-[10px] font-bold uppercase tracking-[0.14em] text-subtle";
const controlClass =
  "mt-1 h-9 min-h-9 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/15 sm:h-9 sm:min-h-9";

export function AllFlightsFilters({ values, countries = [] }: AllFlightsFiltersProps) {
  const [open, setOpen] = useState(true);
  const selectedCountry = (values.destinationCountry ?? "").toUpperCase();
  const selectedCountryName =
    countries.find((country) => country.code === selectedCountry)?.name ?? selectedCountry;
  const [countryName, setCountryName] = useState(selectedCountryName);
  const [selectedCode, setSelectedCode] = useState(selectedCountry);

  const activeCount = useMemo(
    () =>
      [
        "q",
        "airport",
        "destinationCountry",
        "from",
        "to",
        "departure",
        "arrival",
        "aircraft",
        "minDuration",
        "maxDuration",
        "status",
      ].filter((key) => values[key]).length,
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

  const selectExactCountry = () => {
    const query = countryName.trim().toLowerCase();
    const match = countries.find(
      (country) =>
        country.code.toLowerCase() === query || country.name.toLowerCase() === query,
    );
    if (match) {
      setCountryName(match.name);
      setSelectedCode(match.code);
    }
  };

  return (
    <section className="mt-6">
      <div className="flex justify-end">
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
          <form action="/flights" method="get" className="grid gap-x-3 gap-y-2 overflow-visible rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className={labelClass}>
              Search Flights
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
              Departure Airport
              <input name="departure" defaultValue={values.departure ?? ""} className={controlClass} />
            </label>
            <label className={labelClass}>
              Arrival Airport
              <input name="arrival" defaultValue={values.arrival ?? ""} className={controlClass} />
            </label>
            <label className={labelClass}>
              Min Duration (Hours)
              <input
                type="number"
                min="0"
                name="minDuration"
                defaultValue={values.minDuration ?? ""}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Max Duration (Hours)
              <input
                type="number"
                min="0"
                name="maxDuration"
                defaultValue={values.maxDuration ?? ""}
                className={controlClass}
              />
            </label>
            <label className={labelClass}>
              Status
              <select name="status" defaultValue={values.status ?? ""} className={controlClass}>
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="planned">Planned</option>
              </select>
            </label>

            <div className="flex flex-wrap justify-end gap-2 sm:col-span-2 lg:col-span-3">
              <Link
                href="/flights"
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
