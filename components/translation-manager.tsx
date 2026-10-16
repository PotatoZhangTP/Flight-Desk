"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { changeTranslation } from "@/app/admin/translations/actions";
import { AsyncButton } from "./async-button";
import { useAsyncOperation } from "./use-async-operation";
import { T, useText } from "./i18n";

type Entry = { key: string; en: string; zh: string; module: string; text: string; version: number | null; updatedAt: string | null; review: boolean };
export function TranslationManager({ entries, ready }: { entries: Entry[]; ready: boolean }) {
  const t = useText();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const { busy, run } = useAsyncOperation();
  const dirty = Object.keys(drafts).length > 0;
  useEffect(() => {
    if (!dirty) return;
    function unload(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    function leave(event: MouseEvent) {
      const anchor = (event.target as Element).closest?.("a[href]");
      if (anchor && !window.confirm(t("You have unsaved translation edits."))) { event.preventDefault(); event.stopPropagation(); }
    }
    window.addEventListener("beforeunload", unload); document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", leave, true); };
  }, [dirty, t]);
  const filtered = useMemo(() => entries.filter(entry => (!module || entry.module === module) && (!state || (state === "custom" ? entry.version !== null : state === "review" ? entry.review : entry.version === null)) && [entry.key, entry.en, entry.zh, entry.text, drafts[entry.key] ?? ""].some(value => value.toLocaleLowerCase().includes(search.toLocaleLowerCase()))), [entries, module, state, search, drafts]);
  async function save(entry: Entry, reset: boolean) {
    if (!ready || (reset && !window.confirm(t("Restore the default translation? Only this override will be removed.")))) return;
    await run(async () => {
      const result = await changeTranslation({ key: entry.key, text: drafts[entry.key] ?? entry.text, reset, version: entry.version, updatedAt: entry.updatedAt });
      if (result.error) { setMessage(result.error); return; }
      setDrafts(previous => { const next = { ...previous }; delete next[entry.key]; return next; });
      setMessage(reset ? "translations.resetDone" : "translations.saved");
      window.dispatchEvent(new Event("flightdesk-translations-updated"));
      router.refresh();
    }, () => setMessage("translations.failed"));
  }
  const input = "rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink";
  return <section className="mt-8">
    {!ready && <p role="alert" className="mb-5 rounded-xl bg-danger-bg p-4 text-danger-fg"><T id="translations.unavailable" /></p>}
    <p className="mb-4 text-sm text-muted"><T id="translations.englishReadOnly" /></p>
    <div className="grid gap-3 sm:grid-cols-3"><input aria-label={t("Search keys, English or Chinese")} placeholder={t("Search keys, English or Chinese")} className={input} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /><select aria-label={t("Module")} className={input} value={module} onChange={e => { setModule(e.target.value); setPage(0); }}><option value=""><T id="translations.allModules" /></option>{[...new Set(entries.map(entry => entry.module))].map(value => <option key={value} value={value}><T id={`modules.${value}`} source={value} /></option>)}</select><select aria-label={t("Translation status")} className={input} value={state} onChange={e => { setState(e.target.value); setPage(0); }}><option value=""><T id="translations.allStates" /></option><option value="custom"><T id="translations.customized" /></option><option value="default"><T id="translations.defaultState" /></option><option value="review"><T id="translations.review" /></option></select></div>
    <p role="status" className="my-4 text-sm text-brand">{message && <T id={message} />}{dirty && <> <T id="translations.unsaved" /></>}</p>
    <fieldset disabled={!ready || busy} className="space-y-5">{filtered.slice(page * 25, page * 25 + 25).map(entry => <article key={entry.key} className="min-w-0 rounded-2xl border border-line bg-surface p-5"><h2 className="break-all font-mono text-sm text-brand">{entry.key}</h2><p className="mt-2 text-xs text-muted"><T id={entry.review ? "translations.review" : entry.version === null ? "translations.defaultState" : "translations.customized"} /></p><div className="mt-4 grid gap-4 md:grid-cols-3"><div><h3 className="text-sm font-bold"><T id="translations.source" /></h3><p lang="en" className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">{entry.en}</p></div><div><h3 className="text-sm font-bold"><T id="translations.default" /></h3><p lang="zh-CN" className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">{entry.zh}</p></div><label className="text-sm font-bold"><T id="translations.current" /><textarea lang="zh-CN" aria-label={entry.key} maxLength={4000} className={`mt-2 min-h-24 w-full ${input}`} value={drafts[entry.key] ?? entry.text} onChange={e => setDrafts(previous => { const next = { ...previous }; if (e.target.value === entry.text) delete next[entry.key]; else next[entry.key] = e.target.value; return next; })} /></label></div><div className="mt-4 flex flex-wrap gap-3"><AsyncButton type="button" busy={busy} busyLabel={t("Saving…")} disabled={drafts[entry.key] === undefined} onClick={() => save(entry, false)} className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-brand disabled:opacity-50"><T id="translations.save" /></AsyncButton><button type="button" disabled={entry.version === null} onClick={() => save(entry, true)} className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-50"><T id="translations.reset" /></button></div></article>)}</fieldset>
    {!filtered.length && <p className="py-8 text-muted"><T id="translations.empty" /></p>}
    <div className="mt-6 flex items-center gap-4"><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)} aria-label={t("Previous page")} className={`${input} disabled:opacity-40`}>←</button><span className="text-sm text-muted">{page + 1} / {Math.max(1, Math.ceil(filtered.length / 25))}</span><button type="button" disabled={(page + 1) * 25 >= filtered.length} onClick={() => setPage(value => value + 1)} aria-label={t("Next page")} className={`${input} disabled:opacity-40`}>→</button></div>
  </section>;
}
