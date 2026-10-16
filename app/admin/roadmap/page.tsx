import { attachContentTranslations } from "@/lib/content-translations/read.server";
import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { RoadmapManager } from "@/components/roadmap-manager";
import { AdminNavigation } from "@/components/admin-navigation";
import { roadmapAccess } from "@/lib/roadmap/server";
import { roadmapToday } from "@/lib/roadmap/model";
import { readRoadmapItems, type DatabaseRoadmapItem } from "@/lib/roadmap/read-model.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage Roadmap — Flight Desk", robots: { index: false, follow: false } };

export default async function AdminRoadmapPage() {
  const { supabase, user, isAdmin, error: accessError } = await roadmapAccess();
  if (!user) redirect("/auth?next=/admin/roadmap");
  if (!isAdmin) return <><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-20"><p className="eyebrow"><T id="admin.back" /></p><h1 className="mt-4 text-4xl font-bold"><T id="admin.denied" /></h1><p role="alert" className="mt-5 text-muted"><T source={accessError ? "We couldn’t verify administrator access. Please try again later." : "Your account does not have permission to manage the roadmap."} /></p><Link href="/dashboard" className="mt-8 inline-block font-bold text-brand"><T id="common.backDashboardArrow" /></Link></main></>;
  const { data, error } = await supabase.from("roadmap_items").select("*").order("sort_order").order("created_at").order("id");
  return <><SiteHeader /><main className="mx-auto max-w-7xl px-6 py-12 lg:px-12"><AdminNavigation current="roadmap" /><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow"><T id="admin.workspace" /></p><h1 className="mt-3 text-4xl font-bold tracking-tight"><T id="admin.manageRoadmapLower" /></h1><p className="mt-4 max-w-2xl leading-7 text-muted"><T id="admin.roadmapIntro" /></p></div><Link href="/roadmap" className="font-bold text-brand hover:underline"><T id="admin.viewRoadmap" /></Link></div>{error ? <p role="alert" className="mt-8 rounded-2xl bg-danger-bg p-6 text-danger-fg"><T id="admin.itemsError" /></p> : <RoadmapManager items={await attachContentTranslations(supabase, readRoadmapItems((data ?? []) as DatabaseRoadmapItem[]), true)} today={roadmapToday()} />}</main></>;
}
