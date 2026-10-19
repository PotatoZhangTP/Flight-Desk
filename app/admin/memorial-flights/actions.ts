"use server";

import { revalidatePath } from "next/cache";
import { siteAdminAccess } from "@/lib/admin/server";
import { memorialTypes } from "@/lib/memorial-presentation";

export type MemorialResult = { error?: string; success?: string };
const idPattern = /^[0-9a-f-]{36}$/i;
const code = (value: FormDataEntryValue | null, length: number) => String(value ?? "").trim().toUpperCase();

export async function saveMemorial(form: FormData): Promise<MemorialResult> {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin) return { error: "Access denied." };
  const id = String(form.get("id") ?? "").trim();
  const parseDate = (name: string) => {
    const value = String(form.get(name) ?? "").trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? { value, year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
  };
  const eventDate = parseDate("event_date");
  const publishStart = parseDate("publish_start_date");
  const publishEnd = parseDate("publish_end_date");
  const memorialType = String(form.get("memorial_type") ?? "accident_memorial");
  const messageEn = String(form.get("memorial_message_en") ?? "").trim();
  const messageZh = String(form.get("memorial_message_zh") ?? "").trim();
  if (!memorialTypes.some(type => type === memorialType) || messageEn.length > 600 || messageZh.length > 600) return { error: "Check the memorial type and message length (600 characters maximum)." };
  const input = {
    memorial_type: memorialType, memorial_message_en: messageEn || null, memorial_message_zh: messageZh || null,
    event_key: String(form.get("event_key") ?? "").trim().toLowerCase(),
    title_en: String(form.get("title_en") ?? "").trim(), title_zh: String(form.get("title_zh") ?? "").trim(),
    description_en: String(form.get("description_en") ?? "").trim(), description_zh: String(form.get("description_zh") ?? "").trim(),
    event_date: eventDate?.value, publish_start_date: publishStart?.value, publish_end_date: publishEnd?.value,
    event_year: eventDate?.year, event_month: eventDate?.month, event_day: eventDate?.day,
    publish_year: publishStart?.year, publish_month: publishStart?.month, publish_day: publishStart?.day,
    recurring: form.get("recurring") === "on", departure_iata: code(form.get("departure_iata"), 3), departure_icao: code(form.get("departure_icao"), 4), arrival_iata: code(form.get("arrival_iata"), 3), arrival_icao: code(form.get("arrival_icao"), 4), suggested_aircraft: String(form.get("suggested_aircraft") ?? "").trim() || null, enabled: form.get("enabled") === "on",
  };
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(input.event_key)) return { error: "Event Key can only use lowercase letters, numbers, and hyphens. Spaces and special characters are not allowed." };
  if (!input.title_en || !input.title_zh || !input.description_en || !input.description_zh || !/^[A-Z]{3}$/.test(input.departure_iata) || !/^[A-Z]{4}$/.test(input.departure_icao) || !/^[A-Z]{3}$/.test(input.arrival_iata) || !/^[A-Z]{4}$/.test(input.arrival_icao) || !eventDate || !publishStart || !publishEnd || publishEnd.value < publishStart.value) return { error: "Check the airport codes, dates, and required text." };
  const query = id ? (idPattern.test(id) ? supabase.from("memorial_events").update(input).eq("id", id) : null) : supabase.from("memorial_events").insert(input);
  if (!query) return { error: "Invalid memorial event." };
  const { error } = await query;
  if (error) return { error: error.code === "23505" ? "That Event Key already exists." : error.code === "PGRST204" || error.code === "42703" ? "Apply the Memorial Presentation migration in Supabase before saving these fields." : "The memorial event could not be saved." };
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
