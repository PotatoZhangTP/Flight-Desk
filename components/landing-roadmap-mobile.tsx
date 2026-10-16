"use client";

import { useId, useState } from "react";
import { T, LocalizedDate, useText } from "./i18n";
import Link from "./navigation-link";
import { RoadmapContentText } from "./roadmap-content";
import { statuses, statusLabels, statusStyles, roadmapItemHref, type RoadmapItem, type RoadmapStatus } from "@/lib/roadmap/model";

/** Presentation only: the server supplies the same published items as the desktop summary. */
export function LandingRoadmapMobile({ items }: { items: RoadmapItem[] }) {
  const [filter, setFilter] = useState<"all" | RoadmapStatus>("all");
  const [limit, setLimit] = useState(4);
  const id = useId();
  const t = useText();
  const filtered = items.filter(item => filter === "all" || item.status === filter);
  const available = statuses.filter(status => items.some(item => item.status === status));
  return <div className="landing-roadmap-mobile mt-6">
    <div role="group" aria-label={t("landing.roadmapFilters")} className="roadmap-filters">
      {(["all", ...available] as const).map(status => <button key={status} type="button" aria-pressed={filter === status} aria-controls={id} onClick={() => { setFilter(status); setLimit(4); }} className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${filter === status ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted"}`}><T id={status === "all" ? "landing.roadmapAll" : undefined} source={status === "all" ? undefined : statusLabels[status]} /></button>)}
    </div>
    <p role="status" aria-live="polite" aria-atomic="true" className="my-3 text-xs text-muted"><T id="landing.roadmapCount" values={{ shown: Math.min(limit, filtered.length), total: filtered.length }} /></p>
    <div id={id} className="space-y-3">
      {filtered.slice(0, limit).map(item => <details key={item.id} className="roadmap-disclosure rounded-2xl border border-line bg-surface">
        <summary className="cursor-pointer rounded-2xl p-4">
          <span className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[item.status]}`}><T source={statusLabels[item.status]} /></span><span aria-hidden="true" className="roadmap-chevron text-brand">⌄</span></span>
          <h3 className="mt-2 break-words text-base font-bold leading-6"><RoadmapContentText item={item} field="title" /></h3>
          {item.description && <p className="roadmap-excerpt mt-1 line-clamp-2 break-words text-sm leading-6 text-muted"><RoadmapContentText item={item} field="description" /></p>}
          <span className="mt-2 block break-words text-xs leading-5 text-muted"><RoadmapContentText item={item} field="category" /></span>
          <span className="sr-only"><T id="landing.roadmapDetails" /></span>
        </summary>
        <div className="roadmap-details border-t border-line px-4 pb-4 pt-3">
          {item.description && <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted"><RoadmapContentText item={item} field="description" /></p>}
          <dl className="mt-3 space-y-2 text-xs text-muted">
            {item.target_date && <div className="flex flex-wrap justify-between gap-2"><dt><T id="roadmap.target" /></dt><dd><LocalizedDate value={item.target_date} /></dd></div>}
            {item.completed_date && <div className="flex flex-wrap justify-between gap-2"><dt><T id="roadmap.completedDate" /></dt><dd><LocalizedDate value={item.completed_date} /></dd></div>}
            <div className="flex flex-wrap justify-between gap-2"><dt><T id="roadmap.updated" /></dt><dd><LocalizedDate value={item.updated_at} /></dd></div>
          </dl>
          <Link href={roadmapItemHref(item.id)} className="mt-3 inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand"><T id="landing.roadmapViewItem" /> <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
      </details>)}
      {!filtered.length && <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted"><T id="roadmap.emptyItems" /></p>}
    </div>
    {limit < filtered.length && <button type="button" aria-controls={id} onClick={() => setLimit(value => value + 4)} className="mt-4 min-h-11 w-full rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-brand"><T id="landing.roadmapMore" /></button>}
  </div>;
}
