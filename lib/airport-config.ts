/** Server callers only. Airport reference credentials never replace Auth credentials. */
export function resolveAirportConfig(env: Record<string, string | undefined>) {
  const url = env.AIRPORTS_SUPABASE_URL?.trim();
  const key = env.AIRPORTS_SUPABASE_PUBLISHABLE_KEY?.trim();
  if ((url && !key) || (key && !url)) throw new Error("Airport reference configuration is incomplete");
  if (env.VERCEL_ENV === "preview" && (!url || !key)) throw new Error("Configure the Preview airport reference project");
  const resolvedUrl = url || env.NEXT_PUBLIC_SUPABASE_URL;
  const resolvedKey = key || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!resolvedUrl || !resolvedKey) throw new Error("Airport search is not configured");
  const parsed = new URL(resolvedUrl);
  const loopback = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(env.VERCEL !== "1" && loopback && parsed.protocol === "http:")) throw new Error("Airport reference requires HTTPS");
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("Invalid airport project URL");
  let anonKey = resolvedKey.startsWith("sb_publishable_");
  if (!anonKey) {
    try { anonKey = JSON.parse(Buffer.from(resolvedKey.split(".")[1], "base64url").toString()).role === "anon"; } catch { /* fail closed */ }
  }
  if (!anonKey) throw new Error("Use a publishable or legacy anon key for airport reads");
  return { url: resolvedUrl, key: resolvedKey };
}
