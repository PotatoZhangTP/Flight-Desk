"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLanguage } from "./i18n";
import type { RoadmapItem } from "@/lib/roadmap/model";
import { currentContentSource, resolveContentText, type ContentField, type ContentTranslation } from "@/lib/content-translations/model";

const Rows = createContext<ContentTranslation[] | null>(null);
export function RoadmapContentScope({ items, children }: { items: RoadmapItem[]; children: ReactNode }) {
  const initial = items.flatMap(item => item.translations ?? []);
  const revision = initial.map(row => row.generation).join(",");
  const ids = items.map(item => item.id).sort().join(",");
  const [rows, setRows] = useState(initial);
  const { locale } = useLanguage();
  useEffect(() => { setRows(initial); }, [revision, ids]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (locale === "en" || !ids) return;
    const controller = new AbortController(); let busy = false;
    async function reload() {
      if (document.visibilityState === "hidden" || busy) return;
      busy = true;
      try {
        const all: ContentTranslation[] = [], list = ids.split(",");
        for (let index = 0; index < list.length; index += 100) {
          const response = await fetch(`/api/content-translations?locale=${encodeURIComponent(locale)}&ids=${encodeURIComponent(list.slice(index, index + 100).join(","))}`, { signal: controller.signal, cache: "no-store" });
          if (!response.ok) return;
          const body = await response.json(); if (!body.ready || !Array.isArray(body.rows)) return; all.push(...body.rows);
        }
        if (!controller.signal.aborted) setRows(all);
      } catch { /* English/last loaded manual copy remains available offline. */ }
      finally { busy = false; }
    }
    const timer = setInterval(reload, 300000);
    window.addEventListener("focus", reload); document.addEventListener("visibilitychange", reload);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", reload); document.removeEventListener("visibilitychange", reload); };
  }, [ids, locale]);
  return <Rows.Provider value={rows}>{children}</Rows.Provider>;
}
export function RoadmapContentText({ item, field }: { item: RoadmapItem; field: ContentField }) {
  const rows = useContext(Rows), { locale } = useLanguage();
  const row = (rows ?? item.translations ?? []).find(row => row.entity_id === item.id && row.field_name === field && row.locale === locale);
  return <>{resolveContentText(currentContentSource(item[field], item.updated_at, row), row, locale)}</>;
}
