"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { formatDateUTC, defaultDateFormat } from "@/lib/date-format";
import { defaultPreferences, normalizePreferences, type UserPreferences } from "@/lib/preferences";
import { baseMessages, byKey, localeCookie, normalizeLocale, sourceKeys, type Locale } from "@/lib/i18n/catalog";

const fallback = createTranslator({ locale: "en", messages: baseMessages("en") });
const Context = createContext({ locale: "en" as Locale, accountReady: false, preferences: defaultPreferences, setLocale: (_locale: Locale) => {}, setPreferences: (_preferences: UserPreferences) => {}, translate: (key: string, values?: Record<string, string | number>) => fallback(key.replaceAll(".", "__"), values) });

export function LanguageProvider({ initialLocale, overrides: initialOverrides, accountReady, initialPreferences = defaultPreferences, children }: { initialLocale: Locale; overrides: Record<string, string>; accountReady: boolean; initialPreferences?: UserPreferences; children: ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [preferences, updatePreferences] = useState(initialPreferences);
  const messages = useMemo(() => ({ ...baseMessages(locale), ...(locale === "zh-CN" ? Object.fromEntries(Object.entries(overrides).filter(([key]) => byKey[key]).map(([key, value]) => [key.replaceAll(".", "__"), value])) : {}) }), [locale, overrides]);
  const translator = useMemo(() => createTranslator({ locale, messages, onError: () => {}, getMessageFallback: ({ key }) => byKey[key.replaceAll("__", ".")]?.en ?? "Content unavailable" }), [locale, messages]);
  function setLocale(next: Locale) {
    updateLocale(next); document.documentElement.lang = next;
    document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    try { localStorage.setItem(localeCookie, next); } catch { /* Cookie remains the SSR source. */ }
  }
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    async function reload() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/translations", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const body = await response.json();
        if (live && body.ready && body.overrides && typeof body.overrides === "object") setOverrides(body.overrides);
      } catch { /* Keep the last known dictionary and user edits on network failure. */ }
    }
    const interval = setInterval(reload, 30000);
    window.addEventListener("focus", reload); window.addEventListener("flightdesk-translations-updated", reload);
    document.addEventListener("visibilitychange", reload);
    function storage(event: StorageEvent) { if (event.key === localeCookie && (event.newValue === "en" || event.newValue === "zh-CN")) setLocale(normalizeLocale(event.newValue)); }
    window.addEventListener("storage", storage);
    return () => { live = false; controller.abort(); clearInterval(interval); window.removeEventListener("focus", reload); window.removeEventListener("flightdesk-translations-updated", reload); window.removeEventListener("storage", storage); document.removeEventListener("visibilitychange", reload); };
  }, []);
  function setPreferences(next: UserPreferences) { const value = normalizePreferences(next); updatePreferences(value); try { localStorage.setItem("flightdesk-preferences", JSON.stringify(value)); } catch { /* Server state remains authoritative. */ } }
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("flightdesk-preferences") || "null"); if (saved) updatePreferences(normalizePreferences(saved)); } catch { /* Use server defaults. */ } }, []);
  return <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC"><Context.Provider value={{ locale, accountReady, preferences, setLocale, setPreferences, translate: (key, values) => translator(key.replaceAll(".", "__"), values) }}>{children}</Context.Provider></NextIntlClientProvider>;
}

export const useLanguage = () => useContext(Context);
export function useText() {
  const context = useLanguage();
  return (source: string, values?: Record<string, string | number>) => {
    const key = sourceKeys[source] ?? (byKey[source] ? source : undefined);
    return key ? context.translate(key, values) : source;
  };
}
export function T({ id, children, source, values }: { id?: string; children?: string; source?: string; values?: Record<string, string | number> }) {
  const context = useLanguage();
  const key = id ?? sourceKeys[source ?? children ?? ""];
  return <>{key && byKey[key] ? context.translate(key, values) : source ?? children ?? ""}</>;
}

/** CMS remains the English source of truth; Chinese copy is an independent UI layer. */
export function CmsText({ id, source }: { id: string; source: string }) {
  const { locale } = useLanguage();
  return locale === "en" ? <>{source}</> : <T id={id} />;
}

export function CmsFieldLabel({ label }: { label: string }) {
  return <>{label.split(" · ").map((part, index) => <span key={index}>{index > 0 && " · "}<T source={part} /></span>)}</>;
}

export function StatisticValue({ value }: { value: string }) {
  const t = useText();
  const hours = value.match(/^(\d+)h$/);
  return <>{hours ? t("common.hourValue", { hours: Number(hours[1]) }) : value}</>;
}

export function StatisticDetail({ value }: { value: string }) {
  const t = useText();
  const extra = value.match(/^(\d+)m additional$/);
  return <>{extra ? t("common.additionalMinutes", { minutes: Number(extra[1]) }) : <T source={value} />}</>;
}
export function LocalizedDate({ value, monthOnly = false }: { value: string; monthOnly?: boolean }) {
  const { preferences } = useLanguage();
  return <>{formatDateUTC(value, preferences.dateFormat || defaultDateFormat, monthOnly)}</>;
}

export function LocalizedDuration({ minutes, scheduled = false }: { minutes: number | null; scheduled?: boolean }) {
  const t = useText();
  if (minutes === null) return <T id="flight.pending" />;
  return <>{t(scheduled ? "flight.scheduledValue" : "flight.durationValue", { hours: Math.floor(minutes / 60), minutes: minutes % 60 })}</>;
}

/** Explicit UI error boundary; never use this for user-authored content. */
export function UiError({ message }: { message: string }) {
  const { locale } = useLanguage();
  const known = sourceKeys[message];
  return known ? <T id={known} /> : <>{locale === "en" ? message : <T id="common.requestError" />}</>;
}

export function LocalizedNav({ label, children, ...props }: { label: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  const t = useText();
  return <nav {...props} aria-label={t(label)}>{children}</nav>;
}

export function FlightDisplayValue({ label, value }: { label: string; value: string }) {
  if (label === "Scheduled duration" || label === "Actual duration") {
    const match = value.match(/^(\d+)h (\d+)m$/);
    if (match) return <LocalizedDuration minutes={Number(match[1]) * 60 + Number(match[2])} />;
  }
  return <>{value}</>;
}
