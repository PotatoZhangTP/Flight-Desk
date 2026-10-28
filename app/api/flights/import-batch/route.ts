import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeFlightInput } from "@/lib/flight-input";

export const dynamic = "force-dynamic";

type ImportRecord = { row_number: number; data: Record<string, unknown> };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  let body: { batchId?: unknown; records?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid import request." }, { status: 400 }); }
  const batchId = typeof body.batchId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.batchId) ? body.batchId : "";
  const records = Array.isArray(body.records) ? body.records as ImportRecord[] : [];
  if (!batchId || !records.length || records.length > 2000) return NextResponse.json({ error: "Invalid import batch." }, { status: 400 });
  const rowNumbers = new Set<number>();
  const valid: { row_number: number; data: Record<string, unknown> }[] = [];
  const results: { rowNumber: number; result: string; error?: string }[] = [];
  for (const record of records) {
    if (!Number.isInteger(record?.row_number) || rowNumbers.has(record.row_number)) {
      results.push({ rowNumber: Number(record?.row_number) || 0, result: "failed", error: "Invalid source row number." });
      continue;
    }
    rowNumbers.add(record.row_number);
    const input = record.data || {};
    const normalized = normalizeFlightInput({
      departureAirportName: input.departure_airport_name, departureAirportIata: input.departure_airport_iata, departureAirportIcao: input.departure_airport_icao, departureAirportIdent: input.departure_airport, departureCountryCode: input.departure_country_code, departureDate: input.departure_local_date, departureTime: input.departure_local_time, departureTimezone: input.departure_timezone,
      arrivalAirportName: input.arrival_airport_name, arrivalAirportIata: input.arrival_airport_iata, arrivalAirportIcao: input.arrival_airport_icao, arrivalAirportIdent: input.arrival_airport, arrivalCountryCode: input.arrival_country_code, arrivalDate: input.arrival_local_date, arrivalTime: input.arrival_local_time, arrivalTimezone: input.arrival_timezone,
      flightNumber: input.flight_number, airline: input.airline, aircraftType: input.aircraft_type, registration: input.registration, notes: input.notes, status: input.status, source: "manual", isUserModified: false,
    });
    if (normalized.error || !normalized.data) { results.push({ rowNumber: record.row_number, result: "failed", error: normalized.error || "Flight validation failed." }); continue; }
    valid.push({ row_number: record.row_number, data: { ...normalized.data, import_batch_id: batchId, import_row_number: record.row_number } });
  }
  if (valid.length) {
    const { data, error } = await supabase.rpc("import_flights_batch", { p_batch_id: batchId, p_rows: valid });
    if (error) {
      console.error("[excel-import] batch RPC failed", { code: error.code, message: error.message });
      return NextResponse.json({ error: "The import could not be confirmed. You can safely retry this batch.", results }, { status: 502 });
    }
    for (const row of data || []) results.push({ rowNumber: row.row_number, result: row.result, error: row.error_message || undefined });
  }
  return NextResponse.json({ batchId, results: results.sort((a, b) => a.rowNumber - b.rowNumber) });
}
