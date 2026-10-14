"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createFlight(input: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const required = ["departureAirportIata", "arrivalAirportIata", "departureDate", "departureTime", "departureTimezone", "arrivalDate", "arrivalTime", "arrivalTimezone"];
  if (required.some((key) => !String(input[key] ?? "").trim())) return { error: "Complete both airports, dates, times, and timezones." };
  const { error } = await supabase.from("flights").insert({
    user_id: user.id, flight_date: input.departureDate, departure_airport: input.departureAirportIata, arrival_airport: input.arrivalAirportIata,
    flight_number: input.flightNumber || null, airline: input.airline || null, aircraft_type: input.aircraftType || null, registration: input.registration || null, notes: input.notes || null,
    departure_airport_iata: input.departureAirportIata, departure_airport_icao: input.departureAirportIcao, departure_airport_name: input.departureAirportName, departure_country_code: input.departureCountryCode, departure_timezone: input.departureTimezone, departure_local_date: input.departureDate, departure_local_time: input.departureTime, departure_terminal: input.departureTerminal || null, departure_gate: input.departureGate || null, departure_scheduled_at_utc: input.departureUtc,
    arrival_airport_iata: input.arrivalAirportIata, arrival_airport_icao: input.arrivalAirportIcao, arrival_airport_name: input.arrivalAirportName, arrival_country_code: input.arrivalCountryCode, arrival_timezone: input.arrivalTimezone, arrival_local_date: input.arrivalDate, arrival_local_time: input.arrivalTime, arrival_terminal: input.arrivalTerminal || null, arrival_gate: input.arrivalGate || null, arrival_scheduled_at_utc: input.arrivalUtc,
    scheduled_duration_minutes: input.scheduledDurationMinutes, actual_duration_minutes: input.actualDurationMinutes || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard"); revalidatePath("/profile");
  redirect("/dashboard?created=1");
}

export async function updateFlight(id: string, input: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const required = ["departureAirportIata", "arrivalAirportIata", "departureDate", "departureTime", "departureTimezone", "arrivalDate", "arrivalTime", "arrivalTimezone"];
  if (required.some((key) => !String(input[key] ?? "").trim())) return { error: "Complete both airports, dates, times, and timezones." };
  const { error } = await supabase.from("flights").update({
    flight_date: input.departureDate, departure_airport: input.departureAirportIata, arrival_airport: input.arrivalAirportIata,
    flight_number: input.flightNumber || null, airline: input.airline || null, aircraft_type: input.aircraftType || null, registration: input.registration || null, notes: input.notes || null,
    departure_airport_iata: input.departureAirportIata, departure_airport_icao: input.departureAirportIcao, departure_airport_name: input.departureAirportName, departure_country_code: input.departureCountryCode, departure_timezone: input.departureTimezone, departure_local_date: input.departureDate, departure_local_time: input.departureTime, departure_terminal: input.departureTerminal || null, departure_gate: input.departureGate || null, departure_scheduled_at_utc: input.departureUtc,
    arrival_airport_iata: input.arrivalAirportIata, arrival_airport_icao: input.arrivalAirportIcao, arrival_airport_name: input.arrivalAirportName, arrival_country_code: input.arrivalCountryCode, arrival_timezone: input.arrivalTimezone, arrival_local_date: input.arrivalDate, arrival_local_time: input.arrivalTime, arrival_terminal: input.arrivalTerminal || null, arrival_gate: input.arrivalGate || null, arrival_scheduled_at_utc: input.arrivalUtc,
    scheduled_duration_minutes: input.scheduledDurationMinutes, actual_duration_minutes: input.actualDurationMinutes || null,
  }).eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard"); revalidatePath("/profile"); revalidatePath(`/flights/${id}`);
  redirect(`/flights/${id}`);
}
