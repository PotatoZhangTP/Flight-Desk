"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRoadmap, saveRoadmap } from "@/app/admin/roadmap/actions";
import { formatRoadmapDate, statuses, statusLabels, statusStyles, type RoadmapItem } from "@/lib/roadmap/model";

const inputClass = "mt-2 w-full rounded-xl border border-[#bcccdc] bg-white px-3 py-3 text-sm font-normal text-[#102a43] outline-none focus:border-[#168c82] focus:ring-2 focus:ring-[#9fd8d2]";
const buttonClass = "rounded-full bg-[#e8753a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#cf5f29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8753a] disabled:cursor-wait disabled:opacity-60";

export function RoadmapManager({ items }: { items: RoadmapItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const editor = useRef<HTMLDivElement>(null);
  function openEditor(id: string) {
    setEditing(id); setError(""); setMessage("");
    // Wait until the editor is mounted before moving keyboard focus into it.
    requestAnimationFrame(() => { editor.current?.scrollIntoView({ block: "start", behavior: "instant" }); editor.current?.querySelector<HTMLInputElement>('input[name="title"]')?.focus({ preventScroll: true }); });
  }
  function submit(form: FormData) {
    if (pending) return;
    setError(""); setMessage("");
    startTransition(async () => {
      try {
        const result = await saveRoadmap(form);
        if (result.error) { setError(result.error); return; }
        setMessage(result.success ?? "Saved."); setEditing(null); router.refresh();
      } catch { setError("The save request failed. Check your connection and try again."); }
    });
  }
  function remove(item: RoadmapItem) {
    if (pending || !window.confirm(`Delete “${item.title}”? This permanently removes it from the roadmap, including the public page if published.`)) return;
    setError(""); setMessage("");
    startTransition(async () => {
      try {
        const result = await deleteRoadmap(item.id);
        if (result.error) { setError(result.error); return; }
        setMessage(result.success ?? "Deleted."); if (editing === item.id) setEditing(null); router.refresh();
      } catch { setError("The delete request failed. Check your connection and try again."); }
    });
  }
  const selected = items.find(item => item.id === editing);
  return <div className="mt-10">
    <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-[#627d98]">{items.length} items · {items.filter(item => item.publication_status === "draft").length} drafts · {items.filter(item => item.publication_status === "published").length} published</p><button type="button" disabled={pending} onClick={() => openEditor("new")} className={buttonClass}>＋ New roadmap item</button></div>
    <div aria-live="polite" aria-atomic="true">{message && <p role="status" className="mt-5 rounded-xl bg-[#dff4f0] p-4 text-sm text-[#11675f]">{message}</p>}{error && <p role="alert" className="mt-5 rounded-xl bg-[#fff0ed] p-4 text-sm text-[#b94a3d]">{error}</p>}</div>
    {editing && <div ref={editor} className="mt-6 scroll-mt-6 rounded-2xl border border-[#9fd8d2] bg-white p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-bold">{editing === "new" ? "New roadmap item" : "Edit roadmap item"}</h2><p className="mt-2 text-sm leading-6 text-[#627d98]">Drafts are visible only to administrators. Publishing makes this item public immediately. Returning a published item to Draft hides it.</p>
      <form key={editing} action={submit} className="mt-6">
        <fieldset disabled={pending} className="space-y-5 disabled:opacity-70">
          <input type="hidden" name="id" value={selected?.id ?? ""} />
          <label className="block text-sm font-semibold">Feature name<input required name="title" maxLength={160} defaultValue={selected?.title ?? ""} className={inputClass} /></label>
          <label className="block text-sm font-semibold">Description<textarea name="description" maxLength={5000} rows={4} defaultValue={selected?.description ?? ""} className={inputClass} /></label>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm font-semibold">Category<input required name="category" maxLength={80} defaultValue={selected?.category ?? "Platform"} className={inputClass} /></label>
            <label className="block text-sm font-semibold">Development status<select name="status" defaultValue={selected?.status ?? "planned"} className={inputClass}>{statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
            <label className="block text-sm font-semibold">Visibility<select name="publication_status" defaultValue={selected?.publication_status ?? "draft"} className={inputClass}><option value="draft">Draft — private</option><option value="published">Published — public</option></select></label>
            <label className="block text-sm font-semibold">Priority (optional)<select name="priority" defaultValue={selected?.priority ?? ""} className={inputClass}><option value="">Not specified</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <label className="block text-sm font-semibold">Target date (optional)<input type="date" name="target_date" defaultValue={selected?.target_date ?? ""} className={inputClass} /><span className="mt-1 block text-xs font-normal text-[#627d98]">Clear the field to remove the target date.</span></label>
            <label className="block text-sm font-semibold">Completion date (optional)<input type="date" name="completed_date" defaultValue={selected?.completed_date ?? ""} className={inputClass} /></label>
            <label className="block text-sm font-semibold">Display order<input type="number" name="sort_order" required step={1} min={-2147483648} max={2147483647} defaultValue={selected?.sort_order ?? 0} className={inputClass} /><span className="mt-1 block text-xs font-normal text-[#627d98]">Smaller numbers appear first; equal values use creation order.</span></label>
          </div>
          <div className="flex flex-wrap gap-3 pt-2"><button type="submit" className={buttonClass}>{pending ? "Saving…" : "Save item"}</button><button type="button" onClick={() => { setEditing(null); setError(""); }} className="rounded-full border border-[#bcccdc] px-5 py-3 text-sm font-bold hover:bg-[#f7f9fc]">Cancel</button></div>
        </fieldset>
      </form>
    </div>}
    <div className="mt-8 flex items-center gap-3"><label htmlFor="roadmap-filter" className="text-sm font-semibold">Show</label><select id="roadmap-filter" value={filter} onChange={event => setFilter(event.target.value)} className="rounded-xl border border-[#bcccdc] bg-white px-3 py-2 text-sm"><option value="all">All items</option><option value="draft">Drafts</option><option value="published">Published</option></select></div>
    <ul className="mt-5 space-y-4">{items.filter(item => filter === "all" || item.publication_status === filter).map(item => <li key={item.id} className="flex flex-col justify-between gap-5 rounded-2xl border border-[#d9e2ec] bg-white p-5 sm:flex-row sm:p-6">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[item.status]}`}>{statusLabels[item.status]}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.publication_status === "draft" ? "bg-[#edf2f7] text-[#627d98]" : "bg-[#dff4f0] text-[#11675f]"}`}>{item.publication_status === "draft" ? "Draft" : "Published"}</span><span className="text-xs text-[#627d98]">Order {item.sort_order} · {item.category}</span></div><h2 className="mt-3 break-words text-lg font-bold">{item.title}</h2><p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-[#627d98]">{item.description}</p><p className="mt-3 text-xs text-[#627d98]">Updated {formatRoadmapDate(item.updated_at)}{item.priority ? ` · ${item.priority} priority` : ""}{item.target_date ? ` · Target ${formatRoadmapDate(item.target_date)}` : ""}</p></div>
      <div className="flex shrink-0 items-start gap-2"><button type="button" aria-label={`Edit ${item.title}`} disabled={pending} onClick={() => openEditor(item.id)} className="rounded-full border border-[#bcccdc] px-4 py-2 text-sm font-bold hover:bg-[#eef5f5] disabled:opacity-50">Edit</button><button type="button" aria-label={`Delete ${item.title}`} disabled={pending} onClick={() => remove(item)} className="rounded-full px-4 py-2 text-sm font-bold text-[#b94a3d] hover:bg-[#fff0ed] disabled:opacity-50">Delete</button></div>
    </li>)}</ul>
    {!items.filter(item => filter === "all" || item.publication_status === filter).length && <p className="mt-6 rounded-xl border border-dashed border-[#bcccdc] p-8 text-center text-[#627d98]">No items in this view.</p>}
  </div>;
}
