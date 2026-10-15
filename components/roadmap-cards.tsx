import Link from "next/link";
import { formatRoadmapDate, roadmapCounts, statuses, statusLabels, statusStyles, type RoadmapItem } from "@/lib/roadmap/model";

export function RoadmapCard({ item }: { item: RoadmapItem }) {
  return <article className="flex min-w-0 flex-col rounded-2xl border border-[#d9e2ec] bg-white p-6 shadow-sm transition hover:border-[#9fd8d2] hover:shadow-md">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[item.status]}`}>{statusLabels[item.status]}</span><span className="text-xs font-semibold text-[#627d98]">{item.category}</span></div>
    <h3 className="mt-5 break-words text-lg font-bold tracking-tight text-[#102a43]">{item.title}</h3>
    <p className="mt-3 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#627d98]">{item.description}</p>
    <div className="mt-5 space-y-1 border-t border-[#edf2f7] pt-4 text-xs text-[#627d98]">
      {item.priority && <p className="capitalize">Priority · {item.priority}</p>}
      {item.target_date && <p>Target · {formatRoadmapDate(item.target_date)}</p>}
      {item.completed_date && <p>Completed · {formatRoadmapDate(item.completed_date)}</p>}
      <p>Updated <time dateTime={item.updated_at}>{formatRoadmapDate(item.updated_at)}</time></p>
    </div>
  </article>;
}

export function RoadmapSummary({ items, failed }: { items: RoadmapItem[]; failed: boolean }) {
  const order = ["completed", "in_progress", "planned", "on_hold"] as const;
  const published = items.filter(item => item.publication_status === "published");
  const counts = roadmapCounts(published);
  const percent = published.length ? Math.round(counts.completed / published.length * 100) : 0;
  return <section id="roadmap" className="border-y border-[#d9e2ec] bg-[#eef5f5] py-20 sm:py-24"><div className="mx-auto max-w-7xl px-6 lg:px-12">
    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="eyebrow">A transparent flight plan</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Product Roadmap</h2><p className="mt-4 max-w-xl leading-7 text-[#627d98]">The flight plan for Flight Desk. Explore the milestones behind the product, from completed features to the next horizon. Open to everyone.</p></div><Link href="/roadmap" className="shrink-0 text-sm font-bold text-[#168c82] hover:underline">View Full Roadmap <span aria-hidden="true">→</span></Link></div>
    {failed ? <p role="alert" className="mt-8 rounded-xl border border-[#f3c5bd] bg-white p-5 text-[#b94a3d]">The roadmap is temporarily unavailable. Please try again later.</p> : !published.length ? <RoadmapEmptyState /> : <>
      <div className="mt-10 rounded-2xl border border-[#c6dedb] bg-white p-6 sm:p-8"><div className="flex flex-wrap items-baseline justify-between gap-3"><p className="font-bold">Published milestones</p><p className="text-sm text-[#486581]">{counts.completed} of {published.length} completed <span className="font-bold text-[#168c82]">· {percent}%</span></p></div><div role="progressbar" aria-label="Completed published roadmap items" aria-valuenow={counts.completed} aria-valuemin={0} aria-valuemax={published.length} aria-valuetext={`${counts.completed} of ${published.length} published items completed`} className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf2f7]"><div className="h-full rounded-full bg-[#168c82]" style={{ width: `${percent}%` }} /></div><p className="mt-3 text-xs text-[#627d98]">Based on published items only. Plans evolve; this is not an estimate of release timing.</p></div>
      <div className="mt-8 grid items-start gap-6 grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]">{order.filter(status => counts[status] > 0).map(status => {
        const matches = published.filter(item => item.status === status);
        return <section key={status} className="min-w-0" aria-labelledby={`home-roadmap-${status}`}><div className="mb-4 flex items-center gap-3"><span aria-hidden="true" className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${statusStyles[status]}`}>{status === "completed" ? "✓" : status === "in_progress" ? "↗" : status === "planned" ? "→" : "Ⅱ"}</span><h3 id={`home-roadmap-${status}`} className="font-bold">{statusLabels[status]}</h3><span className="ml-auto text-sm text-[#627d98]">{matches.length}</span></div><div className="space-y-4">{matches.slice(0, 2).map(item => <RoadmapCard key={item.id} item={item} />)}</div>{matches.length > 2 && <Link href={`/roadmap#status-${status}`} className="mt-4 inline-block text-sm font-bold text-[#168c82] hover:underline">View all {matches.length} {statusLabels[status].toLowerCase()} items →</Link>}</section>;
      })}</div>
    </>}
  </div></section>;
}

export function RoadmapEmptyState() {
  return <div className="relative mt-10 overflow-hidden rounded-[2rem] border border-[#c6dedb] bg-white px-6 py-12 text-center sm:px-12"><svg aria-hidden="true" viewBox="0 0 360 80" className="mx-auto mb-6 h-20 w-full max-w-sm" fill="none"><path d="M20 60Q180-35 340 40" stroke="#9fd8d2" strokeWidth="2" strokeDasharray="5 7" /><circle cx="20" cy="60" r="5" fill="#e8753a" /><circle cx="340" cy="40" r="5" fill="#168c82" /><path d="m172 26 22 4-22 9 4-8-4-5Z" fill="#102a43" /></svg><p className="eyebrow">Preparing the next departure</p><h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Our public flight plan is taking shape.</h3><p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#627d98]">We’re preparing our first product updates. Published milestones will appear here as they’re ready to share. You can follow along without an account.</p></div>;
}

export function RoadmapBoard({ items }: { items: RoadmapItem[] }) {
  return <div className="mt-12 grid items-start gap-6 md:grid-cols-2 xl:grid-cols-4">{statuses.map(status => <section key={status} aria-labelledby={`status-${status}`} className="min-w-0"><h2 id={`status-${status}`} className="mb-4 flex items-center justify-between text-lg font-bold">{statusLabels[status]}<span className={`rounded-full px-3 py-1 text-sm ${statusStyles[status]}`}>{items.filter(item => item.status === status).length}</span></h2><div className="space-y-4">{items.filter(item => item.status === status).map(item => <RoadmapCard key={item.id} item={item} />)}{!items.some(item => item.status === status) && <p className="rounded-2xl border border-dashed border-[#bcccdc] p-6 text-sm text-[#627d98]">No published items in this column yet.</p>}</div></section>)}</div>;
}
