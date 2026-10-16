"use server";
import { createClient } from "@/lib/supabase/server";
import { dateFormats, distanceUnits, timeFormats, type DateFormat, type DistanceUnit, type TimeFormat } from "@/lib/preferences";
export async function savePreferences(input: { dateFormat: DateFormat; distanceUnit: DistanceUnit; timeFormat: TimeFormat }) {
  if (!dateFormats.includes(input.dateFormat) || !distanceUnits.includes(input.distanceUnit) || !timeFormats.includes(input.timeFormat)) return { error: true };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return { error: true };
  const { error } = await supabase.from("profiles").update({ date_format: input.dateFormat, distance_unit: input.distanceUnit, time_format: input.timeFormat }).eq("id", user.id);
  return { error: Boolean(error) };
}
