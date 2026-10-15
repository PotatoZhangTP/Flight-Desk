import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RoadmapEmptyState } from "@/components/roadmap-cards";
import { RoadmapExplorer } from "@/components/roadmap-explorer";
import { publishedRoadmap } from "@/lib/roadmap/server";
import { roadmapCounts, roadmapToday, statuses, statusLabels, statusStyles } from "@/lib/roadmap/model";

export const dynamic = "force-dynamic";
export const metadata = { title: "Product Roadmap — Flight Desk" };

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<{ item?: string | string[] }> }) {
  const params = await searchParams;
  const requestedItem = typeof params.item === "string" ? params.item : undefined;
  const { items, failed } = await publishedRoadmap();
  const counts = roadmapCounts(items);
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-[1500px] px-6 py-14 lg:px-12">
    <Link href="/" className="mb-6 inline-block rounded text-sm font-semibold text-[#486581] transition hover:text-[#168c82] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#168c82]">← Back to Main Page</Link>
    <p className="eyebrow">The Flight Desk flight plan</p><h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">Building the Next Journey</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-[#627d98]">What’s ready, what’s taking shape, and what’s next.</p>
    {failed ? <p role="alert" className="mt-10 rounded-2xl border border-[#f3c5bd] bg-white p-6 text-[#b94a3d]">We couldn’t load the roadmap. Please refresh or try again later.</p> : !items.length ? <>{requestedItem && <p role="status" className="mt-6 text-sm text-[#627d98]">This roadmap item is no longer available.</p>}<RoadmapEmptyState /></> : <>
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">{statuses.map(status => <div key={status} className={`rounded-2xl border border-black/5 p-5 ${statusStyles[status]}`}><p className="text-sm font-medium">{statusLabels[status]}</p><p className="mt-2 text-3xl font-bold">{counts[status]}</p></div>)}</div>
      <RoadmapExplorer items={items} today={roadmapToday()} requestedItem={requestedItem} />
    </>}
  </main><SiteFooter /></div>;
}
