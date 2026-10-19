export type FlightCategory = "all" | "regular" | "memorial";
export function normalizeFlightCategory(value?: string): FlightCategory {
  return value === "regular" || value === "memorial" ? value : "all";
}

// Whitelist browsing state: all normal and temporary filters are removed.
export function clearFlightFilters(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (values.status === "planned" || values.status === "completed") params.set("status", values.status);
  for (const key of ["page", "sort", "dir"]) if (values[key]) params.set(key, values[key]!);
  return `/flights${params.size ? `?${params}` : ""}`;
}

export function filterFlightCategory<T extends { id: string }>(flights: T[], category: FlightCategory, memorialFlightIds: ReadonlySet<string>): T[] {
  if (category === "all") return flights;
  return flights.filter(flight => memorialFlightIds.has(flight.id) === (category === "memorial"));
}

export function flightPage<T extends { id: string }>(ordered: T[], requestedPage: number, focusId?: string, size = 20) {
  const pages = Math.max(1, Math.ceil(ordered.length / size));
  const target = focusId ? ordered.findIndex(flight => flight.id === focusId) : -1;
  return target >= 0 ? Math.floor(target / size) + 1 : Math.max(1, Math.min(requestedPage, pages));
}
