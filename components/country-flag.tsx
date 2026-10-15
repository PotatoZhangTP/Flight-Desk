export function CountryFlag({ code }: { code?: string | null }) {
  const normalized = code?.trim().toUpperCase() || "";
  const valid = /^[A-Z]{2}$/.test(normalized);
  const flag = valid ? String.fromCodePoint(...[...normalized].map((letter) => 127397 + letter.charCodeAt(0))) : "🌐";
  return <span aria-label={valid ? `Country ${normalized}` : "Country unavailable"}>{flag}</span>;
}
