export const statuses = ["planned", "in_progress", "completed", "on_hold"] as const;
export type RoadmapStatus = (typeof statuses)[number];
export const statusLabels: Record<RoadmapStatus, string> = {
  planned: "Planned", in_progress: "In Progress", completed: "Completed", on_hold: "On Hold",
};
export const statusStyles: Record<RoadmapStatus, string> = {
  planned: "bg-[#edf2f7] text-[#486581]", in_progress: "bg-[#fff0e4] text-[#a64b20]",
  completed: "bg-[#dff4f0] text-[#11675f]", on_hold: "bg-[#f0ebfa] text-[#705099]",
};
export type RoadmapItem = {
  id: string; title: string; description: string; category: string; status: RoadmapStatus;
  publication_status: "draft" | "published"; priority: "low" | "medium" | "high" | null;
  target_date: string | null; completed_date: string | null; sort_order: number;
  created_at: string; updated_at: string;
};
export function roadmapCounts(items: RoadmapItem[]) {
  return Object.fromEntries(statuses.map(status => [status, items.filter(item => item.status === status).length])) as Record<RoadmapStatus, number>;
}
export function formatRoadmapDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
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
  const orderText = String(form.get("sort_order") ?? "").trim();
  const sort_order = Number(orderText);
  if (!title || [...title].length > 160) throw new Error("Title must be between 1 and 160 characters.");
  if ([...description].length > 5000) throw new Error("Description must be 5,000 characters or fewer.");
  if (!category || [...category].length > 80) throw new Error("Category must be between 1 and 80 characters.");
  if (!statuses.includes(status as RoadmapStatus)) throw new Error("Choose a valid development status.");
  if (!["draft", "published"].includes(publication_status)) throw new Error("Choose Draft or Published.");
  if (priority !== null && !["low", "medium", "high"].includes(priority)) throw new Error("Choose a valid priority.");
  if (!/^-?\d+$/.test(orderText) || !Number.isInteger(sort_order) || sort_order < -2147483648 || sort_order > 2147483647) throw new Error("Display order must be a whole number within the supported range.");
  return { title, description, category, status, publication_status, priority, sort_order,
    target_date: dateValue(form.get("target_date")), completed_date: dateValue(form.get("completed_date")) };
}
