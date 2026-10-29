/** Reference selections and historical snapshots share a shape, not an IATA identity. */
export type Airport = {
  id: string | null;
  origin: "catalog" | "manual" | "snapshot";
  ident: string | null;
  iata: string | null;
  icao: string | null;
  name: string;
  countryCode: string | null;
  countryName: string | null;
  municipality: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Reference metadata used to rank ambiguous airport suggestions. */
  airportType?: string | null;
  scheduledService?: boolean;
};

export function airportCodes(airport: Airport) {
  const codes = [airport.iata, airport.icao].filter(Boolean).join(" · ");
  return codes || (airport.ident ? `Ident: ${airport.ident}` : "No IATA / ICAO code");
}

export function airportLegacyKey(airport: Airport) {
  return airport.iata || airport.icao || airport.ident || airport.name;
}

export function airportFromSnapshot(flight: Record<string, unknown>, side: "departure" | "arrival"): Airport | null {
  const text = (suffix: string) => typeof flight[`${side}_${suffix}`] === "string" ? (flight[`${side}_${suffix}`] as string).trim() || null : null;
  const legacy = text("airport");
  const name = text("airport_name") || legacy || text("airport_iata") || text("airport_icao");
  if (!name) return null;
  return {
    id: null, origin: "snapshot", ident: legacy, name,
    iata: text("airport_iata"), icao: text("airport_icao"),
    countryCode: text("country_code"), countryName: null, municipality: null,
    timezone: text("timezone"), latitude: null, longitude: null,
  };
}

/** Only map the explicit ICAO field, never GPS or ident. */
export function airportFromRow(row: Record<string, unknown>): Airport {
  const text = (key: string) => typeof row[key] === "string" ? (row[key] as string).trim() || null : null;
  if (!row.id || !text("name")) throw new Error("Invalid airport reference response");
  return {
    id: String(row.id), origin: "catalog", name: text("name")!,
    ident: text("ident"), iata: text("iata_code"), icao: text("icao_code"),
    countryCode: text("country_code"), countryName: text("country_name"),
    municipality: text("municipality"), timezone: text("timezone"),
    latitude: typeof row.latitude === "number" ? row.latitude : null,
    longitude: typeof row.longitude === "number" ? row.longitude : null,
    airportType: text("airport_type"),
    scheduledService: typeof row.scheduled_service === "boolean" ? row.scheduled_service : undefined,
  };
}
