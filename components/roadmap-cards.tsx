import Link from "next/link";
import { formatRoadmapDate, sortRoadmapItems, statuses, statusLabels, statusStyles, type RoadmapItem } from "@/lib/roadmap/model";

export function RoadmapCard({ item, mode = "detailed" }: { item: RoadmapItem; mode?: "compact" | "detailed" }) {
  if (mode === "compact") return <article className="group relative flex h-full min-h-[208px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d4e3e6] bg-white p-6 shadow-sm shadow-[#102a43]/5 transition duration-200 hover:-translate-y-1 hover:border-[#9fd8d2] hover:shadow-lg hover:shadow-[#102a43]/10">
    <div className="flex items-start justify-between gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[item.status]}`}>{statusLabels[item.status]}</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-6 w-6 shrink-0 text-[#a3c8c4] transition group-hover:text-[#168c82]"><path d="m3 13 7-2 4-7 2 1-2 6 6 2v2l-7-1-3 6-2-1 1-6-6 2Z" strokeLinejoin="round" /></svg></div>
    <h3 className="mt-5 line-clamp-2 break-words text-lg font-bold leading-snug tracking-tight text-[#102a43]" title={item.title}>{item.title}</h3>
    <div className="relative mt-auto flex items-center justify-between gap-3 pt-6 text-xs"><span className="text-[#627d98]">Target date</span><span className={`font-semibold ${item.target_date ? "text-[#102a43]" : "text-[#829ab1]"}`}>{item.target_date ? <time dateTime={item.target_date}>{formatRoadmapDate(item.target_date)}</time> : "TBD"}</span></div>
    <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-6 right-6 flex items-center gap-2 opacity-60"><span className="h-1 w-1 rounded-full bg-[#e8753a]" /><span className="h-px flex-1 border-t border-dashed border-[#c6dedb]" /><span className="h-1 w-1 rounded-full bg-[#168c82]" /></div>
  </article>;

  return <article className="min-w-0 rounded-2xl border border-[#d9e2ec] bg-white p-6 shadow-sm transition hover:border-[#9fd8d2] hover:shadow-md">
    <div className="flex items-start justify-between gap-3"><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusStyles[item.status]}`}>{statusLabels[item.status]}</span><span className="max-w-[50%] break-words text-right text-xs font-medium leading-5 text-[#627d98]">{item.category}</span></div>
    <h3 className="mt-5 break-words text-lg font-bold leading-snug tracking-tight text-[#102a43]">{item.title}</h3>
    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#627d98]">{item.description}</p>
    <dl className="mt-5 space-y-2 border-t border-[#edf2f7] pt-4 text-xs text-[#627d98]">
      {item.target_date && <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt>Target date</dt><dd><time dateTime={item.target_date}>{formatRoadmapDate(item.target_date)}</time></dd></div>}
      {item.completed_date && <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt>Completed date</dt><dd><time dateTime={item.completed_date}>{formatRoadmapDate(item.completed_date)}</time></dd></div>}
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt>Last updated</dt><dd><time dateTime={item.updated_at}>{formatRoadmapDate(item.updated_at)}</time></dd></div>
    </dl>
  </article>;
}

export function RoadmapSummary({ items, failed }: { items: RoadmapItem[]; failed: boolean }) {
  const highlights = sortRoadmapItems(items.filter(item => item.publication_status === "published")).slice(0, 6);
  return <section id="roadmap" className="relative overflow-hidden border-y border-[#d9e2ec] bg-[#eef5f5] py-14 sm:py-16"><div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border border-[#d5e5e3]" /><div className="relative mx-auto max-w-7xl px-6 lg:px-12">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Our flight plan</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Product Roadmap</h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#627d98]">What’s ready, what’s taking shape, and what’s next.</p></div><Link href="/roadmap" className="shrink-0 rounded-lg py-1 text-sm font-semibold text-[#168c82] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#168c82]">View Full Roadmap <span aria-hidden="true">→</span></Link></div>
    {failed ? <p role="alert" className="mt-6 rounded-xl border border-[#f3c5bd] bg-white p-4 text-sm text-[#b94a3d]">The roadmap is temporarily unavailable. Please try again later.</p> : !highlights.length ? <RoadmapEmptyState compact /> : <div className="mt-8 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">{highlights.map(item => <RoadmapCard key={item.id} item={item} mode="compact" />)}</div>}
  </div></section>;
}

export function RoadmapEmptyState({ compact = false }: { compact?: boolean }) {
  if (compact) return <div className="mt-6 flex items-center gap-4 rounded-xl border border-dashed border-[#b8d3cf] bg-white/60 p-5"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#dff4f0] text-lg text-[#168c82]">✈</span><div><h3 className="text-sm font-bold">Our public flight plan is taking shape.</h3><p className="mt-1 text-sm leading-5 text-[#627d98]">Product updates will appear here when they’re ready to share.</p></div></div>;
  return <div className="relative mt-10 overflow-hidden rounded-[2rem] border border-[#c6dedb] bg-white px-6 py-12 text-center sm:px-12"><svg aria-hidden="true" viewBox="0 0 360 80" className="mx-auto mb-6 h-20 w-full max-w-sm" fill="none"><path d="M20 60Q180-35 340 40" stroke="#9fd8d2" strokeWidth="2" strokeDasharray="5 7" /><circle cx="20" cy="60" r="5" fill="#e8753a" /><circle cx="340" cy="40" r="5" fill="#168c82" /><path d="m172 26 22 4-22 9 4-8-4-5Z" fill="#102a43" /></svg><p className="eyebrow">Preparing the next departure</p><h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Our public flight plan is taking shape.</h3><p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#627d98]">We’re preparing our first product updates. Published milestones will appear here as they’re ready to share. You can follow along without an account.</p></div>;
}

export function RoadmapBoard({ items }: { items: RoadmapItem[] }) {
  return <div className="mt-8 grid items-start gap-6 md:grid-cols-2 xl:grid-cols-4">{statuses.map(status => <section key={status} aria-labelledby={`status-${status}`} className="min-w-0"><h2 id={`status-${status}`} className="mb-4 flex items-center justify-between text-lg font-bold">{statusLabels[status]}<span className={`rounded-full px-3 py-1 text-sm ${statusStyles[status]}`}>{items.filter(item => item.status === status).length}</span></h2><div className="space-y-5">{items.filter(item => item.status === status).map(item => <RoadmapCard key={item.id} item={item} />)}{!items.some(item => item.status === status) && <p className="rounded-xl border border-dashed border-[#bcccdc] p-4 text-sm text-[#627d98]">No published items yet.</p>}</div></section>)}</div>;
}
