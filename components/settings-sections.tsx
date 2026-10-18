"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { T } from "@/components/i18n";

const sections = ["general", "account", "flight-preferences"] as const;
type Section = typeof sections[number];

function valid(value: string | null): Section {
  return sections.includes(value as Section) ? value as Section : "general";
}

function sectionUrl(section: Section) {
  const next = new URLSearchParams(window.location.search);
  if (section === "general") next.delete("section");
  else next.set("section", section);
  return `${window.location.pathname}${next.toString() ? `?${next}` : ""}${window.location.hash}`;
}

export function SettingsSections({ general, account, flightPreferences }: { general: ReactNode; account: ReactNode; flightPreferences: ReactNode }) {
  const params = useSearchParams();
  const [active, setActive] = useState<Section>(() => valid(params.get("section")));
  const labels: Record<Section, string> = { general: "settings.general", account: "settings.account", "flight-preferences": "settings.flightPreferences" };
  const content: Record<Section, ReactNode> = { general, account, "flight-preferences": flightPreferences };

  useEffect(() => {
    const updateFromHistory = () => setActive(valid(new URLSearchParams(window.location.search).get("section")));
    window.addEventListener("popstate", updateFromHistory);
    return () => window.removeEventListener("popstate", updateFromHistory);
  }, []);

  function select(section: Section) {
    if (section === active) return;
    setActive(section);
    window.history.pushState(null, "", sectionUrl(section));
  }

  return <div className="mt-8 grid gap-6 lg:grid-cols-[180px_1fr]">
    <nav aria-label="Settings Categories" role="tablist" aria-orientation="vertical" className="flex gap-2 overflow-x-auto rounded-2xl border border-line bg-surface p-2 lg:block lg:space-y-1 lg:overflow-visible">
      {sections.map(section => <button key={section} id={`settings-tab-${section}`} role="tab" type="button" onClick={() => select(section)} aria-selected={active === section} aria-controls={`settings-panel-${section}`} className={`shrink-0 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-150 hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand ${active === section ? "bg-brand-soft font-bold text-brand" : "text-muted"}`}><T id={labels[section]} /></button>)}
    </nav>
    <div className="min-w-0">
      {sections.map(section => <section key={section} id={`settings-panel-${section}`} role="tabpanel" aria-labelledby={`settings-tab-${section}`} hidden={active !== section} className="settings-content-enter">{content[section]}</section>)}
    </div>
  </div>;
}
