import Link from "next/link";
import { formatRoadmapDate, roadmapCounts, statuses, statusLabels, statusStyles, type RoadmapItem } from "@/lib/roadmap/model";

export function RoadmapCard({ item, compact = false }: { item: RoadmapItem; compact?: boolean }) {
  return <article className={`flex min-w-0 flex-col rounded-xl border border-[#d9e2ec] bg-white transition hover:border-[#9fd8d2] hover:shadow-sm ${compact ? "p-4" : "p-5"}`}>
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${statusStyles[item.status]}`}>{statusLabels[item.status]}</span><span className="min-w-0 truncate text-[11px] font-medium text-[#627d98]" title={item.category}>{item.category}</span></div>
    <h3 className={`mt-2.5 break-words text-base font-bold leading-snug tracking-tight text-[#102a43] ${compact ? "line-clamp-2" : ""}`} title={compact ? item.title : undefined}>{item.title}</h3>
    <p className={`mt-1.5 break-words text-sm leading-5 text-[#627d98] ${compact ? "line-clamp-2" : "whitespace-pre-wrap"}`}>{item.description}</p>
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#edf2f7] pt-2.5 text-[11px] leading-4 text-[#627d98]">
      {!compact && item.priority && <span className="capitalize">Priority · {item.priority}</span>}
      {item.target_date && <span>Target <time dateTime={item.target_date}>{formatRoadmapDate(item.target_date)}</time></span>}
      {item.completed_date && <span>Completed <time dateTime={item.completed_date}>{formatRoadmapDate(item.completed_date)}</time></span>}
      <span>Updated <time dateTime={item.updated_at}>{formatRoadmapDate(item.updated_at)}</time></span>
    </div>
  </article>;
}

export function RoadmapSummary({ items, failed }: { items: RoadmapItem[]; failed: boolean }) {
  const order = ["completed", "in_progress", "planned", "on_hold"] as const;
  const published = items.filter(item => item.publication_status === "published");
  const counts = roadmapCounts(published);
  return <section id="roadmap" className="border-y border-[#d9e2ec] bg-[#eef5f5] py-12 sm:py-16"><div className="mx-auto max-w-7xl px-6 lg:px-12">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">Our flight plan</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Product Roadmap</h2><p className="mt-2 text-sm leading-6 text-[#627d98]">What’s ready, what’s taking shape, and what’s next.</p></div><Link href="/roadmap" className="shrink-0 rounded-lg py-1 text-sm font-semibold text-[#168c82] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#168c82]">View Full Roadmap <span aria-hidden="true">→</span></Link></div>
    {failed ? <p role="alert" className="mt-6 rounded-xl border border-[#f3c5bd] bg-white p-4 text-sm text-[#b94a3d]">The roadmap is temporarily unavailable. Please try again later.</p> : !published.length ? <RoadmapEmptyState compact /> : <>
      <div className="mt-6 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">{order.filter(status => counts[status] > 0).map(status => {
        const matches = published.filter(item => item.status === status);
        return <section key={status} className="min-w-0" aria-labelledby={`home-roadmap-${status}`}><div className="mb-2.5 flex items-center gap-2"><span aria-hidden="true" className={`grid h-6 w-6 place-items-center rounded-md text-xs font-bold ${statusStyles[status]}`}>{status === "completed" ? "✓" : status === "in_progress" ? "↗" : status === "planned" ? "→" : "Ⅱ"}</span><h3 id={`home-roadmap-${status}`} className="text-sm font-bold">{statusLabels[status]}</h3><span className="text-xs text-[#829ab1]">{matches.length}</span></div><div className="space-y-3">{matches.slice(0, 2).map(item => <RoadmapCard key={item.id} item={item} compact />)}</div>{matches.length > 2 && <Link href={`/roadmap#status-${status}`} className="mt-3 inline-block text-xs font-semibold text-[#168c82] hover:underline">View all {matches.length} {statusLabels[status].toLowerCase()} items →</Link>}</section>;
      })}</div>
    </>}
  </div></section>;
}

export function RoadmapEmptyState({ compact = false }: { compact?: boolean }) {
  if (compact) return <div className="mt-6 flex items-center gap-4 rounded-xl border border-dashed border-[#b8d3cf] bg-white/60 p-5"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#dff4f0] text-lg text-[#168c82]">✈</span><div><h3 className="text-sm font-bold">Our public flight plan is taking shape.</h3><p className="mt-1 text-sm leading-5 text-[#627d98]">Product updates will appear here when they’re ready to share.</p></div></div>;
  return <div className="relative mt-10 overflow-hidden rounded-[2rem] border border-[#c6dedb] bg-white px-6 py-12 text-center sm:px-12"><svg aria-hidden="true" viewBox="0 0 360 80" className="mx-auto mb-6 h-20 w-full max-w-sm" fill="none"><path d="M20 60Q180-35 340 40" stroke="#9fd8d2" strokeWidth="2" strokeDasharray="5 7" /><circle cx="20" cy="60" r="5" fill="#e8753a" /><circle cx="340" cy="40" r="5" fill="#168c82" /><path d="m172 26 22 4-22 9 4-8-4-5Z" fill="#102a43" /></svg><p className="eyebrow">Preparing the next departure</p><h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Our public flight plan is taking shape.</h3><p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#627d98]">We’re preparing our first product updates. Published milestones will appear here as they’re ready to share. You can follow along without an account.</p></div>;
}

export function RoadmapBoard({ items }: { items: RoadmapItem[] }) {
  return <div className="mt-12 grid items-start gap-6 md:grid-cols-2 xl:grid-cols-4">{statuses.map(status => <section key={status} aria-labelledby={`status-${status}`} className="min-w-0"><h2 id={`status-${status}`} className="mb-4 flex items-center justify-between text-lg font-bold">{statusLabels[status]}<span className={`rounded-full px-3 py-1 text-sm ${statusStyles[status]}`}>{items.filter(item => item.status === status).length}</span></h2><div className="space-y-4">{items.filter(item => item.status === status).map(item => <RoadmapCard key={item.id} item={item} />)}{!items.some(item => item.status === status) && <p className="rounded-2xl border border-dashed border-[#bcccdc] p-6 text-sm text-[#627d98]">No published items in this column yet.</p>}</div></section>)}</div>;
}
