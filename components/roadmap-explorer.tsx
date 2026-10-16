"use client";
import { T } from "@/components/i18n";


import { useEffect, useState } from "react";
import { RoadmapBoard } from "./roadmap-cards";
import { RoadmapSortControl } from "./roadmap-controls";
import { roadmapItemAnchor, sortRoadmapItems, type RoadmapItem, type RoadmapSort } from "@/lib/roadmap/model";

export function RoadmapExplorer({ items, today, requestedItem }: { items: RoadmapItem[]; today: string; requestedItem?: string }) {
  const [sort, setSort] = useState<RoadmapSort>("target_closest");
  const published = items.filter(item => item.publication_status === "published");
  const unavailable = requestedItem && !published.some(item => item.id === requestedItem);
  useEffect(() => {
    if (!requestedItem || !items.some(item => item.id === requestedItem && item.publication_status === "published")) return;
    let target: HTMLElement | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      target = document.getElementById(roadmapItemAnchor(requestedItem));
      if (!target) return;
      target.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      target.focus({ preventScroll: true });
      target.classList.add("roadmap-item-highlight");
      timeout = setTimeout(() => target?.classList.remove("roadmap-item-highlight"), 2600);
    });
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); target?.classList.remove("roadmap-item-highlight"); };
  }, [items, requestedItem]);
  return <div className="mt-8">{unavailable && <p role="status" className="mb-5 rounded-xl bg-page px-4 py-3 text-sm text-muted"><T id="roadmap.itemHelp" /></p>}<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><p className="text-sm text-muted">{published.length}<T id="roadmap.milestoneCount" /></p><RoadmapSortControl id="public-roadmap-sort" value={sort} onChange={setSort} /></div><RoadmapBoard items={sortRoadmapItems(published, sort, today)} /></div>;
}
