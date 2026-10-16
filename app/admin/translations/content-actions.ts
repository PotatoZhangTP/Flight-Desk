"use server";
import { siteAdminAccess } from "@/lib/admin/server";
import { roadmapTranslationFields, validContentText, validEntityId } from "@/lib/content-translations/model";
import { revalidatePath } from "next/cache";

type Mutation = { entityId: string; field: string; locale: string; text: string; expectedSource: string; generation: string | null; regenerate?: boolean; confirmManual?: boolean };
export async function saveDynamicTranslation(input: Mutation) {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin) return { error: "admin.denied" };
  if (!input || !validEntityId(input.entityId) || !roadmapTranslationFields.some(field => field === input.field) || !/^[a-z]{2}(-[A-Za-z0-9]{2,8})*$/.test(input.locale) || input.locale === "en" || typeof input.expectedSource !== "string" || input.expectedSource.length > 5000 || input.expectedSource.includes("\0") || !validContentText(input.text) || (input.generation !== null && !validEntityId(input.generation)) || (input.regenerate !== undefined && typeof input.regenerate !== "boolean") || (input.confirmManual !== undefined && typeof input.confirmManual !== "boolean")) return { error: "translations.invalid" };
  const args = { p_entity_id: input.entityId, p_field: input.field, p_locale: input.locale, p_expected_source: input.expectedSource, p_expected_generation: input.generation };
  const { error } = input.regenerate ? await supabase.rpc("regenerate_content_translation", { ...args, p_confirm_manual: input.confirmManual === true }) : await supabase.rpc("edit_content_translation", { ...args, p_text: input.text });
  if (error) return { error: error.code === "40001" ? "translations.conflict" : error.code === "22023" ? "translations.invalid" : error.code === "42501" ? "admin.denied" : "dynamic.failedRequest" };
  revalidatePath("/"); revalidatePath("/roadmap"); revalidatePath("/admin/roadmap");
  return { error: null };
}
export async function backfillDynamicTranslations(cursor: string | null) {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin) return { error: "admin.denied" };
  if (cursor !== null && !validEntityId(cursor)) return { error: "translations.invalid" };
  const { data, error } = await supabase.rpc("backfill_content_translations", { p_after_id: cursor, p_limit: 25 });
  if (error || !data) return { error: error?.code === "PGRST202" || error?.code === "PGRST205" ? "dynamic.migration" : "dynamic.failedRequest" };
  revalidatePath("/admin/roadmap");
  return { error: null, processed: Number(data.processed), changed: Number(data.changed), nextCursor: data.next_cursor as string | null };
}
