export const statuses = ["planned", "completed", "on_hold"] as const;
export type RoadmapStatus = (typeof statuses)[number];
export const statusLabels: Record<RoadmapStatus, string> = {
  planned: "Planned", completed: "Completed", on_hold: "On Hold",
};
export const statusStyles: Record<RoadmapStatus, string> = {
  planned: "bg-planned-bg text-planned-fg",
  completed: "bg-completed-bg text-completed-fg", on_hold: "bg-hold-bg text-hold-fg",
};
export type RoadmapItem = {
  id: string; title: string; description: string; category: string; status: RoadmapStatus;
  publication_status: "draft" | "published"; priority: "low" | "medium" | "high" | null;
  target_date: string | null; completed_date: string | null; sort_order: number;
  created_at: string; updated_at: string;
};
export type LegacyRoadmapItem = Omit<RoadmapItem, "status"> & { status: RoadmapStatus | "in_progress" };
// Keep every legacy record visible before the administrator runs the SQL migration.
export function normalizeRoadmapItems(items: readonly LegacyRoadmapItem[]): RoadmapItem[] {
  return items.map(item => ({ ...item, status: item.status === "in_progress" ? "planned" : item.status }));
}
export function roadmapItemAnchor(id: string) { return `roadmap-item-${id}`; }
export function roadmapItemHref(id: string) { return `/roadmap?item=${encodeURIComponent(id)}`; }
export function roadmapCounts(input: LegacyRoadmapItem[]) {
  const items = normalizeRoadmapItems(input);
  return Object.fromEntries(statuses.map(status => [status, items.filter(item => item.status === status).length])) as Record<RoadmapStatus, number>;
}
export function formatRoadmapDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export const roadmapSortOptions = {
  target_closest: "Target Date (Closest First)",
  target_farthest: "Target Date (Farthest First)",
  updated_newest: "Last Updated (Newest First)",
  updated_oldest: "Last Updated (Oldest First)",
} as const;
export type RoadmapSort = keyof typeof roadmapSortOptions;
export type RoadmapFilter = "all" | RoadmapStatus | "draft" | "published";

// Resolve the reference day once on the server and pass it to client views.
// A common project timezone prevents SSR/browser timezone disagreements.
export function roadmapToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function sortRoadmapItems(items: RoadmapItem[], sort: RoadmapSort = "target_closest", today = roadmapToday(), dateField: "target_date" | "completed_date" = "target_date") {
  const reference = Date.parse(`${today}T00:00:00Z`);
  const tieBreak = (a: RoadmapItem, b: RoadmapItem) => (a.created_at ?? "").localeCompare(b.created_at ?? "") || a.id.localeCompare(b.id);
  return [...items].sort((a, b) => {
    if (sort === "target_closest" || sort === "target_farthest") {
      // Null dates stay last in BOTH directions; never substitute a fake date.
      const dateA = a[dateField], dateB = b[dateField];
      if (!dateA && !dateB) return tieBreak(a, b);
      if (!dateA) return 1;
      if (!dateB) return -1;
      const distanceA = Math.abs(Date.parse(`${dateA}T00:00:00Z`) - reference);
      const distanceB = Math.abs(Date.parse(`${dateB}T00:00:00Z`) - reference);
      const difference = sort === "target_closest" ? distanceA - distanceB : distanceB - distanceA;
      return difference || dateA.localeCompare(dateB) || tieBreak(a, b);
    }
    const difference = Date.parse(a.updated_at) - Date.parse(b.updated_at);
    return (sort === "updated_newest" ? -difference : difference) || tieBreak(a, b);
  });
}

export function landingRoadmapGroups(input: LegacyRoadmapItem[], today = roadmapToday()) {
  const items = normalizeRoadmapItems(input);
  return statuses.map(status => ({
    status,
    items: sortRoadmapItems(
      items.filter(item => item.publication_status === "published" && item.status === status),
      "target_closest", today, status === "completed" ? "completed_date" : "target_date",
    ).slice(0, 4),
  }));
}

export function filterRoadmapItems(input: LegacyRoadmapItem[], filter: RoadmapFilter) {
  const items = normalizeRoadmapItems(input);
  return items.filter(item => filter === "all" || item.status === filter || item.publication_status === filter);
}
function dateValue(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text) throw new Error("Enter a valid calendar date.");
  return text;
}
export function parseRoadmapForm(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const status = String(form.get("status") ?? "");
  const publication_status = String(form.get("publication_status") ?? "");
  const priority = String(form.get("priority") ?? "") || null;
  if (!title || [...title].length > 160) throw new Error("Title must be between 1 and 160 characters.");
  if ([...description].length > 5000) throw new Error("Description must be 5,000 characters or fewer.");
  if (!category || [...category].length > 80) throw new Error("Category must be between 1 and 80 characters.");
  if (!statuses.includes(status as RoadmapStatus)) throw new Error("Choose a valid development status.");
  if (!["draft", "published"].includes(publication_status)) throw new Error("Choose Draft or Published.");
  if (priority !== null && !["low", "medium", "high"].includes(priority)) throw new Error("Choose a valid priority.");
  // Leave legacy sort_order untouched on update; inserts use its database default.
  return { title, description, category, status, publication_status, priority,
    target_date: dateValue(form.get("target_date")), completed_date: dateValue(form.get("completed_date")) };
}
