/** Server callers only. Airport reference credentials never replace Auth credentials. */
export class AirportConfigError extends Error {
  constructor(public readonly diagnosticCode: string) { super(diagnosticCode); }
}

export function resolveAirportConfig(env: Record<string, string | undefined>) {
  const url = env.AIRPORTS_SUPABASE_URL?.trim();
  const key = env.AIRPORTS_SUPABASE_PUBLISHABLE_KEY?.trim();
  if ((url && !key) || (key && !url)) throw new AirportConfigError("AIRPORT_CONFIG_INCOMPLETE");
  if (env.VERCEL_ENV === "preview" && (!url || !key)) throw new AirportConfigError("AIRPORT_PREVIEW_CONFIG_MISSING");
  const resolvedUrl = url || env.NEXT_PUBLIC_SUPABASE_URL;
  const resolvedKey = key || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!resolvedUrl || !resolvedKey) throw new AirportConfigError("AIRPORT_CONFIG_MISSING");
  let parsed: URL;
  try { parsed = new URL(resolvedUrl); } catch { throw new AirportConfigError("AIRPORT_URL_INVALID"); }
  const loopback = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(env.VERCEL !== "1" && loopback && parsed.protocol === "http:")) throw new AirportConfigError("AIRPORT_URL_REQUIRES_HTTPS");
  if (parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) throw new AirportConfigError("AIRPORT_URL_NOT_PROJECT_ROOT");
  let anonKey = resolvedKey.startsWith("sb_publishable_");
  if (!anonKey) {
    try { anonKey = JSON.parse(Buffer.from(resolvedKey.split(".")[1], "base64url").toString()).role === "anon"; } catch { /* fail closed */ }
  }
  if (!anonKey) throw new AirportConfigError("AIRPORT_KEY_TYPE_INVALID");
  return { url: resolvedUrl, key: resolvedKey };
}
