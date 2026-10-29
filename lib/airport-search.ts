import type { Airport } from "@/lib/airports";

/** Shared public airport catalog client used by Add Flight and Excel Import. */
export async function searchAirportCatalog(query: string, signal?: AbortSignal): Promise<Airport[]> {
  const value = query.trim();
  if (value.length < 2) return [];
  const response = await fetch(`/api/airports?q=${encodeURIComponent(value)}`, { signal, cache: "no-store" });
  const body = await response.json().catch(() => null) as { airports?: unknown } | null;
  if (!response.ok || !Array.isArray(body?.airports)) throw new Error("Airport lookup failed");
  return body.airports as Airport[];
}

export function airportSearchQueries(value: string) {
  return [...new Set([value.trim()])].filter(Boolean);
}
