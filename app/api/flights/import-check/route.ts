import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data, error } = await supabase.from("flights")
    .select("id,flight_date,flight_number,airline,departure_airport_iata,arrival_airport_iata,departure_airport_icao,arrival_airport_icao")
    .eq("user_id", user.id)
    .order("flight_date", { ascending: false })
    .limit(10000);
  if (error) return NextResponse.json({ error: "Unable to check existing flights." }, { status: 500 });
  return NextResponse.json({ flights: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}
