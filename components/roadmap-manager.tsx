"use client";
import { T, useText, LocalizedDate, UiError } from "@/components/i18n";


import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRoadmap, saveRoadmap } from "@/app/admin/roadmap/actions";
import { filterRoadmapItems, formatRoadmapDate, sortRoadmapItems, statuses, statusLabels, statusStyles, type RoadmapFilter, type RoadmapItem, type RoadmapSort } from "@/lib/roadmap/model";
import { AsyncButton } from "./async-button";
import { RoadmapTranslationEditor, TranslationBackfill, TranslationStatus } from "./roadmap-translation-editor";
import { RoadmapSortControl } from "./roadmap-controls";

const inputClass = "mt-2 w-full rounded-xl border border-line-strong bg-surface px-3 py-3 text-sm font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-line-strong";
const buttonClass = "rounded-full bg-brand px-5 py-3 text-sm font-bold text-on-brand transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60";

export function RoadmapManager({ items, today }: { items: RoadmapItem[]; today: string }) {
  const t = useText();
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [editorLocale, setEditorLocale] = useState("en");
  const [translationDirty, setTranslationDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  const [operation, setOperation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<RoadmapFilter>("all");
  const [sort, setSort] = useState<RoadmapSort>("target_closest");
  const editor = useRef<HTMLDivElement>(null);
  function openEditor(id: string) {
    if (id !== editing && translationDirty && !window.confirm(t("dynamic.discard"))) return;
    if (id !== editing) setTranslationDirty(false);
    setEditing(id); setEditorLocale("en"); setError(""); setMessage("");
    // Wait until the editor is mounted before moving keyboard focus into it.
    requestAnimationFrame(() => { editor.current?.scrollIntoView({ block: "start", behavior: "instant" }); editor.current?.querySelector<HTMLInputElement>('input[name="title"]')?.focus({ preventScroll: true }); });
  }
  function submit(form: FormData) {
    if (translationDirty && !window.confirm(t("dynamic.discard"))) return;
    if (pending || locked.current) return;
    locked.current = true; setOperation("save");
    setError(""); setMessage("");
    startTransition(async () => {
      try {
        const result = await saveRoadmap(form);
        if (result.error) { setError(result.error); return; }
        setMessage(result.success ?? "Saved."); setEditing(null); router.refresh();
      } catch { setError("The save could not be confirmed. Check the item before retrying."); }
      finally { locked.current = false; }
    });
  }
  function remove(item: RoadmapItem) {
    if (pending || locked.current || !window.confirm(t("admin.deleteConfirm", { title: item.title }))) return;
    setError(""); setMessage("");
    locked.current = true; setOperation(item.id);
    startTransition(async () => {
      try {
        const result = await deleteRoadmap(item.id);
        if (result.error) { setError(result.error); return; }
        setMessage(result.success ?? "Deleted."); if (editing === item.id) setEditing(null); router.refresh();
      } catch { setError("The delete could not be confirmed. Refresh to check the item before retrying."); }
      finally { locked.current = false; }
    });
  }
  const selected = items.find(item => item.id === editing);
  const visible = sortRoadmapItems(filterRoadmapItems(items, filter), sort, today);
  return <div className="mt-10">
    <TranslationBackfill />
    <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted"><T id="roadmap.summaryCounts" values={{ total: items.length, drafts: items.filter(item => item.publication_status === "draft").length, published: items.filter(item => item.publication_status === "published").length }} /></p><button type="button" disabled={pending} onClick={() => openEditor("new")} className={buttonClass}><T id="admin.newItemButton" /></button></div>
    <div aria-live="polite" aria-atomic="true">{message && <p role="status" className="mt-5 rounded-xl bg-brand-soft p-4 text-sm text-completed-fg"><UiError message={message} /></p>}{error && <p role="alert" className="mt-5 rounded-xl bg-danger-bg p-4 text-sm text-danger-fg"><UiError message={error} /></p>}</div>
    {editing && <div ref={editor} className="mt-6 scroll-mt-6 rounded-2xl border border-line-strong bg-surface p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-bold"><T source={editing === "new" ? "New roadmap item" : "Edit roadmap item"} /></h2><p className="mt-2 text-sm leading-6 text-muted"><T id="admin.draftHelp" /></p>
      {selected && <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={t("dynamic.editLanguage")}><button type="button" aria-pressed={editorLocale === "en"} onClick={() => setEditorLocale("en")} className="rounded-full border border-line px-4 py-2 text-sm"><T id="dynamic.original" /></button><button type="button" aria-pressed={editorLocale === "zh-CN"} onClick={() => setEditorLocale("zh-CN")} className="rounded-full border border-line px-4 py-2 text-sm"><T id="dynamic.chinese" /></button></div>}
      <div hidden={editorLocale !== "en"}><form key={editing} onSubmit={event => { event.preventDefault(); submit(new FormData(event.currentTarget)); }} className="mt-6">
        <fieldset disabled={pending} className="space-y-5 disabled:opacity-70">
          <input type="hidden" name="id" value={selected?.id ?? ""} />
          <label className="block text-sm font-semibold"><T id="admin.featureName" /><input required name="title" lang="en" maxLength={160} defaultValue={selected?.title ?? ""} className={inputClass} /></label>
          <label className="block text-sm font-semibold"><T id="admin.description" /><textarea name="description" lang="en" maxLength={5000} rows={4} defaultValue={selected?.description ?? ""} className={inputClass} /></label>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm font-semibold"><T id="admin.category" /><input required name="category" lang="en" maxLength={80} defaultValue={selected?.category ?? "Platform"} className={inputClass} /></label>
            <label className="block text-sm font-semibold"><T id="admin.status" /><select name="status" defaultValue={selected?.status ?? "planned"} className={inputClass}>{statuses.map(status => <option key={status} value={status}><T source={statusLabels[status]} /></option>)}</select></label>
            <label className="block text-sm font-semibold"><T id="admin.visibility" /><select name="publication_status" defaultValue={selected?.publication_status ?? "draft"} className={inputClass}><option value="draft"><T id="admin.privateDraft" /></option><option value="published"><T id="admin.publicPublished" /></option></select></label>
            <label className="block text-sm font-semibold"><T id="admin.priority" /><select name="priority" defaultValue={selected?.priority ?? ""} className={inputClass}><option value=""><T id="admin.unspecified" /></option><option value="low"><T id="admin.low" /></option><option value="medium"><T id="admin.medium" /></option><option value="high"><T id="admin.high" /></option></select></label>
            <label className="block text-sm font-semibold"><T id="admin.targetDate" /><input type="date" name="target_date" defaultValue={selected?.target_date ?? ""} className={inputClass} /><span className="mt-1 block text-xs font-normal text-muted"><T id="admin.clearDate" /></span></label>
            <label className="block text-sm font-semibold"><T id="admin.completedDate" /><input type="date" name="completed_date" defaultValue={selected?.completed_date ?? ""} className={inputClass} /></label>
          </div>
          <div className="flex flex-wrap gap-3 pt-2"><AsyncButton type="submit" busy={pending && operation === "save"} busyLabel={t("Saving…")} className={buttonClass}><T id="admin.saveItem" /></AsyncButton><button type="button" onClick={() => { if (translationDirty && !window.confirm(t("dynamic.discard"))) return; setEditing(null); setTranslationDirty(false); setError(""); }} className="rounded-full border border-line-strong px-5 py-3 text-sm font-bold hover:bg-surface-muted"><T id="common.cancel" /></button></div>
        </fieldset>
      </form></div>
      {selected && <div hidden={editorLocale !== "zh-CN"}><RoadmapTranslationEditor key={selected.id} item={selected} active={editorLocale === "zh-CN"} onDirtyChange={setTranslationDirty} /></div>}
    </div>}
    <div className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><label htmlFor="roadmap-filter" className="flex flex-col gap-2 text-sm font-semibold sm:flex-row sm:items-center sm:gap-3"><T id="admin.filter" /><select id="roadmap-filter" value={filter} onChange={event => setFilter(event.target.value as RoadmapFilter)} className="rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-line-strong"><option value="all"><T id="admin.all" /></option>{statuses.map(status => <option key={status} value={status}><T source={statusLabels[status]} /></option>)}<option value="draft"><T id="admin.draft" /></option><option value="published"><T id="admin.published" /></option></select></label><RoadmapSortControl id="admin-roadmap-sort" value={sort} onChange={setSort} /></div>
    <ul className="mt-5 space-y-4">{visible.map(item => <li key={item.id} className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[item.status]}`}><T source={statusLabels[item.status]} /></span><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.publication_status === "draft" ? "bg-surface-muted text-muted" : "bg-brand-soft text-completed-fg"}`}><T source={item.publication_status === "draft" ? "Draft" : "Published"} /></span></div><span className="max-w-[45%] break-words text-right text-xs leading-5 text-muted">{item.category}</span></div>
      <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row"><div className="min-w-0"><h2 className="break-words text-lg font-bold">{item.title}</h2><div className="mt-2 flex flex-wrap gap-2">{(["title", "description", "category"] as const).map(field => <span key={field} className="inline-flex items-center gap-1 text-xs text-muted"><T id={`dynamic.field_${field}`} /><TranslationStatus row={item.translations?.find(row => row.locale === "zh-CN" && row.field_name === field)} /></span>)}</div><p className="mt-1.5 line-clamp-2 break-words text-sm leading-6 text-muted">{item.description}</p><p className="mt-2 text-xs text-muted"><T source="Updated" /> <LocalizedDate value={item.updated_at} />{item.priority && <> · <T source={item.priority.charAt(0).toUpperCase() + item.priority.slice(1)} /> <T source="Priority" /></>}{item.target_date && <> · <T source="Target date" /> <LocalizedDate value={item.target_date} /></>}</p></div>
      <div className="flex shrink-0 items-start gap-2"><button type="button" aria-label={t("Edit") + " " + item.title} disabled={pending} onClick={() => openEditor(item.id)} className="rounded-full border border-line-strong px-4 py-2 text-sm font-bold hover:bg-surface-muted disabled:opacity-50"><T id="common.edit" /></button><AsyncButton type="button" aria-label={t("Delete") + " " + item.title} busy={pending && operation === item.id} busyLabel={t("Deleting…")} disabled={pending} onClick={() => remove(item)} className="rounded-full px-4 py-2 text-sm font-bold text-danger-fg hover:bg-danger-bg disabled:opacity-50"><T id="common.delete" /></AsyncButton></div>
      </div></li>)}</ul>
    {!visible.length && <p className="mt-6 rounded-xl border border-dashed border-line-strong p-8 text-center text-muted"><T id="admin.empty" /></p>}
  </div>;
}
