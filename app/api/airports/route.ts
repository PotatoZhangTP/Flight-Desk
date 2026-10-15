import { createClient } from "@supabase/supabase-js";
import { airportFromRow } from "@/lib/airports";
import { resolveAirportConfig } from "@/lib/airport-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  const headers = { "Cache-Control": "no-store" };
  if (query.length > 80 || /[\u0000-\u001f\u007f]/.test(query)) return Response.json({ error: "Use a search between 2 and 80 characters." }, { status: 400, headers });
  if (query.length < 2 || !/[\p{L}\p{N}]/u.test(query)) return Response.json({ airports: [] }, { headers });
  try {
    const config = resolveAirportConfig(process.env);
    // Anonymous, stateless reference client, separate from the user's Auth session.
    const client = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.rpc("search_airports", { search_query: query, result_limit: 12 })
      .abortSignal(AbortSignal.any([request.signal, AbortSignal.timeout(5000)]));
    if (error || !Array.isArray(data)) throw new Error("Reference lookup failed");
    return Response.json({ airports: data.slice(0, 12).map(airportFromRow) }, { headers });
  } catch {
    return Response.json({ error: "Airport search is unavailable. Try again or enter an airport manually." }, { status: 503, headers });
  }
}
