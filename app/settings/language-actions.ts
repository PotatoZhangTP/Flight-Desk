"use server";
import { createClient } from "@/lib/supabase/server";
export async function saveLanguage(locale: string) {
  if (locale !== "en" && locale !== "zh-CN") return { error: true };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: true };
  const { data, error } = await supabase.from("profiles").update({ preferred_locale: locale }).eq("id", user.id).select("id").maybeSingle();
  return { error: Boolean(error || !data) };
}
