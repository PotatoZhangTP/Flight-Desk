"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeFlightInput } from "@/lib/flight-input";

export async function createFlight(input: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const normalized = normalizeFlightInput(input);
  if (normalized.error || !normalized.data) return { error: normalized.error || "Check the flight details." };
  const { error } = await supabase.from("flights").insert({ ...normalized.data, user_id: user.id });
  if (error) return { error: "Database request failed. Your flight was not saved. Please try again." };
  revalidatePath("/dashboard"); revalidatePath("/profile");
  redirect("/dashboard?created=1");
}

export async function updateFlight(id: string, input: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { error: "Invalid flight record." };
  const normalized = normalizeFlightInput(input);
  if (normalized.error || !normalized.data) return { error: normalized.error || "Check the flight details." };
  const { data, error } = await supabase.from("flights").update(normalized.data)
    .eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error) return { error: "Database request failed. Your changes were not saved. Please try again." };
  if (!data) return { error: "This flight is unavailable or you do not have permission to edit it." };
  revalidatePath("/dashboard"); revalidatePath("/profile"); revalidatePath("/flights/" + id);
  redirect("/flights/" + id);
}
