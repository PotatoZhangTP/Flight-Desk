"use server";

import { revalidatePath } from "next/cache";
import { siteAdminAccess } from "@/lib/admin/server";

export type MemorialResult = { error?: string; success?: string };
const idPattern = /^[0-9a-f-]{36}$/i;
const code = (value: FormDataEntryValue | null, length: number) => String(value ?? "").trim().toUpperCase();

export async function saveMemorial(form: FormData): Promise<MemorialResult> {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin) return { error: "Access denied." };
  const id = String(form.get("id") ?? "").trim();
  const input = {
    event_key: String(form.get("event_key") ?? "").trim().toLowerCase(),
    title_en: String(form.get("title_en") ?? "").trim(), title_zh: String(form.get("title_zh") ?? "").trim(),
    description_en: String(form.get("description_en") ?? "").trim(), description_zh: String(form.get("description_zh") ?? "").trim(),
    event_year: Number(form.get("event_year")), event_month: Number(form.get("event_month")), event_day: Number(form.get("event_day")),
    recurring: form.get("recurring") === "on", departure_iata: code(form.get("departure_iata"), 3), departure_icao: code(form.get("departure_icao"), 4), arrival_iata: code(form.get("arrival_iata"), 3), arrival_icao: code(form.get("arrival_icao"), 4), suggested_aircraft: String(form.get("suggested_aircraft") ?? "").trim() || null, enabled: form.get("enabled") === "on",
  };
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(input.event_key) || !input.title_en || !input.title_zh || !input.description_en || !input.description_zh || !/^[A-Z]{3}$/.test(input.departure_iata) || !/^[A-Z]{4}$/.test(input.departure_icao) || !/^[A-Z]{3}$/.test(input.arrival_iata) || !/^[A-Z]{4}$/.test(input.arrival_icao) || !Number.isInteger(input.event_year) || input.event_month < 1 || input.event_month > 12 || input.event_day < 1 || input.event_day > 31) return { error: "Check the event key, airport codes, dates, and required text." };
  const query = id ? (idPattern.test(id) ? supabase.from("memorial_events").update(input).eq("id", id) : null) : supabase.from("memorial_events").insert(input);
  if (!query) return { error: "Invalid memorial event." };
  const { error } = await query;
  if (error) return { error: error.code === "23505" ? "That Event Key already exists." : "The memorial event could not be saved." };
  revalidatePath("/admin/memorial-flights"); revalidatePath("/challenges"); revalidatePath("/dashboard");
  return { success: "Memorial event saved." };
}

export async function deleteMemorial(id: string): Promise<MemorialResult> {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin || !idPattern.test(id)) return { error: "Access denied." };
  const { error } = await supabase.from("memorial_events").delete().eq("id", id);
  if (error) return { error: "The memorial event could not be deleted." };
  revalidatePath("/admin/memorial-flights"); revalidatePath("/challenges"); revalidatePath("/dashboard");
  return { success: "Memorial event deleted." };
}
