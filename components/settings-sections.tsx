"use client";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { T } from "@/components/i18n";
const sections = ["general", "account", "flight-preferences"] as const;
type Section = typeof sections[number];
function valid(value: string | null): Section { return sections.includes(value as Section) ? value as Section : "general"; }
export function SettingsSections({ general, account, flightPreferences }: { general: ReactNode; account: ReactNode; flightPreferences: ReactNode }) {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams(); const active = valid(params.get("section"));
  function select(section: Section) { const next = new URLSearchParams(params.toString()); if (section === "general") next.delete("section"); else next.set("section", section); router.push(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false }); }
  const labels: Record<Section, string> = { general: "settings.general", account: "settings.account", "flight-preferences": "settings.flightPreferences" };
  const content: Record<Section, ReactNode> = { general, account, "flight-preferences": flightPreferences };
  return <div className="mt-8 grid gap-6 lg:grid-cols-[180px_1fr]"><nav aria-label="Settings Categories" className="flex gap-2 overflow-x-auto rounded-2xl border border-line bg-surface p-2 lg:block lg:space-y-1 lg:overflow-visible">{sections.map(section => <button key={section} type="button" onClick={() => select(section)} aria-current={active === section ? "page" : undefined} className={`shrink-0 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand ${active === section ? "bg-brand-soft font-bold text-brand" : "text-muted"}`}><T id={labels[section]} /></button>)}</nav><div className="min-w-0">{content[active]}</div></div>;
}
