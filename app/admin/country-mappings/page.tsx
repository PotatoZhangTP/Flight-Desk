import { redirect } from "next/navigation";
import { T } from "@/components/i18n";
import { SiteHeader } from "@/components/site-header";
import { AdminDenied } from "@/components/admin-denied";
import { AdminNavigation } from "@/components/admin-navigation";
import { CountryMappingManager } from "@/components/country-mapping-manager";
import { siteAdminAccess } from "@/lib/admin/server";

export const dynamic = "force-dynamic";
export default async function CountryMappingsPage() {
  const { supabase, user, isAdmin, error } = await siteAdminAccess();
  if (!user) redirect("/auth?next=/admin/country-mappings");
  if (!isAdmin) return <AdminDenied failed={Boolean(error)} />;
  const { data } = await supabase.from("country_region_mappings").select("id,original_code,target_code,is_active").order("original_code");
  return <><SiteHeader /><main className="mx-auto max-w-6xl px-6 py-12 lg:px-12"><AdminNavigation current="countryMappings" /><p className="eyebrow"><T source="Administrator workspace" /></p><h1 className="mt-3 text-4xl font-bold tracking-tight"><T source="Country & Region Mapping" /></h1><p className="mt-4 max-w-2xl leading-7 text-muted"><T source="Control how original airport regions are displayed and counted across Flight Desk." /></p><CountryMappingManager initialMappings={data ?? []} /></main></>;
}
