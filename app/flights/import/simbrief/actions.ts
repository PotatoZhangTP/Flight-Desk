"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { aircraftAliasKey, formatAircraftDisplayName } from "@/lib/aircraft-catalog";
import { normalizeFlightInput } from "@/lib/flight-input";
import { localFieldsFromTimestamp, parseSimBriefPayload, simbriefIdentifier, type SimBriefRawPreview } from "@/lib/simbrief";

type Integration = { navigraph_alias: string | null; pilot_id: string | null };
type AirportMatch = { name: string; iata: string; icao: string; countryCode: string; timezone: string };
export type SimBriefFlightPreview = {
  requestId: string | null;
  airline: string;
  flightNumber: string;
  aircraftType: string;
  aircraftDisplayName: string;
  registration: string;
  departure: AirportMatch | null;
  arrival: AirportMatch | null;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  warnings: string[];
};

function errorResult(error: string) { return { error }; }

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

async function readConfig(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("user_integrations").select("navigraph_alias,pilot_id").eq("user_id", userId).eq("provider", "simbrief").maybeSingle();
  return (data || null) as Integration | null;
}

async function fetchPayload(kind: "alias" | "pilot", identifier: string) {
  const clean = simbriefIdentifier(kind, identifier);
  if (!clean) return { error: kind === "alias" ? "simbrief.invalidAlias" : "simbrief.invalidPilotId" } as const;
  const parameter = kind === "alias" ? `username=${encodeURIComponent(clean)}` : `userid=${encodeURIComponent(clean)}`;
  const url = `https://www.simbrief.com/api/xml.fetcher.php?${parameter}&client=FlightDesk&json=v2`;
  try {
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    const body = await response.text();
    if (body.length > 2_000_000) return { error: "simbrief.responseTooLarge" } as const;
    let payload: unknown;
    try { payload = JSON.parse(body); } catch { return { error: response.status === 404 ? "simbrief.noOfp" : "simbrief.invalidResponse" } as const; }
    if (!response.ok) return { error: response.status === 404 ? "simbrief.accountOrOfpNotFound" : "simbrief.apiError" } as const;
    const parsed = parseSimBriefPayload(payload);
    if (!parsed.departureIcao || !parsed.arrivalIcao) return { error: "simbrief.missingRoute" } as const;
    return { parsed } as const;
  } catch (error) {
    return { error: error instanceof DOMException && error.name === "TimeoutError" ? "simbrief.timeout" : "simbrief.networkError" } as const;
  }
}

async function toPreview(supabase: Awaited<ReturnType<typeof createClient>>, parsed: SimBriefRawPreview): Promise<SimBriefFlightPreview> {
  const codes = [...new Set([parsed.departureIcao, parsed.arrivalIcao].filter(Boolean))];
  const { data: airportRows } = await supabase.from("airports").select("name,iata_code,icao_code,country_code,timezone").in("icao_code", codes);
  const airportByIcao = new Map((airportRows ?? []).map(row => [String(row.icao_code).toUpperCase(), {
    name: String(row.name || row.icao_code), iata: String(row.iata_code || ""), icao: String(row.icao_code || "").toUpperCase(), countryCode: String(row.country_code || ""), timezone: String(row.timezone || ""),
  }]));
  const departure = airportByIcao.get(parsed.departureIcao) || null;
  const arrival = airportByIcao.get(parsed.arrivalIcao) || null;
  const aircraftKey = aircraftAliasKey(parsed.aircraftCode);
  const { data: aircraftRows } = aircraftKey ? await supabase.from("achievement_aircraft_type_aliases").select("alias_key,canonical_type_key,display_name,manufacturer").eq("is_active", true).in("alias_key", [aircraftKey]).limit(1) : { data: [] };
  const aircraft = aircraftRows?.[0] as { canonical_type_key?: string; display_name?: string | null; manufacturer?: string | null } | undefined;
  const aircraftType = aircraft?.canonical_type_key || parsed.aircraftCode;
  const warnings: string[] = [];
  if (!departure) warnings.push("simbrief.departureNotFound");
  if (!arrival) warnings.push("simbrief.arrivalNotFound");
  if (!parsed.aircraftCode) warnings.push("simbrief.aircraftMissing");
  else if (!aircraft) warnings.push("simbrief.aircraftNotFound");
  if (!parsed.departureTimestamp || !parsed.arrivalTimestamp) warnings.push("simbrief.timeMissing");
  if (departure && !departure.timezone) warnings.push("simbrief.timezoneMissing");
  const departureLocal = localFieldsFromTimestamp(parsed.departureTimestamp, departure?.timezone || null);
  const arrivalLocal = localFieldsFromTimestamp(parsed.arrivalTimestamp, arrival?.timezone || null);
  return {
    requestId: parsed.requestId,
    airline: parsed.airline,
    flightNumber: parsed.flightNumber,
    aircraftType,
    aircraftDisplayName: aircraft?.display_name ? formatAircraftDisplayName(aircraft.display_name, aircraft.manufacturer) : parsed.aircraftCode,
    registration: parsed.registration,
    departure, arrival,
    departureDate: departureLocal.date, departureTime: departureLocal.time,
    arrivalDate: arrivalLocal.date, arrivalTime: arrivalLocal.time,
    warnings,
  };
}

