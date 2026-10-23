import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim().replace(/[^a-zA-Z0-9 ._-]/g, "").slice(0, 80) ?? "";
  let requestQuery = supabase
    .from("achievement_aircraft_type_aliases")
    .select("alias_key,canonical_type_key,display_name,manufacturer,manufacturer_family,simbrief_supported")
    .eq("is_active", true)
    .order("canonical_type_key")
    .limit(80);
  if (query) requestQuery = requestQuery.or(`alias_key.ilike.%${query}%,canonical_type_key.ilike.%${query}%,display_name.ilike.%${query}%,manufacturer_family.ilike.%${query}%`);
  const { data, error } = await requestQuery;
  if (error) return NextResponse.json({ error: "Aircraft catalog unavailable." }, { status: 500 });
  const grouped = new Map<string, { code: string; name: string; manufacturer: string | null; family: string | null; simbriefSupported: boolean; aliases: string[] }>();
  for (const row of data ?? []) {
    const current = grouped.get(row.canonical_type_key) ?? { code: row.canonical_type_key, name: row.display_name || row.canonical_type_key, manufacturer: row.manufacturer, family: row.manufacturer_family, simbriefSupported: Boolean(row.simbrief_supported), aliases: [] as string[] };
    if (row.alias_key !== row.canonical_type_key && current.aliases.length < 8) current.aliases.push(row.alias_key);
    grouped.set(row.canonical_type_key, current);
  }
  return NextResponse.json({ items: [...grouped.values()].slice(0, 40) }, { headers: { "Cache-Control": "private, max-age=60" } });
}
