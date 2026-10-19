import { normalizeCountryCode } from "@/lib/country-codes";

export type PassportFlight = { id: string; flight_date: string; status?: string | null; departure_country_code?: string | null; arrival_country_code?: string | null };
export type CountryVisits = { code: string; count: number; first: string; latest: string; flightIds: string[]; relatedFlightIds: string[] };

export function isCompletedPassportFlight(flight: Pick<PassportFlight, "status">) {
  return !flight.status || flight.status.trim().toLowerCase() === "completed";
}

/** A completed flight contributes one visit to each endpoint country.
 * If both endpoints are in the same country, that flight counts once for that
 * country. Different flight IDs on the same day count separately; repeated
 * rows of the same ID count once. This keeps stamps, dates and counts based on
 * the same completed-flight source while excluding planned flights.
 */
export function passportVisits(flights: PassportFlight[]) {
  const visits = new Map<string, CountryVisits>();
  const completed = [...new Map(flights.filter(isCompletedPassportFlight).map(f => [f.id, f])).values()];
  for (const flight of completed) {
    const date = flight.flight_date?.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) continue;
    const time = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(time.getTime()) || time.toISOString().slice(0, 10) !== date) continue;
    for (const code of new Set([normalizeCountryCode(flight.departure_country_code), normalizeCountryCode(flight.arrival_country_code)])) {
      if (!/^[A-Z]{2}$/.test(code)) continue;
      const current = visits.get(code) ?? { code, count: 0, first: date, latest: date, flightIds: [], relatedFlightIds: [] };
      current.count += 1;
      current.first = date < current.first ? date : current.first;
      current.latest = date > current.latest ? date : current.latest;
      current.flightIds.push(flight.id);
      current.relatedFlightIds.push(flight.id);
      visits.set(code, current);
    }
  }
  return visits;
}
