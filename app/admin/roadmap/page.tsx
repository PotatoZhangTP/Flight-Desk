import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { RoadmapManager } from "@/components/roadmap-manager";
import { roadmapAccess } from "@/lib/roadmap/server";
import type { RoadmapItem } from "@/lib/roadmap/model";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage Roadmap — Flight Desk", robots: { index: false, follow: false } };

export default async function AdminRoadmapPage() {
  const { supabase, user, isAdmin, error: accessError } = await roadmapAccess();
  if (!user) redirect("/auth?next=/admin/roadmap");
  if (!isAdmin) return <><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-20"><p className="eyebrow">Administrator access</p><h1 className="mt-4 text-4xl font-bold">Access denied</h1><p role="alert" className="mt-5 text-[#627d98]">{accessError ? "We couldn’t verify administrator access. Please try again later." : "Your account does not have permission to manage the roadmap."}</p><Link href="/dashboard" className="mt-8 inline-block font-bold text-[#168c82]">Back to dashboard →</Link></main></>;
  const { data, error } = await supabase.from("roadmap_items").select("*").order("sort_order").order("created_at").order("id");
  return <><SiteHeader /><main className="mx-auto max-w-7xl px-6 py-12 lg:px-12"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">Administrator workspace</p><h1 className="mt-3 text-4xl font-bold tracking-tight">Manage roadmap</h1><p className="mt-4 max-w-2xl leading-7 text-[#627d98]">Save privately as a draft, or publish an update for everyone. Lower display-order numbers appear first.</p></div><Link href="/roadmap" className="font-bold text-[#168c82] hover:underline">View public roadmap ↗</Link></div>{error ? <p role="alert" className="mt-8 rounded-2xl bg-[#fff0ed] p-6 text-[#b94a3d]">Roadmap items couldn’t be loaded. Refresh to try again.</p> : <RoadmapManager items={(data ?? []) as RoadmapItem[]} />}</main></>;
}
