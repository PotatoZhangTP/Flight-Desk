"use client";
import { T, useText } from "@/components/i18n";


import { useTheme } from "./theme-provider";
import { themeModes, type ThemeMode } from "@/lib/theme";

const labels = { light: "Light", dark: "Dark", system: "System" };
export function ThemeIcon({ mode }: { mode: ThemeMode }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{mode === "light" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : mode === "dark" ? <path d="M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z" /> : <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>}</svg>;
}
export function AppearanceSettings() {
  const t = useText();
  const { theme, setTheme } = useTheme();
  return <section aria-labelledby="appearance-title" className="mt-6 rounded-2xl border border-line bg-surface p-6"><h2 id="appearance-title" className="text-xl font-bold text-ink"><T id="settings.appearance" /></h2><p className="mt-2 text-sm leading-6 text-muted"><T id="settings.themeHelp" /></p><fieldset className="mt-5 grid gap-3 sm:grid-cols-3"><legend className="sr-only"><T id="settings.colorTheme" /></legend>{themeModes.map(mode => <label key={mode} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-semibold transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${theme === mode ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted hover:border-line-strong"}`}><input type="radio" name="appearance" value={mode} checked={theme === mode} onChange={() => setTheme(mode)} className="sr-only" /><ThemeIcon mode={mode} />{t(labels[mode])}</label>)}</fieldset></section>;
}
