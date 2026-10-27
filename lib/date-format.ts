import type { DateFormat, TimeFormat } from "./preferences";
export { defaultPreferences } from "./preferences";
export type { DateFormat } from "./preferences";
export const defaultDateFormat: DateFormat = "MM/DD/YYYY";
export function formatDateTime(value: string, dateFormat: DateFormat = defaultDateFormat, timeFormat: TimeFormat = "12h", locale = "en-US") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit", hour12: timeFormat === "12h" }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value || "";
  const y = get("year"), m = get("month"), d = get("day");
  const dateText = dateFormat === "DD/MM/YYYY" ? `${d}/${m}/${y}` : dateFormat === "YYYY-MM-DD" ? `${y}-${m}-${d}` : `${m}/${d}/${y}`;
  const timeText = `${get("hour")}:${get("minute")}${timeFormat === "12h" && get("dayPeriod") ? ` ${get("dayPeriod")}` : ""}`;
  return `${dateText}, ${timeText}`;
}
export function formatDateUTC(value: string, format: DateFormat = defaultDateFormat, monthOnly = false) {
  const date = new Date(value.length === 10 ? value + "T12:00:00Z" : value);
  if (!Number.isFinite(date.getTime())) return "—";
  if (monthOnly) return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "long" }).format(date);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get=(type:string)=>parts.find(part=>part.type===type)?.value||"";
  const y=get("year"),m=get("month"),d=get("day");
  return format === "DD/MM/YYYY" ? `${d}/${m}/${y}` : format === "YYYY-MM-DD" ? `${y}-${m}-${d}` : `${m}/${d}/${y}`;
}
