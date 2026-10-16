"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { T, useText } from "./i18n";
import { LanguageSelector } from "./language-selector";
import { ThemeIcon } from "./theme-controls";
import { useTheme } from "./theme-provider";
import { themeModes } from "@/lib/theme";

/** One entry point; existing providers still own language/theme persistence. */
export function PreferencesMenu() {
  const id = useId();
  const t = useText();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  useEffect(() => { panel.current?.hidePopover(); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const dismiss = () => panel.current?.hidePopover();
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss);
    return () => { window.removeEventListener("resize", dismiss); window.removeEventListener("scroll", dismiss); };
  }, [open]);
  return <div className="preferences-menu shrink-0">
    <button ref={trigger} type="button" popoverTarget={id} aria-label={t("preferences.open")} title={t("preferences.open")} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => {
      const rect = trigger.current?.getBoundingClientRect();
      if (rect) setPosition({ left: Math.max(12, Math.min(rect.right - 320, window.innerWidth - 332)), top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 350)) });
    }} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-brand transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5"><path d="m9.5 3-.6 2.2-2 .9-2-.7-2.4 4.2 1.6 1.5v2.2l-1.6 1.5 2.4 4.2 2-.7 2 .9.6 2.2h5l.6-2.2 2-.9 2 .7 2.4-4.2-1.6-1.5v-2.2l1.6-1.5-2.4-4.2-2 .7-2-.9-.6-2.2Z" strokeLinejoin="round" /><circle cx="12" cy="12" r="3.3" /></svg>
    </button>
    <div ref={panel} id={id} popover="auto" role="dialog" aria-labelledby={`${id}-title`} tabIndex={-1} onToggle={event => setOpen(event.newState === "open")} style={position} className="preferences-panel rounded-2xl border border-line bg-elevated p-5 text-ink shadow-xl shadow-ink/10">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 id={`${id}-title`} className="text-base font-bold"><T id="preferences.title" /></h2><button type="button" popoverTarget={id} popoverTargetAction="hide" aria-label={t("preferences.close")} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-brand-soft"><span aria-hidden="true">×</span></button></div>
      <fieldset><legend className="mb-2 text-sm font-semibold"><T id="settings.appearance" /></legend><div className="grid grid-cols-3 gap-2">{themeModes.map(mode => <label key={mode} className={`flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border px-1 py-3 text-xs font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${theme === mode ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:bg-brand-soft"}`}><input type="radio" name={`${id}-theme`} value={mode} checked={theme === mode} onChange={() => setTheme(mode)} className="sr-only" /><ThemeIcon mode={mode} /><T source={{ light: "Light", dark: "Dark", system: "System" }[mode]} /></label>)}</div></fieldset>
      <section aria-labelledby={`${id}-language`} className="mt-5 border-t border-line pt-4"><h3 id={`${id}-language`} className="mb-3 flex items-center gap-2 text-sm font-semibold"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5 text-brand"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 6.5h14M5 17.5h14" /></svg><T id="language.label" /></h3><LanguageSelector feedback /></section>
    </div>
  </div>;
}
