"use client";

import { useState } from "react";
import { RoadmapBoard } from "./roadmap-cards";
import { RoadmapSortControl } from "./roadmap-controls";
import { sortRoadmapItems, type RoadmapItem, type RoadmapSort } from "@/lib/roadmap/model";

export function RoadmapExplorer({ items, today }: { items: RoadmapItem[]; today: string }) {
  const [sort, setSort] = useState<RoadmapSort>("target_closest");
  const published = items.filter(item => item.publication_status === "published");
  return <div className="mt-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><p className="text-sm text-[#627d98]">{published.length} published milestones · grouped by development status</p><RoadmapSortControl id="public-roadmap-sort" value={sort} onChange={setSort} /></div><RoadmapBoard items={sortRoadmapItems(published, sort, today)} /></div>;
}
