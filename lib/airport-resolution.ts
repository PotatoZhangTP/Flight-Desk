import type { SupabaseClient } from "@supabase/supabase-js";

export type CanonicalAirport = {
  id: string;
  ident: string | null;
  name: string;
  icao_code: string | null;
  iata_code: string | null;
  country_code: string | null;
  timezone: string | null;
};

type AirportRow = Partial<CanonicalAirport> & { municipality?: string | null };

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const upper = (value: unknown) => clean(value).toUpperCase();

function isSame(value: unknown, query: string) {
  return clean(value).toLocaleLowerCase() === query.toLocaleLowerCase();
}

/**
 * Resolve an airport against the shared reference catalog. This deliberately
 * accepts only an exact code or an unambiguous exact name/city match; fuzzy
 * search is for choosing an airport, never for silently saving one.
 */
export async function resolveCanonicalAirport(
  supabase: SupabaseClient,
  input: { iata?: unknown; icao?: unknown; ident?: unknown; name?: unknown },
): Promise<CanonicalAirport | null> {
  const probes = [input.iata, input.icao, input.ident, input.name]
    .map(clean)
    .filter(Boolean);
  for (const probe of probes) {
    const { data, error } = await supabase.rpc("search_airports", {
      search_query: probe,
      result_limit: 20,
    });
    if (error || !Array.isArray(data)) continue;
    const exact = (data as AirportRow[]).filter(row =>
      isSame(row.iata_code, probe) ||
      isSame(row.icao_code, probe) ||
      isSame(row.ident, probe) ||
      isSame(row.name, probe) ||
      isSame(row.municipality, probe),
    );
    const codeExact = exact.filter(row =>
      [input.iata, input.icao, input.ident].some(value => {
        const candidate = clean(value);
        return candidate && (isSame(row.iata_code, candidate) || isSame(row.icao_code, candidate) || isSame(row.ident, candidate));
      }),
    );
    // Alias matches are returned by the shared search RPC but are not part of
    // the airport row itself. A single result is safe to accept; a city query
    // returning several airports remains unresolved and must be confirmed.
    const matches = codeExact.length ? codeExact : exact.length ? exact : data.length === 1 && isSame(input.name, probe) ? data as AirportRow[] : [];
    if (matches.length !== 1) continue;
    const row = matches[0];
    if (!row.id || !clean(row.name)) continue;
    return {
      id: String(row.id),
      ident: clean(row.ident) || null,
      name: clean(row.name),
      icao_code: upper(row.icao_code) || null,
      iata_code: upper(row.iata_code) || null,
      country_code: upper(row.country_code) || null,
      timezone: clean(row.timezone) || null,
    };
  }
  return null;
}
