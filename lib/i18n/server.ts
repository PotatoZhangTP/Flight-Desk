import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { byKey, localeCookie, normalizeLocale, type Locale } from "./catalog";
import { validTranslation } from "./validation";
import { defaultPreferences, normalizePreferences, type UserPreferences } from "@/lib/preferences";

export async function publishedOverrides() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("translation_overrides")
      .select("translation_key,translation_text,source_hash,version")
      .eq("locale", "zh-CN").eq("is_published", true)
      .abortSignal(AbortSignal.timeout(3000));
    if (error) return { ready: false, overrides: {} as Record<string, string> };
    const overrides: Record<string, string> = {};
    for (const row of data ?? []) {
      if (validTranslation(row.translation_key, row.translation_text)) overrides[row.translation_key] = row.translation_text;
    }
    return { ready: true, overrides };
  } catch { return { ready: false, overrides: {} as Record<string, string> }; }
}

export const languageSnapshot = cache(async () => {
  const cookie = (await cookies()).get(localeCookie)?.value;
  let locale: Locale = normalizeLocale(cookie);
  let accountReady = false;
  let preferences: UserPreferences = defaultPreferences;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.from("profiles").select("preferred_locale,date_format,distance_unit,time_format").eq("id", user.id).maybeSingle();
      accountReady = !error;
      if (cookie !== "en" && cookie !== "zh-CN") locale = normalizeLocale(data?.preferred_locale);
      preferences = normalizePreferences({ dateFormat: data?.date_format, distanceUnit: data?.distance_unit, timeFormat: data?.time_format });
    }
  } catch { /* Preference failures never affect Auth or ordinary profile reads. */ }
  const { overrides } = await publishedOverrides();
  return { locale, overrides, accountReady, preferences };
});