export async function getSimBriefIntegration() {
  const context = await currentUser();
  if (!context) return null;
  return readConfig(context.supabase, context.user.id);
}

export async function saveSimBriefIntegration(input: { alias: string; pilotId: string }) {
  const context = await currentUser();
  if (!context) return errorResult("common.loginRequired");
  const alias = input.alias.trim();
  const pilotId = input.pilotId.trim();
  if (!alias && !pilotId) return errorResult("simbrief.identifierRequired");
  if (alias && !simbriefIdentifier("alias", alias)) return errorResult("simbrief.invalidAlias");
  if (pilotId && !simbriefIdentifier("pilot", pilotId)) return errorResult("simbrief.invalidPilotId");
  const { error } = await context.supabase.from("user_integrations").upsert({ user_id: context.user.id, provider: "simbrief", navigraph_alias: alias || null, pilot_id: pilotId || null, updated_at: new Date().toISOString() }, { onConflict: "user_id,provider" });
  return error ? errorResult("simbrief.saveError") : { success: "simbrief.saved" };
}

export async function removeSimBriefIntegration() {
  const context = await currentUser();
  if (!context) return errorResult("common.loginRequired");
  const { error } = await context.supabase.from("user_integrations").delete().eq("user_id", context.user.id).eq("provider", "simbrief");
  return error ? errorResult("simbrief.removeError") : { success: "simbrief.removed" };
}

export async function testSimBriefConnection(input: { alias: string; pilotId: string }) {
  const identifier = input.alias.trim() ? { kind: "alias" as const, value: input.alias } : { kind: "pilot" as const, value: input.pilotId };
  const result = await fetchPayload(identifier.kind, identifier.value);
  return result.error ? errorResult(result.error) : { success: "simbrief.connectionOk" };
}

export async function fetchLatestSimBrief() {
  const context = await currentUser();
  if (!context) return errorResult("common.loginRequired");
  const config = await readConfig(context.supabase, context.user.id);
  if (!config) return errorResult("simbrief.configureFirst");
  const identifier = config.navigraph_alias ? { kind: "alias" as const, value: config.navigraph_alias } : { kind: "pilot" as const, value: config.pilot_id || "" };
  const result = await fetchPayload(identifier.kind, identifier.value);
  if (result.error) return errorResult(result.error);
  return { preview: await toPreview(context.supabase, result.parsed) };
}

export async function importSimBriefFlight(input: {
  preview: SimBriefFlightPreview;
  departure: { name: string; iata: string; icao: string; countryCode: string; timezone: string; date: string; time: string };
  arrival: { name: string; iata: string; icao: string; countryCode: string; timezone: string; date: string; time: string };
  airline: string; flightNumber: string; aircraftType: string; registration: string; forceSimilar?: boolean;
}) {
  const context = await currentUser();
  if (!context) return errorResult("common.loginRequired");
  const normalized = normalizeFlightInput({
    source: "simbrief", simbriefRequestId: input.preview.requestId || "", airline: input.airline, flightNumber: input.flightNumber, aircraftType: input.aircraftType, registration: input.registration, status: "planned", isUserModified: false,
    departureAirportName: input.departure.name, departureAirportIata: input.departure.iata, departureAirportIcao: input.departure.icao, departureCountryCode: input.departure.countryCode, departureTimezone: input.departure.timezone || "UTC", departureDate: input.departure.date, departureTime: input.departure.time,
    arrivalAirportName: input.arrival.name, arrivalAirportIata: input.arrival.iata, arrivalAirportIcao: input.arrival.icao, arrivalCountryCode: input.arrival.countryCode, arrivalTimezone: input.arrival.timezone || "UTC", arrivalDate: input.arrival.date, arrivalTime: input.arrival.time,
  });
  if (normalized.error || !normalized.data) return errorResult(normalized.error || "simbrief.invalidFlight");
  const requestId = input.preview.requestId || null;
  if (requestId) {
    const { data: existing } = await context.supabase.from("flights").select("id").eq("user_id", context.user.id).eq("source", "simbrief").eq("simbrief_request_id", requestId).maybeSingle();
    if (existing) return { duplicateId: existing.id, error: "simbrief.duplicate" };
  }
  const departureUtc = String(normalized.data.departure_scheduled_at_utc || "");
  const start = new Date(departureUtc).getTime();
  const end = start + 2 * 60 * 60 * 1000;
  const { data: similar } = await context.supabase.from("flights").select("id").eq("user_id", context.user.id).eq("flight_number", normalized.data.flight_number).eq("departure_airport_icao", normalized.data.departure_airport_icao).eq("arrival_airport_icao", normalized.data.arrival_airport_icao).gte("departure_scheduled_at_utc", new Date(start - 2 * 60 * 60 * 1000).toISOString()).lte("departure_scheduled_at_utc", new Date(end).toISOString()).limit(1);
  if (similar?.[0] && !input.forceSimilar) return { similarId: similar[0].id, error: "simbrief.similar" };
  const { data, error } = await context.supabase.from("flights").insert({ ...normalized.data, user_id: context.user.id }).select("id").single();
  if (error) return { error: error.code === "23505" ? "simbrief.duplicate" : "simbrief.importError" };
  await context.supabase.rpc("refresh_my_achievements");
  revalidatePath("/dashboard"); revalidatePath("/flights"); revalidatePath("/achievements");
  return { flightId: data.id, success: "simbrief.imported" };
}
