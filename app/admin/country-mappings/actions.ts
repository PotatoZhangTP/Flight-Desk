"use server";

import { revalidatePath } from "next/cache";
import { siteAdminAccess } from "@/lib/admin/server";

const idPattern = /^[0-9a-f-]{36}$/i;
const codePattern = /^[A-Z]{2}$/;
export type CountryMappingResult = { error?: string; success?: string };

async function refreshCountryDependentViews(supabase: Awaited<ReturnType<typeof siteAdminAccess>>["supabase"]) {
  await supabase.rpc("refresh_all_achievements_after_country_mapping");
  for (const path of ["/admin/country-mappings", "/dashboard", "/flights", "/achievements", "/flight-map"]) revalidatePath(path);
}

export async function saveCountryMapping(form: FormData): Promise<CountryMappingResult> {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin) return { error: "admin.mappingAccessDenied" };
  const id = String(form.get("id") ?? "").trim();
  const originalCode = String(form.get("original_code") ?? "").trim().toUpperCase();
  const targetCode = String(form.get("target_code") ?? "").trim().toUpperCase();
  if (!codePattern.test(originalCode) || !codePattern.test(targetCode) || originalCode === targetCode) return { error: "admin.mappingInvalid" };
  if (id && !idPattern.test(id)) return { error: "admin.mappingInvalid" };
  const values = { original_code: originalCode, target_code: targetCode, is_active: form.get("is_active") !== "off", updated_by: user.id };
  const query = id ? supabase.from("country_region_mappings").update(values).eq("id", id) : supabase.from("country_region_mappings").insert(values);
  const { error } = await query;
  if (error) return { error: error.code === "23505" ? "admin.mappingDuplicate" : error.code === "23514" ? "admin.mappingCycle" : "admin.mappingSaveError" };
  await refreshCountryDependentViews(supabase);
  return { success: "admin.mappingSaved" };
}

export async function setCountryMappingStatus(id: string, isActive: boolean): Promise<CountryMappingResult> {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin || !idPattern.test(id)) return { error: "admin.mappingAccessDenied" };
  const { error } = await supabase.from("country_region_mappings").update({ is_active: isActive, updated_by: user.id }).eq("id", id);
  if (error) return { error: "admin.mappingStatusError" };
  await refreshCountryDependentViews(supabase);
  return { success: "admin.mappingStatusUpdated" };
}

export async function deleteCountryMapping(id: string): Promise<CountryMappingResult> {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin || !idPattern.test(id)) return { error: "admin.mappingAccessDenied" };
  const { error } = await supabase.from("country_region_mappings").delete().eq("id", id);
  if (error) return { error: "admin.mappingDeleteError" };
  await refreshCountryDependentViews(supabase);
  return { success: "Country mapping deleted." };
}
