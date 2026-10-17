import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { airportCoordinateMap, airportLookupKey, type FlightStatRow } from "@/lib/flight-stats";

type MapFlight = FlightStatRow & { id: string; flight_number?: string | null; flight_date?: string | null; created_at?: string | null };
export type FlightMapData = { routes: GeoJSON.FeatureCollection; airports: GeoJSON.FeatureCollection; skipped: number; completedFlights: number; initialCenter?: [number, number] };

function greatCircle(from: [number, number], to: [number, number]): [number, number][][] {
  const rad = Math.PI / 180;
  const a = [from[0] * rad, from[1] * rad]; const b = [to[0] * rad, to[1] * rad];
  const dot = Math.max(-1, Math.min(1, Math.sin(a[1]) * Math.sin(b[1]) + Math.cos(a[1]) * Math.cos(b[1]) * Math.cos(b[0] - a[0])));
  const angle = Math.acos(dot); const steps = Math.max(12, Math.ceil(angle / (5 * rad))); const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) { const f = i / steps; const sinAngle = Math.sin(angle); const x = sinAngle ? Math.sin((1 - f) * angle) / sinAngle : 1 - f; const y = sinAngle ? Math.sin(f * angle) / sinAngle : f; const lat = Math.atan2(y * Math.sin(b[1]) + x * Math.sin(a[1]), Math.sqrt((y * Math.cos(b[1]) * Math.cos(b[0]) + x * Math.cos(a[1]) * Math.cos(a[0])) ** 2 + (y * Math.cos(b[1]) * Math.sin(b[0]) + x * Math.cos(a[1]) * Math.sin(a[0])) ** 2)) / rad; const normalizedLon = Math.atan2(y * Math.cos(b[1]) * Math.sin(b[0]) + x * Math.cos(a[1]) * Math.sin(a[0]), y * Math.cos(b[1]) * Math.cos(b[0]) + x * Math.cos(a[1]) * Math.cos(a[0])) / rad; const previousLon = points.at(-1)?.[0] ?? from[0]; let lon = normalizedLon; while (lon - previousLon > 180) lon -= 360; while (lon - previousLon < -180) lon += 360; points.push([lon, lat]); }
  return points.length > 1 ? [points] : [];
}

export async function getFlightMapData(supabase: SupabaseClient, userId: string): Promise<FlightMapData> {
  const { data: flights, error } = await supabase.from("flights").select("id,flight_number,flight_date,created_at,status,departure_airport_icao,arrival_airport_icao,departure_airport_iata,arrival_airport_iata,departure_airport,arrival_airport").eq("user_id", userId).eq("status", "completed").order("flight_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (flights ?? []) as MapFlight[];
  const codes = [...new Set(rows.flatMap(row => [row.departure_airport_icao, row.arrival_airport_icao, row.departure_airport_iata, row.arrival_airport_iata, row.departure_airport, row.arrival_airport]).filter((code): code is string => Boolean(code)).map(code => code.trim().toUpperCase()))];
  const [{ data: icao }, { data: iata }, { data: ident }] = codes.length ? await Promise.all([supabase.from("airports").select("name,municipality,country_code,country_name,icao_code,iata_code,ident,latitude,longitude").in("icao_code", codes), supabase.from("airports").select("name,municipality,country_code,country_name,icao_code,iata_code,ident,latitude,longitude").in("iata_code", codes), supabase.from("airports").select("name,municipality,country_code,country_name,icao_code,iata_code,ident,latitude,longitude").in("ident", codes)]) : [{ data: [] }, { data: [] }, { data: [] }];
  const airportRows = [...(icao ?? []), ...(iata ?? []), ...(ident ?? [])]; const coordinates = airportCoordinateMap(airportRows); const details = new Map<string, { name: string; municipality: string | null; countryCode: string | null; countryName: string | null; icao: string | null; iata: string | null }>();
  for (const row of airportRows) for (const key of [row.icao_code, row.iata_code, row.ident]) if (key) details.set(key.toUpperCase(), { name: row.name ?? key, municipality: row.municipality ?? null, countryCode: row.country_code ?? null, countryName: row.country_name ?? null, icao: row.icao_code, iata: row.iata_code });
  const airportCounts = new Map<string, number>(); const routeMap = new Map<string, { from: string; to: string; count: number; ids: string[] }>(); let skipped = 0;
  for (const row of rows) { const from = airportLookupKey(row, "departure"); const to = airportLookupKey(row, "arrival"); if (!from || !to || !coordinates.has(from) || !coordinates.has(to)) { skipped++; continue; } airportCounts.set(from, (airportCounts.get(from) ?? 0) + 1); if (to !== from) airportCounts.set(to, (airportCounts.get(to) ?? 0) + 1); const key = [from, to].sort().join("|"); const route = routeMap.get(key) ?? { from, to, count: 0, ids: [] }; route.count++; route.ids.push(row.id); routeMap.set(key, route); }
  const airportFeatures: GeoJSON.Feature[] = [...airportCounts].map(([code, count]) => { const d = details.get(code); const c = coordinates.get(code)!; return { type: "Feature", geometry: { type: "Point", coordinates: [c.longitude, c.latitude] }, properties: { code, name: d?.name ?? code, municipality: d?.municipality ?? "", countryCode: d?.countryCode ?? "", countryName: d?.countryName ?? "", icao: d?.icao ?? code, iata: d?.iata ?? "", count } }; });
  const routeFeatures: GeoJSON.Feature[] = []; for (const route of routeMap.values()) { const from = coordinates.get(route.from)!; const to = coordinates.get(route.to)!; for (const segment of greatCircle([from.longitude, from.latitude], [to.longitude, to.latitude])) routeFeatures.push({ type: "Feature", geometry: { type: "LineString", coordinates: segment }, properties: { from: route.from, to: route.to, count: route.count, flightIds: route.ids.join(",") } }); }
  const latestArrival = rows.find(row => {
    const key = airportLookupKey(row, "arrival");
    return Boolean(key && coordinates.has(key));
  });
  const latestArrivalKey = latestArrival ? airportLookupKey(latestArrival, "arrival") : null;
  const latestArrivalCoordinate = latestArrivalKey ? coordinates.get(latestArrivalKey) : undefined;
  return { routes: { type: "FeatureCollection", features: routeFeatures }, airports: { type: "FeatureCollection", features: airportFeatures }, skipped, completedFlights: rows.length, initialCenter: latestArrivalCoordinate ? [latestArrivalCoordinate.longitude, latestArrivalCoordinate.latitude] : undefined };
}
