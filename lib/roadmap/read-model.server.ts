import "server-only";
import type { RoadmapItem, RoadmapStatus } from "./model";

// Read-boundary compatibility only. Never expose the retired state to client UI
// or accept it in write validation. Safe both before and after manual migration.
export type DatabaseRoadmapItem = Omit<RoadmapItem, "status"> & {
  status: RoadmapStatus | "in_progress";
};
export function readRoadmapItems(items: readonly DatabaseRoadmapItem[]): RoadmapItem[] {
  return items.map(item => ({ ...item, status: item.status === "in_progress" ? "planned" : item.status }));
}
