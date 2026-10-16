"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveDynamicTranslation, backfillDynamicTranslations } from "@/app/admin/translations/content-actions";
import { currentContentSource, roadmapTranslationFields, resolveContentText, type ContentTranslation, type ContentField } from "@/lib/content-translations/model";
import type { RoadmapItem } from "@/lib/roadmap/model";
import { T, useText } from "./i18n";
import { AsyncButton } from "./async-button";
import { useAsyncOperation } from "./use-async-operation";

export function TranslationStatus({ row }: { row?: ContentTranslation }) {
  const key = !row ? "notQueued" : row.translation_status === "outdated" ? "outdated" : row.translation_source === "manual" ? "manual" : row.translation_status;
  return <span className="rounded-full border border-line bg-surface-muted px-2 py-1 text-xs text-muted"><T id={`dynamic.${key}`} /></span>;
}

export function RoadmapTranslationEditor({ item, active, onDirtyChange }: { item: RoadmapItem; active: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const t = useText();
  const dirtyFields = useRef(new Set<string>());
  const [dirty, setDirty] = useState(false);
  const reportDirty = useCallback((field: string, value: boolean) => { if (value) dirtyFields.current.add(field); else dirtyFields.current.delete(field); const next = dirtyFields.current.size > 0; setDirty(next); onDirtyChange(next); }, [onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    function unload(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    function leave(event: MouseEvent) { if ((event.target as Element).closest?.("a[href]") && !window.confirm(t("dynamic.discard"))) { event.preventDefault(); event.stopPropagation(); } }
    window.addEventListener("beforeunload", unload); document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", leave, true); };
  }, [dirty, t]);
  const [rows, setRows] = useState(item.translations ?? []);
  const [ready, setReady] = useState(item.translationsReady === true);
  const reload = useCallback(async () => {
    try {
      const response = await fetch(`/api/content-translations?admin=1&ids=${encodeURIComponent(item.id)}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!response.ok) return null;
      const body = await response.json();
      if (!body.ready || !Array.isArray(body.rows)) { setReady(false); return null; }
      setRows(body.rows); setReady(true); return body.rows as ContentTranslation[];
    } catch { return null; }
  }, [item.id]);
  useEffect(() => {
    if (!active) return;
    void reload(); const timer = setInterval(() => { if (document.visibilityState !== "hidden") void reload(); }, 10000);
    return () => clearInterval(timer);
  }, [active, reload]);
  return <section className="mt-6 space-y-5" aria-label={t("dynamic.title")}>
    <p className="text-sm leading-6 text-muted"><T id="dynamic.help" /></p>
    {!ready && <p role="alert" className="rounded-xl bg-danger-bg p-4 text-sm text-danger-fg"><T id="dynamic.migration" /></p>}
    {roadmapTranslationFields.map(field => <TranslationField key={`${item.id}:${field}`} item={item} field={field} ready={ready} row={rows.find(row => row.field_name === field && row.locale === "zh-CN")} reload={reload} reportDirty={reportDirty} />)}
  </section>;
}

function TranslationField({ item, field, row, ready, reload, reportDirty }: { item: RoadmapItem; field: ContentField; row?: ContentTranslation; ready: boolean; reload: () => Promise<ContentTranslation[] | null>; reportDirty: (field: string, dirty: boolean) => void }) {
  const t = useText();
  const source = currentContentSource(item[field], item.updated_at, row);
  const [snapshot, setSnapshot] = useState({ text: row?.translated_text ?? "", source, generation: row?.generation ?? null });
  const [draft, setDraft] = useState(snapshot.text);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState("zh-CN");
  const { busy, run } = useAsyncOperation();
  const dirty = draft !== snapshot.text;
  useEffect(() => { if (!dirty) { const text = row?.translated_text ?? ""; setSnapshot({ text, source, generation: row?.generation ?? null }); setDraft(text); } }, [row?.generation, source]); // Retain dirty snapshots so stale saves conflict instead of overwriting.
  useEffect(() => { reportDirty(field, dirty); return () => reportDirty(field, false); }, [field, dirty, reportDirty]);
  async function mutate(regenerate: boolean) {
    if (regenerate && dirty && !window.confirm(t("dynamic.discard"))) return;
    if (regenerate && !window.confirm(t(row?.translation_source === "manual" ? "dynamic.confirmManual" : "dynamic.confirmRegenerate"))) return;
    await run(async () => {
      setMessage("");
      const result = await saveDynamicTranslation({ entityId: item.id, field, locale: "zh-CN", text: draft, expectedSource: snapshot.source, generation: snapshot.generation, regenerate, confirmManual: regenerate && row?.translation_source === "manual" });
      if (result.error) { setMessage(result.error); return; }
      const latest = await reload(), saved = latest?.find(value => value.field_name === field && value.locale === "zh-CN");
      if (saved) { const text = saved.translated_text ?? ""; setSnapshot({ text, source: saved.source_text, generation: saved.generation }); setDraft(text); setMessage(regenerate ? "dynamic.queued" : "dynamic.saved"); }
      else setMessage("dynamic.failedRequest");
    }, () => setMessage("dynamic.failedRequest"));
  }
  async function reloadField() {
    if (dirty && !window.confirm(t("dynamic.discard"))) return;
    const latest = await reload(); if (!latest) { setMessage("dynamic.failedRequest"); return; }
    const fresh = latest.find(value => value.field_name === field && value.locale === "zh-CN");
    const text = fresh?.translated_text ?? ""; setSnapshot({ text, source: fresh?.source_text ?? source, generation: fresh?.generation ?? null }); setDraft(text); setMessage("");
  }
  return <article className="min-w-0 rounded-xl border border-line bg-surface p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold"><T id={`dynamic.field_${field}`} /></h3><TranslationStatus row={row} /></div>
    {row?.translation_status === "outdated" && <p className="mt-3 text-sm text-brand"><T id={row.translation_source === "manual" ? "dynamic.manualOutdated" : "dynamic.autoOutdated"} /></p>}
    <p className="mt-4 text-xs font-semibold text-muted"><T id="dynamic.original" /></p><p lang="en" className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">{source || "—"}</p>
    <fieldset disabled={!ready || busy} className="mt-4"><label className="text-sm font-semibold"><T id="dynamic.chinese" /><textarea lang="zh-CN" aria-label={`zh-CN ${field}`} value={draft} onChange={event => { setDraft(event.target.value); setMessage(""); }} maxLength={12000} rows={field === "description" ? 5 : 2} className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink" /></label>
      <div className="mt-3 flex flex-wrap gap-3"><AsyncButton type="button" busy={busy} busyLabel={t("Saving…")} disabled={!dirty} onClick={() => mutate(false)} className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-brand disabled:opacity-50"><T id="dynamic.saveManual" /></AsyncButton><AsyncButton type="button" busy={busy} busyLabel={t("Saving…")} onClick={() => mutate(true)} className="rounded-full border border-line px-4 py-2 text-sm"><T id="dynamic.regenerate" /></AsyncButton><button type="button" onClick={reloadField} className="rounded-full border border-line px-4 py-2 text-sm"><T id="dynamic.reload" /></button></div>
    </fieldset>
    <p role="status" className="mt-3 text-sm text-brand">{message && <T id={message} />}{dirty && <> <T id="translations.unsaved" /></>}</p>
    {row?.error_code && <p className="mt-2 break-words font-mono text-xs text-muted">{row.error_code}</p>}
    <div className="mt-4 rounded-xl bg-surface-muted p-4"><label className="flex flex-wrap items-center gap-3 text-xs font-semibold"><T id="dynamic.preview" /><select aria-label={t("dynamic.preview")} value={preview} onChange={event => setPreview(event.target.value)} className="rounded border border-line bg-surface px-2 py-1"><option value="en">English</option><option value="zh-CN">简体中文</option></select></label><p lang={preview} className="mt-3 whitespace-pre-wrap break-words text-sm">{resolveContentText(source, row, preview) || "—"}</p></div>
  </article>;
}

export function TranslationBackfill() {
  const t = useText(), router = useRouter();
  const [cursor, setCursor] = useState<string | null>(null), [message, setMessage] = useState("");
  const [counts, setCounts] = useState({ processed: 0, changed: 0 });
  const { busy, run } = useAsyncOperation();
  return <div id="dynamic-translations" className="mt-6 rounded-xl border border-line p-4"><h2 className="font-bold"><T id="dynamic.title" /></h2><p className="mt-2 text-sm text-muted"><T id="dynamic.backfillHelp" /></p><AsyncButton type="button" busy={busy} busyLabel={t("Saving…")} onClick={() => {
    if (!window.confirm(t("dynamic.confirmBackfill"))) return;
    void run(async () => { const result = await backfillDynamicTranslations(cursor); if (result.error) { setMessage(result.error); return; } setCursor(result.nextCursor ?? null); setCounts({ processed: result.processed ?? 0, changed: result.changed ?? 0 }); setMessage(result.nextCursor ? "dynamic.backfillMore" : "dynamic.backfillDone"); router.refresh(); }, () => setMessage("dynamic.failedRequest"));
  }} className="mt-3 rounded-full border border-line px-4 py-2 text-sm font-bold"><T id={cursor ? "dynamic.continueBackfill" : "dynamic.backfill"} /></AsyncButton><p role="status" className="mt-3 text-sm text-muted">{message && <><T id={message} /> <T id="dynamic.backfillCounts" values={counts} /></>}</p></div>;
}
