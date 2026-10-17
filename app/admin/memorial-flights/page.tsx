import { redirect } from "next/navigation";
import { T } from "@/components/i18n";
import { SiteHeader } from "@/components/site-header";
import { AdminDenied } from "@/components/admin-denied";
import { AdminNavigation } from "@/components/admin-navigation";
import { MemorialManager } from "@/components/memorial-manager";
import { siteAdminAccess } from "@/lib/admin/server";

export const dynamic = "force-dynamic";
export default async function MemorialFlightsAdminPage() {
  const { supabase, user, isAdmin, error } = await siteAdminAccess();
  if (!user) redirect("/auth?next=/admin/memorial-flights");
  if (!isAdmin) return <AdminDenied failed={Boolean(error)} />;
  const { data } = await supabase.from("memorial_events").select("*").order("event_month").order("event_day").order("event_key");
  return <><SiteHeader /><main className="mx-auto max-w-6xl px-6 py-12 lg:px-12"><AdminNavigation current="memorial" /><p className="eyebrow"><T source="Administrator workspace" /></p><h1 className="mt-3 text-4xl font-bold tracking-tight"><T source="Memorial Flights" /></h1><p className="mt-4 max-w-2xl leading-7 text-muted"><T source="Create and maintain aviation memorial routes manually. Only enabled events shown during their UTC memorial week." /></p><MemorialManager events={data ?? []} /></main></>;
}
