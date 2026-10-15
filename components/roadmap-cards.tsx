import Link from "next/link";
import { formatRoadmapDate, statuses, statusLabels, statusStyles, type RoadmapItem } from "@/lib/roadmap/model";

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
  const groups = [
    { status: "completed", title: "Recently completed" },
    { status: "in_progress", title: "Currently building" },
    { status: "planned", title: "Coming next" },
  ] as const;
  return <section id="roadmap" className="border-y border-[#d9e2ec] bg-[#eef5f5] py-20 sm:py-24"><div className="mx-auto max-w-7xl px-6 lg:px-12">
    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="eyebrow">A transparent flight plan</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Built with the journey in mind.</h2><p className="mt-4 max-w-xl leading-7 text-[#627d98]">See what’s taking shape, what’s ready, and where Flight Desk is heading.</p></div><Link href="/roadmap" className="text-sm font-bold text-[#168c82] hover:underline">View full roadmap <span aria-hidden="true">↗</span></Link></div>
    {failed ? <p role="alert" className="mt-8 rounded-xl border border-[#f3c5bd] bg-white p-5 text-[#b94a3d]">The roadmap is temporarily unavailable. Please try again later.</p> : <div className="mt-10 grid gap-6 md:grid-cols-3">{groups.map(group => {
      const matches = items.filter(item => item.status === group.status);
      const item = group.status === "completed" ? [...matches].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] : matches[0];
      return <div key={group.status} className="min-w-0"><h3 className="mb-3 text-sm font-bold text-[#486581]">{group.title}</h3>{item ? <RoadmapCard item={item} /> : <div className="rounded-2xl border border-dashed border-[#bcccdc] p-6 text-sm leading-6 text-[#627d98]">No published {statusLabels[group.status].toLowerCase()} items yet.</div>}</div>;
    })}</div>}
  </div></section>;
}

export function RoadmapBoard({ items }: { items: RoadmapItem[] }) {
  return <div className="mt-12 grid items-start gap-6 md:grid-cols-2 xl:grid-cols-4">{statuses.map(status => <section key={status} aria-labelledby={`status-${status}`} className="min-w-0"><h2 id={`status-${status}`} className="mb-4 flex items-center justify-between text-lg font-bold">{statusLabels[status]}<span className={`rounded-full px-3 py-1 text-sm ${statusStyles[status]}`}>{items.filter(item => item.status === status).length}</span></h2><div className="space-y-4">{items.filter(item => item.status === status).map(item => <RoadmapCard key={item.id} item={item} />)}{!items.some(item => item.status === status) && <p className="rounded-2xl border border-dashed border-[#bcccdc] p-6 text-sm text-[#627d98]">No published items in this column yet.</p>}</div></section>)}</div>;
}
