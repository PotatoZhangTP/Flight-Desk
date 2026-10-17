"use client";
import { useText } from "./i18n";
import { isIsoAlpha2, normalizeCountryCode } from "@/lib/country-codes";
export function CountryFlag({ code }: { code?: string | null }) {
  const t = useText();
  const normalized = normalizeCountryCode(code);
  const valid = isIsoAlpha2(normalized);
  return <span className="country-flag" aria-label={valid ? t("airport.countryLabel", { code: normalized }) : t("Country unavailable")}>{valid ? <span className={`fi fi-${normalized.toLowerCase()}`} aria-hidden="true" /> : <span className="country-flag-fallback" aria-hidden="true">—</span>}</span>;
}
