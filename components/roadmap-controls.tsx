"use client";
import { T, useText } from "@/components/i18n";


import { roadmapSortOptions, type RoadmapSort } from "@/lib/roadmap/model";

export function RoadmapSortControl({ id, value, onChange }: { id: string; value: RoadmapSort; onChange: (value: RoadmapSort) => void }) {
  const t = useText();
  return <label htmlFor={id} className="flex min-w-0 flex-col gap-2 text-sm font-semibold sm:flex-row sm:items-center sm:gap-3"><T id="roadmap.sort" /><select id={id} aria-label={t("Sort By")} value={value} onChange={event => onChange(event.target.value as RoadmapSort)} className="min-w-0 max-w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-line-strong">{Object.entries(roadmapSortOptions).map(([key, label]) => <option key={key} value={key}><T source={label} /></option>)}</select>
  </label>;
}
