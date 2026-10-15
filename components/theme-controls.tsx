"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "./theme-provider";
import { themeModes, type ThemeMode } from "@/lib/theme";

const labels = { light: "Light", dark: "Dark", system: "System" };
function ThemeIcon({ mode }: { mode: ThemeMode }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{mode === "light" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : mode === "dark" ? <path d="M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z" /> : <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>}</svg>;
}

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  return <section aria-labelledby="appearance-title" className="mt-6 rounded-2xl border border-line bg-surface p-6"><h2 id="appearance-title" className="text-xl font-bold text-ink">Appearance</h2><p className="mt-2 text-sm leading-6 text-muted">Choose your theme. System follows your device. Your choice is saved in this browser.</p><fieldset className="mt-5 grid gap-3 sm:grid-cols-3"><legend className="sr-only">Color theme</legend>{themeModes.map(mode => <label key={mode} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-semibold transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${theme === mode ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted hover:border-line-strong"}`}><input type="radio" name="appearance" value={mode} checked={theme === mode} onChange={() => setTheme(mode)} className="sr-only" /><ThemeIcon mode={mode} />{labels[mode]}</label>)}</fieldset></section>;
}

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }
    function dismiss() { setOpen(false); }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    window.addEventListener("resize", dismiss); window.addEventListener("scroll", dismiss, true);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", dismiss); window.removeEventListener("scroll", dismiss, true); };
  }, [open]);
  return <div ref={root} className="relative shrink-0"><button ref={trigger} type="button" aria-label="Choose color theme" aria-expanded={open} aria-controls="theme-choices" onClick={() => { const rect = trigger.current?.getBoundingClientRect(); if (rect) setPosition({ left: Math.max(12, Math.min(rect.right - 176, window.innerWidth - 188)), top: rect.bottom + 8 }); setOpen(value => !value); }} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-brand transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><ThemeIcon mode={theme} /></button>{open && <fieldset id="theme-choices" style={position} className="fixed z-50 w-44 rounded-xl border border-line bg-elevated p-2 shadow-lg shadow-ink/10"><legend className="sr-only">Color theme</legend>{themeModes.map(mode => <label key={mode} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-brand-soft focus-within:outline-2 focus-within:outline-brand"><input type="radio" name="navigation-theme" checked={theme === mode} onClick={() => { if (theme === mode) { setOpen(false); trigger.current?.focus(); } }} onChange={() => { setTheme(mode); setOpen(false); trigger.current?.focus(); }} className="accent-brand" /><ThemeIcon mode={mode} />{labels[mode]}</label>)}</fieldset>}</div>;
}
