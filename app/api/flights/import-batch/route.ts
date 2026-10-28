import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeFlightInput } from "@/lib/flight-input";

export const dynamic = "force-dynamic";

type ImportRecord = { row_number: number; data: Record<string, unknown>; preflight_result?: string; error_type?: string; error_message?: string; suggestion?: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  let body: { batchId?: unknown; records?: unknown; fileName?: unknown; totalRecords?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid import request." }, { status: 400 }); }
  const batchId = typeof body.batchId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.batchId) ? body.batchId : "";
  const records = Array.isArray(body.records) ? body.records as ImportRecord[] : [];
  if (!batchId || !records.length || records.length > 2000) return NextResponse.json({ error: "Invalid import batch." }, { status: 400 });
  const rowNumbers = new Set<number>();
  const rpcRows: ImportRecord[] = [];
  const results: { rowNumber: number; result: string; error?: string }[] = [];
  for (const record of records) {
    if (!Number.isInteger(record?.row_number) || rowNumbers.has(record.row_number)) {
      const invalid = { rowNumber: Number(record?.row_number) || 0, result: "failed", error: "Invalid source row number." };
      results.push(invalid);
      rpcRows.push({ row_number: invalid.rowNumber, data: record?.data || {}, preflight_result: "failed", error_type: "validation", error_message: invalid.error, suggestion: "Provide a unique Excel row number." });
      continue;
    }
    rowNumbers.add(record.row_number);
    const input = record.data || {};
    const normalized = normalizeFlightInput({
      departureAirportName: input.departure_airport_name, departureAirportIata: input.departure_airport_iata, departureAirportIcao: input.departure_airport_icao, departureAirportIdent: input.departure_airport, departureCountryCode: input.departure_country_code, departureDate: input.departure_local_date, departureTime: input.departure_local_time, departureTimezone: input.departure_timezone,
      arrivalAirportName: input.arrival_airport_name, arrivalAirportIata: input.arrival_airport_iata, arrivalAirportIcao: input.arrival_airport_icao, arrivalAirportIdent: input.arrival_airport, arrivalCountryCode: input.arrival_country_code, arrivalDate: input.arrival_local_date, arrivalTime: input.arrival_local_time, arrivalTimezone: input.arrival_timezone,
      flightNumber: input.flight_number, airline: input.airline, aircraftType: input.aircraft_type, registration: input.registration, notes: input.notes, status: input.status, source: "manual", isUserModified: false,
    });
    if (normalized.error || !normalized.data) {
      const error = normalized.error || "Flight validation failed.";
      results.push({ rowNumber: record.row_number, result: "failed", error });
      rpcRows.push({ row_number: record.row_number, data: input, preflight_result: "failed", error_type: "validation", error_message: error, suggestion: "Correct the row in Excel and retry it." });
      continue;
    }
    rpcRows.push({ row_number: record.row_number, data: normalized.data });
  }
  if (rpcRows.length) {
    const { data, error } = await supabase.rpc("import_flights_batch", { p_batch_id: batchId, p_rows: rpcRows, p_file_name: typeof body.fileName === "string" ? body.fileName : "Excel import", p_total_records: Number.isInteger(body.totalRecords) ? Number(body.totalRecords) : records.length });
    if (error) {
      console.error("[excel-import] batch RPC failed", { code: error.code, message: error.message });
      return NextResponse.json({ error: "The import could not be confirmed. You can safely retry this batch.", results }, { status: 502 });
    }
    results.length = 0;
    for (const row of data || []) results.push({ rowNumber: row.row_number, result: row.result, error: row.error_message || undefined });
  }
  return NextResponse.json({ batchId, results: results.sort((a, b) => a.rowNumber - b.rowNumber) });
}
