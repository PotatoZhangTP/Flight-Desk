"use server";
import { createHash } from "node:crypto";
import { siteAdminAccess } from "@/lib/admin/server";
import { byKey } from "@/lib/i18n/catalog";
import { validTranslation } from "@/lib/i18n/validation";

export async function changeTranslation(input: { key: string; text: string; reset: boolean; version: number | null; updatedAt: string | null }) {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin) return { error: "admin.denied" };
  if (!input || !byKey[input.key] || (!input.reset && !validTranslation(input.key, input.text)) || (input.version !== null && (!Number.isSafeInteger(input.version) || input.version < 1))) return { error: "translations.invalid" };
  const entry = byKey[input.key];
  const row = { locale: "zh-CN", translation_key: entry.key, translation_text: input.text.trim(), is_published: true, source_hash: createHash("sha256").update(entry.en).digest("hex") };
  if (input.version === null) {
    if (input.reset) return { error: "translations.conflict" };
    const { error } = await supabase.from("translation_overrides").insert(row).select("translation_key").single();
    if (error) return { error: error.code === "23505" ? "translations.conflict" : "translations.failed" };
  } else {
    if (!input.updatedAt) return { error: "translations.conflict" };
    const table = supabase.from("translation_overrides");
    const mutation = input.reset ? table.delete() : table.update(row);
    const { data, error } = await mutation.eq("locale", "zh-CN").eq("translation_key", entry.key).eq("version", input.version).eq("updated_at", input.updatedAt).select("translation_key");
    if (error) return { error: "translations.failed" };
    if (data?.length !== 1) return { error: "translations.conflict" };
  }
  return { error: null };
}
