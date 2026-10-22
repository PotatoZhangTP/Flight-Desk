import { redirect } from "next/navigation";
import { AdminDenied } from "@/components/admin-denied";
import { AdminNavigation } from "@/components/admin-navigation";
import { SiteHeader } from "@/components/site-header";
import { siteAdminAccess } from "@/lib/admin/server";
import { AchievementGuidanceManager } from "@/components/achievement-guidance-manager";

export default async function AchievementGuidancePage() {
  const { supabase, user, isAdmin, error } = await siteAdminAccess();
  if (!user) redirect("/auth?next=/admin/achievement-guidance");
  if (!isAdmin) return <AdminDenied failed={Boolean(error)} />;
  const [{ data: definitions }, { data: levels }, { data: guidance }] = await Promise.all([
    supabase.from("achievement_definitions").select("id,slug,name_en,name_zh,badge_type").eq("is_active", true).eq("is_hidden", false).order("display_order"),
    supabase.from("achievement_levels").select("id,achievement_definition_id,level_key,level_order,name_en,name_zh").order("level_order"),
    supabase.from("achievement_level_guidance").select("achievement_level_id,guidance_en,guidance_zh,updated_at"),
  ]);
  return <><SiteHeader /><main className="mx-auto max-w-7xl px-6 py-12 lg:px-12"><AdminNavigation current="guidance" /><p className="eyebrow">Administrator workspace</p><h1 className="mt-3 text-4xl font-bold tracking-tight">Badge Level Guidance</h1><p className="mt-4 max-w-2xl leading-7 text-muted">Manage the unlock guidance shown beside each achievement level.</p><AchievementGuidanceManager definitions={definitions ?? []} levels={levels ?? []} guidance={guidance ?? []} /></main></>;
}
