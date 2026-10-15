import Link from "next/link";
import { formatRoadmapDate, landingRoadmapGroups, roadmapItemAnchor, roadmapItemHref, statuses, statusLabels, statusStyles, type RoadmapItem } from "@/lib/roadmap/model";
import { landingDefaults, type LandingCopy } from "@/lib/content/model";

export function RoadmapCard({ item, mode = "detailed" }: { item: RoadmapItem; mode?: "compact" | "detailed" }) {
  const showCompletedDate = item.status === "completed";
  const previewDate = showCompletedDate ? item.completed_date : item.target_date;
  if (mode === "compact") return <article className="relative flex h-full min-h-[148px] min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-ink/5 transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md hover:shadow-ink/10">
    <div className="flex items-start justify-between gap-3"><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[item.status]}`}>{statusLabels[item.status]}</span><span className="max-w-[45%] break-words text-right text-xs font-medium leading-5 text-muted">{item.category}</span></div>
    <h4 className="mt-2.5 line-clamp-2 break-words text-base font-bold leading-snug tracking-tight text-ink" title={item.title}><Link href={roadmapItemHref(item.id)} className="cursor-pointer outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand">{item.title}</Link></h4>
    <p className="mt-auto pt-3 text-xs leading-5 text-muted">{showCompletedDate ? "Completed date" : "Target date"}: {previewDate ? <time className="font-medium text-muted" dateTime={previewDate}>{formatRoadmapDate(previewDate)}</time> : "TBD"}</p>
  </article>;

  return <article id={roadmapItemAnchor(item.id)} tabIndex={-1} aria-labelledby={`${roadmapItemAnchor(item.id)}-title`} className="min-w-0 scroll-mt-8 rounded-2xl border border-line bg-surface p-6 shadow-sm transition hover:border-line-strong hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
    <div className="flex items-start justify-between gap-3"><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusStyles[item.status]}`}>{statusLabels[item.status]}</span><span className="max-w-[50%] break-words text-right text-xs font-medium leading-5 text-muted">{item.category}</span></div>
    <h3 id={`${roadmapItemAnchor(item.id)}-title`} className="mt-5 break-words text-lg font-bold leading-snug tracking-tight text-ink">{item.title}</h3>
    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted">{item.description}</p>
    <dl className="mt-5 space-y-2 border-t border-surface-muted pt-4 text-xs text-muted">
      {item.target_date && <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt>Target date</dt><dd><time dateTime={item.target_date}>{formatRoadmapDate(item.target_date)}</time></dd></div>}
      {item.completed_date && <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt>Completed date</dt><dd><time dateTime={item.completed_date}>{formatRoadmapDate(item.completed_date)}</time></dd></div>}
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt>Last updated</dt><dd><time dateTime={item.updated_at}>{formatRoadmapDate(item.updated_at)}</time></dd></div>
    </dl>
  </article>;
}

export function RoadmapSummary({ items, failed, copy = landingDefaults }: { items: RoadmapItem[]; failed: boolean; copy?: LandingCopy }) {
  const groups = landingRoadmapGroups(items);
  return <section id="roadmap" className="border-y border-line bg-page py-16 sm:py-24"><div className="mx-auto max-w-7xl px-6 lg:px-12">
    <div className="text-center"><p className="eyebrow whitespace-pre-line">{copy["landing.roadmap.eyebrow"]}</p><h2 className="mt-4 whitespace-pre-line text-3xl font-bold tracking-tight sm:text-4xl">{copy["landing.roadmap.title"]}</h2><p className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-base leading-7 text-muted">{copy["landing.roadmap.description"]}</p><Link href="/roadmap" className="mt-4 inline-block whitespace-pre-line rounded-lg py-1 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{copy["landing.roadmap.link_label"]} <span aria-hidden="true">→</span></Link></div>
    {failed ? <p role="alert" className="mt-6 rounded-xl border border-danger-line bg-surface p-4 text-sm text-danger-fg">The roadmap is temporarily unavailable. Please try again later.</p> : <div className="mt-7 space-y-6">{groups.map(group => <section key={group.status} aria-labelledby={`home-roadmap-${group.status}`}><h3 id={`home-roadmap-${group.status}`} className="mb-3 text-sm font-semibold text-muted">{statusLabels[group.status]}</h3>{group.items.length ? <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">{group.items.map(item => <RoadmapCard key={item.id} item={item} mode="compact" />)}</div> : <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">No published {statusLabels[group.status].toLowerCase()} items yet.</p>}</section>)}</div>}
  </div></section>;
}

export function RoadmapEmptyState({ compact = false }: { compact?: boolean }) {
  if (compact) return <div className="mt-6 flex items-center gap-4 rounded-xl border border-dashed border-line-strong bg-surface/60 p-5"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-lg text-brand">✈</span><div><h3 className="text-sm font-bold">Our public flight plan is taking shape.</h3><p className="mt-1 text-sm leading-5 text-muted">Product updates will appear here when they’re ready to share.</p></div></div>;
  return <div className="relative mt-10 overflow-hidden rounded-[2rem] border border-line bg-surface px-6 py-12 text-center sm:px-12"><svg aria-hidden="true" viewBox="0 0 360 80" className="mx-auto mb-6 h-20 w-full max-w-sm" fill="none"><path d="M20 60Q180-35 340 40" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="5 7" /><circle cx="20" cy="60" r="5" fill="var(--brand)" /><circle cx="340" cy="40" r="5" fill="var(--brand)" /><path d="m172 26 22 4-22 9 4-8-4-5Z" fill="var(--ink)" /></svg><p className="eyebrow">Preparing the next departure</p><h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Our public flight plan is taking shape.</h3><p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-muted">We’re preparing our first product updates. Published milestones will appear here as they’re ready to share. You can follow along without an account.</p></div>;
}

export function RoadmapBoard({ items }: { items: RoadmapItem[] }) {
  return <div className="mt-8 grid items-start gap-6 md:grid-cols-2 xl:grid-cols-4">{statuses.map(status => <section key={status} aria-labelledby={`status-${status}`} className="min-w-0"><h2 id={`status-${status}`} className="mb-4 flex items-center justify-between text-lg font-bold">{statusLabels[status]}<span className={`rounded-full px-3 py-1 text-sm ${statusStyles[status]}`}>{items.filter(item => item.status === status).length}</span></h2><div className="space-y-5">{items.filter(item => item.status === status).map(item => <RoadmapCard key={item.id} item={item} />)}{!items.some(item => item.status === status) && <p className="rounded-xl border border-dashed border-line-strong p-4 text-sm text-muted">No published items yet.</p>}</div></section>)}</div>;
}
