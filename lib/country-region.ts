import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCountryCode } from "@/lib/country-codes";

export type CountryRegionMapping = {
  original_code: string;
  target_code: string;
  is_active?: boolean;
};

export function displayCountryCode(value: string | null | undefined, mappings: readonly CountryRegionMapping[] = []) {
  let code = normalizeCountryCode(value);
  const seen = new Set<string>();
  while (/^[A-Z]{2}$/.test(code) && !seen.has(code)) {
    seen.add(code);
    const mapping = mappings.find(item => item.is_active !== false && item.original_code === code);
    if (!mapping || mapping.target_code === code) break;
    code = normalizeCountryCode(mapping.target_code);
  }
  return code;
}

export function displayCountryName(value: string | null | undefined, mappings: readonly CountryRegionMapping[] = []) {
  const code = displayCountryCode(value, mappings);
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code; } catch { return code; }
}

export async function loadCountryMappings(supabase: SupabaseClient): Promise<CountryRegionMapping[]> {
  const { data } = await supabase.from("country_region_mappings").select("original_code,target_code,is_active").eq("is_active", true).order("original_code");
  return (data ?? []) as CountryRegionMapping[];
}

export async function displayFlightEndpointCountries(supabase: SupabaseClient, flight: Record<string, unknown>) {
  const mappings = await loadCountryMappings(supabase);
  const codes = [...new Set(["departure", "arrival"].flatMap(side => [flight[`${side}_airport_icao`], flight[`${side}_airport_iata`], flight[`${side}_airport`]]).filter(value => typeof value === "string" && value.trim()).map(value => String(value).trim().toUpperCase()))];
  const [icao, iata, ident] = codes.length ? await Promise.all([
    supabase.from("airports").select("icao_code,iata_code,ident,country_code").in("icao_code", codes),
    supabase.from("airports").select("icao_code,iata_code,ident,country_code").in("iata_code", codes),
    supabase.from("airports").select("icao_code,iata_code,ident,country_code").in("ident", codes),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  const airportCountries = new Map<string, string>();
  for (const row of [...(icao.data ?? []), ...(iata.data ?? []), ...(ident.data ?? [])]) for (const key of [row.icao_code, row.iata_code, row.ident]) if (key) airportCountries.set(String(key).toUpperCase(), String(row.country_code || ""));
  const endpoint = (side: "departure" | "arrival") => {
    const code = [flight[`${side}_airport_icao`], flight[`${side}_airport_iata`], flight[`${side}_airport`]].find(value => typeof value === "string" && value.trim());
    return displayCountryCode(airportCountries.get(String(code || "").trim().toUpperCase()) || String(flight[`${side}_country_code`] || ""), mappings);
  };
  return { mappings, departure: endpoint("departure"), arrival: endpoint("arrival") };
}
