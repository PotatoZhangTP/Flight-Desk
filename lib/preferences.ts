export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export type DistanceUnit = "km" | "mi" | "nm";
export type TimeFormat = "12h" | "24h";
export type UserPreferences = { dateFormat: DateFormat; distanceUnit: DistanceUnit; timeFormat: TimeFormat };
export const defaultPreferences: UserPreferences = { dateFormat: "MM/DD/YYYY", distanceUnit: "km", timeFormat: "12h" };
export const dateFormats: DateFormat[] = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];
export const distanceUnits: DistanceUnit[] = ["km", "mi", "nm"];
export const timeFormats: TimeFormat[] = ["12h", "24h"];
export function normalizePreferences(input?: Partial<UserPreferences> | null): UserPreferences { return { dateFormat: dateFormats.includes(input?.dateFormat as DateFormat) ? input!.dateFormat as DateFormat : defaultPreferences.dateFormat, distanceUnit: distanceUnits.includes(input?.distanceUnit as DistanceUnit) ? input!.distanceUnit as DistanceUnit : defaultPreferences.distanceUnit, timeFormat: timeFormats.includes(input?.timeFormat as TimeFormat) ? input!.timeFormat as TimeFormat : defaultPreferences.timeFormat }; }
export function formatDistance(km: number, unit: DistanceUnit = "km") { const value = unit === "mi" ? km * 0.621371 : unit === "nm" ? km * 0.539957 : km; return `${Math.round(value).toLocaleString("en-US")} ${unit}`; }
