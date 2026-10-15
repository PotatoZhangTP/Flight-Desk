"use client";

import { roadmapSortOptions, type RoadmapSort } from "@/lib/roadmap/model";

export function RoadmapSortControl({ id, value, onChange }: { id: string; value: RoadmapSort; onChange: (value: RoadmapSort) => void }) {
  return <label htmlFor={id} className="flex min-w-0 flex-col gap-2 text-sm font-semibold sm:flex-row sm:items-center sm:gap-3">Sort By
    <select id={id} aria-label="Sort By" value={value} onChange={event => onChange(event.target.value as RoadmapSort)} className="min-w-0 max-w-full rounded-xl border border-[#bcccdc] bg-white px-3 py-2.5 text-sm font-normal text-[#102a43] outline-none focus:border-[#168c82] focus:ring-2 focus:ring-[#9fd8d2]">{Object.entries(roadmapSortOptions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
  </label>;
}
