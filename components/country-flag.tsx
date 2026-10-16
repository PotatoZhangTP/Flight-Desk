"use client";
import { useText } from "./i18n";
export function CountryFlag({ code }: { code?: string | null }) {
  const t = useText();
  const normalized = code?.trim().toUpperCase() || "";
  const valid = /^[A-Z]{2}$/.test(normalized);
  const flag = valid ? String.fromCodePoint(...[...normalized].map((letter) => 127397 + letter.charCodeAt(0))) : "🌐";
  return <span aria-label={valid ? t("airport.countryLabel", { code: normalized }) : t("Country unavailable")}>{flag}</span>;
}
