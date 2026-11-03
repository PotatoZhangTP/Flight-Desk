type AircraftCatalogRow = {
  alias_key: string;
  canonical_type_key?: string | null;
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

/** Resolve user/import input to the shared aircraft catalog's canonical key. */
export async function resolveAircraftCanonical(supabase: any, value: string | null | undefined) {
  const key = aircraftAliasKey(value);
  if (!key) return null;
  const { data } = await supabase.from("achievement_aircraft_type_aliases")
    .select("canonical_type_key,alias_key")
    .eq("is_active", true)
    .or(`alias_key.eq.${key},canonical_type_key.eq.${key}`)
    .limit(2);
  const row = (data ?? [])[0] as { canonical_type_key?: string | null } | undefined;
  return row?.canonical_type_key || null;
}

export function formatAircraftDisplayName(value: string | null | undefined, manufacturer?: string | null, displayMap?: Map<string, string>) {
  if (!value) return "—";
  const mapped = displayMap?.get(aircraftAliasKey(value) ?? "");
  if (mapped) return mapped;
  if (manufacturer === "boeing" && /^Boeing\s+\d/.test(value)) return value.replace(/^Boeing\s+(?=\d)/, "Boeing B");
  return value;
}
