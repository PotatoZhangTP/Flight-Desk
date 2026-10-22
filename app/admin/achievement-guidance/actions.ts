"use server";

import { revalidatePath } from "next/cache";
import { siteAdminAccess } from "@/lib/admin/server";

export async function saveAchievementGuidance(formData: FormData) {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin) return { error: "Access denied." };
  const definitionId = String(formData.get("definition_id") ?? "");
  const guidanceEn = String(formData.get("guidance_en") ?? "").slice(0, 5000);
  const guidanceZh = String(formData.get("guidance_zh") ?? "").slice(0, 5000);
  if (!definitionId) return { error: "A badge is required." };
  const { data: levels, error: levelError } = await supabase.from("achievement_levels").select("id").eq("achievement_definition_id", definitionId);
  if (levelError || !levels?.length) return { error: "The badge levels could not be found." };
  const rows = levels.map(level => ({ achievement_level_id: level.id, guidance_en: guidanceEn, guidance_zh: guidanceZh, updated_at: new Date().toISOString(), updated_by: user.id }));
  const { error } = await supabase.from("achievement_level_guidance").upsert(rows);
  if (error) return { error: "The guidance could not be saved." };
  revalidatePath("/admin/achievement-guidance"); revalidatePath("/achievements");
  return { success: "Guidance saved." };
}
