const flags: Record<string, string> = { CN: "🇨🇳", US: "🇺🇸", GB: "🇬🇧", JP: "🇯🇵", FR: "🇫🇷" };

export function CountryFlag({ code }: { code?: string | null }) {
  const normalized = code?.trim().toUpperCase() || "";
  return <span aria-label={normalized ? `Country ${normalized}` : "Country unavailable"}>{flags[normalized] || (normalized ? normalized : "🌐")}</span>;
}
