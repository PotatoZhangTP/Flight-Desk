"use server";

import { revalidatePath } from "next/cache";
import { siteAdminAccess } from "@/lib/admin/server";

export async function saveAchievementGuidance(formData: FormData) {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin) return { error: "Access denied." };
  const levelId = String(formData.get("level_id") ?? "");
  const guidanceEn = String(formData.get("guidance_en") ?? "").slice(0, 5000);
  const guidanceZh = String(formData.get("guidance_zh") ?? "").slice(0, 5000);
  if (!levelId) return { error: "A level is required." };
  const { error } = await supabase.from("achievement_level_guidance").upsert({ achievement_level_id: levelId, guidance_en: guidanceEn, guidance_zh: guidanceZh, updated_at: new Date().toISOString(), updated_by: user.id });
  if (error) return { error: "The guidance could not be saved." };
  revalidatePath("/admin/achievement-guidance"); revalidatePath("/achievements");
  return { success: "Guidance saved." };
}
