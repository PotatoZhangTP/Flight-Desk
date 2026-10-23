type AircraftCatalogRow = {
  alias_key: string;
  display_name: string | null;
  manufacturer: string | null;
};

export function aircraftAliasKey(value: string | null | undefined) {
  if (!value) return null;
  const key = value.trim().toUpperCase()
    .replaceAll("BOEING B", "B")
    .replaceAll("BOEING", "B")
    .replaceAll("AIRBUS A", "A")
    .replaceAll("AIRBUS", "A")
    .replace(/[^A-Z0-9]+/g, "");
  return key || null;
}

export async function loadAircraftDisplayMap(supabase: any, values: Array<string | null | undefined>) {
  const keys = [...new Set(values.map(aircraftAliasKey).filter((value): value is string => Boolean(value)))];
  if (!keys.length) return new Map<string, string>();
  const { data } = await supabase.from("achievement_aircraft_type_aliases")
    .select("alias_key,display_name,manufacturer")
    .eq("is_active", true).in("alias_key", keys);
  const result = new Map<string, string>();
  for (const row of (data ?? []) as AircraftCatalogRow[]) {
    if (row.display_name) result.set(row.alias_key, formatAircraftDisplayName(row.display_name, row.manufacturer));
  }
  return result;
}

export function formatAircraftDisplayName(value: string | null | undefined, manufacturer?: string | null, displayMap?: Map<string, string>) {
  if (!value) return "—";
  const mapped = displayMap?.get(aircraftAliasKey(value) ?? "");
  if (mapped) return mapped;
  if (manufacturer === "boeing" && /^Boeing\s+\d/.test(value)) return value.replace(/^Boeing\s+(?=\d)/, "Boeing B");
  return value;
}
