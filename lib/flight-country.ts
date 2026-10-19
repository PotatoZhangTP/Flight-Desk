import { normalizeCountryCode } from "@/lib/country-codes";

export type CountryFlight = {
  departure_country_code?: string | null;
  arrival_country_code?: string | null;
  departure_airport?: string | null;
  arrival_airport?: string | null;
  departure_airport_icao?: string | null;
  arrival_airport_icao?: string | null;
  departure_airport_iata?: string | null;
  arrival_airport_iata?: string | null;
};

export function flightCountry(flight: CountryFlight, side: "departure" | "arrival", airports: ReadonlyMap<string, { countryCode?: string | null }>) {
  for (const raw of [flight[`${side}_airport_icao`], flight[`${side}_airport_iata`], flight[`${side}_airport`]]) {
    const code = normalizeCountryCode(airports.get(raw?.trim().toUpperCase() || "")?.countryCode);
    if (/^[A-Z]{2}$/.test(code)) return code;
  }
  const stored = normalizeCountryCode(flight[`${side}_country_code`]);
  return /^[A-Z]{2}$/.test(stored) ? stored : "";
}

export function flightRelatedToCountry(flight: CountryFlight, country: string, airports: ReadonlyMap<string, { countryCode?: string | null }>) {
  const code = normalizeCountryCode(country);
  return !code || (["departure", "arrival"] as const).some(side => flightCountry(flight, side, airports) === code);
}
