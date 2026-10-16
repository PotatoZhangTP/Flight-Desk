export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export const defaultDateFormat: DateFormat = "MM/DD/YYYY";
export function formatDateUTC(value: string, format: DateFormat = defaultDateFormat, monthOnly = false) {
  const date = new Date(value.length === 10 ? value + "T12:00:00Z" : value);
  if (!Number.isFinite(date.getTime())) return "—";
  if (monthOnly) return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "long" }).format(date);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get=(type:string)=>parts.find(part=>part.type===type)?.value||"";
  const y=get("year"),m=get("month"),d=get("day");
  return format === "DD/MM/YYYY" ? `${d}/${m}/${y}` : format === "YYYY-MM-DD" ? `${y}-${m}-${d}` : `${m}/${d}/${y}`;
}
