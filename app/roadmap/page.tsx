import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
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
    <Link href="/" className="mb-6 inline-block rounded text-sm font-semibold text-muted transition hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"><T id="common.backMain" /></Link>
    <p className="eyebrow"><T id="roadmap.eyebrow" /></p><h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl"><T id="roadmap.title" /></h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted"><T id="roadmap.description" /></p>
    {failed ? <p role="alert" className="mt-10 rounded-2xl border border-danger-line bg-surface p-6 text-danger-fg"><T id="roadmap.error" /></p> : !items.length ? <>{requestedItem && <p role="status" className="mt-6 text-sm text-muted"><T id="roadmap.itemUnavailable" /></p>}<RoadmapEmptyState /></> : <>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">{statuses.map(status => <div key={status} className={`rounded-2xl border border-line p-5 ${statusStyles[status]}`}><p className="text-sm font-medium"><T source={statusLabels[status]} /></p><p className="mt-2 text-3xl font-bold">{counts[status]}</p></div>)}</div>
      <RoadmapExplorer items={items} today={roadmapToday()} requestedItem={requestedItem} />
    </>}
  </main><SiteFooter /></div>;
}
