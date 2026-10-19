"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function readMemorialFlightState(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data, error } = await supabase.from("memorial_participation").select("flight_id").eq("event_id", eventId).eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to read participation");
  if (!data) return { flightId: null, status: null };
  // Historical participation-only completions remain completed until linked.
  if (!data.flight_id) return { flightId: null, status: "completed" };
  const { data: flight, error: flightError } = await supabase.from("flights").select("id,status").eq("id", data.flight_id).eq("user_id", user.id).maybeSingle();
  if (flightError) throw new Error("Unable to read flight");
  return { flightId: flight?.id ?? null, status: flight?.status ?? null };
}

export async function saveMemorialFlight(eventId: string, action: "plan" | "complete" | "uncomplete") {
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !["plan", "complete", "uncomplete"].includes(action)) return { error: "memorial.flightSaveError" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "common.loginRequired" };
  const { data, error } = await supabase.rpc("save_memorial_flight", { p_event_id: eventId, p_action: action });
  if (error || !data?.length) return { error: error?.code === "PGRST202" ? "memorial.migrationRequired" : "memorial.flightSaveError" };
  for (const path of ["/flights", "/dashboard", "/challenges"]) revalidatePath(path);
  revalidatePath("/memorial-flights/[eventKey]", "page");
  return { flightId: data[0].flight_id as string, status: data[0].status as string };
}
