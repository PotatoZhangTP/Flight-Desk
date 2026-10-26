import { createClient } from "@supabase/supabase-js";
import { airportFromRow } from "@/lib/airports";
import { AirportConfigError, resolveAirportConfig } from "@/lib/airport-config";
import { displayCountryCode, displayCountryName, loadCountryMappings } from "@/lib/country-region";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  const headers = { "Cache-Control": "no-store" };
  // Successful airport reference results are public and identical for all users.
  const successHeaders = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" };
  if (query.length > 80 || /[\u0000-\u001f\u007f]/.test(query)) return Response.json({ error: "Use a search between 2 and 80 characters." }, { status: 400, headers });
  if (query.length < 2 || !/[\p{L}\p{N}]/u.test(query)) return Response.json({ airports: [] }, { headers });
  // Whitelisted categories only: never expose upstream messages, headers or values.
  const unavailable = (diagnosticCode: string, upstream?: { status: number; code?: string }) => Response.json({
    error: "Airport search is unavailable. Try again or enter an airport manually.",
    diagnosticCode,
    upstreamStatus: upstream && Number.isInteger(upstream.status) && upstream.status >= 0 && upstream.status <= 599 ? upstream.status : null,
    upstreamCode: upstream?.code && /^(?:PGRST\d{3}|[A-Z0-9]{5})$/.test(upstream.code) ? upstream.code : null,
    build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
  }, { status: 503, headers });
  let stage = "configuration";
  try {
    const config = resolveAirportConfig(process.env);
    stage = "client";
    // Anonymous, stateless reference client, separate from the user's Auth session.
    const client = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    stage = "rpc";
    const { data, error, status } = await client.rpc("search_airports", { search_query: query, result_limit: 12 })
      .abortSignal(AbortSignal.any([request.signal, AbortSignal.timeout(5000)]));
    if (error) {
      const failure = (code: string) => unavailable(code, { status, code: error.code });
      if (status === 401 || error.code === "PGRST301" || error.code === "PGRST303") return failure("AIRPORT_KEY_REJECTED");
      if (error.code === "PGRST202") return failure("AIRPORT_RPC_NOT_FOUND");
      if (error.code === "PGRST106") return failure("AIRPORT_SCHEMA_NOT_EXPOSED");
      if (error.code === "42501" || status === 403) return failure("AIRPORT_PERMISSION_DENIED");
      if (error.code === "57014") return failure("AIRPORT_QUERY_TIMEOUT");
      if (!status || status === 0) return failure("AIRPORT_CONNECTION_FAILED");
      return failure("AIRPORT_UPSTREAM_REQUEST_FAILED");
    }
    stage = "response";
    if (!Array.isArray(data)) return unavailable("AIRPORT_RESPONSE_INVALID");
    const mappings = await loadCountryMappings(client);
    return Response.json({ airports: data.slice(0, 12).map(row => airportFromRow({ ...row, country_code: displayCountryCode(row.country_code, mappings), country_name: displayCountryName(row.country_code, mappings) })) }, { headers: successHeaders });
  } catch (error) {
    if (error instanceof AirportConfigError) return unavailable(error.diagnosticCode);
    return unavailable(stage === "response" ? "AIRPORT_RESPONSE_INVALID" : "AIRPORT_CONNECTION_FAILED");
  }
}
