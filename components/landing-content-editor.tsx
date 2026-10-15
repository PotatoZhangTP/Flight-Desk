"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishLandingDraft, saveLandingDraft } from "@/app/admin/landing-page/actions";
import { landingFields, landingSections, validateLandingDraft, type LandingCopy } from "@/lib/content/model";

export function LandingContentEditor({ initialDraft, published, completeDraft }: { initialDraft: LandingCopy; published: LandingCopy; completeDraft: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState(initialDraft);
  const [saved, setSaved] = useState(initialDraft);
  const [live, setLive] = useState(published);
  const [hasDraft, setHasDraft] = useState(completeDraft);
  const [pending, startTransition] = useTransition();
  const [operation, setOperation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirty = landingFields.some(field => values[field.key] !== saved[field.key]);
  const different = landingFields.filter(field => saved[field.key] !== live[field.key]).length;
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) { if (dirty) event.preventDefault(); }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(""); setMessage("");
    let clean: LandingCopy;
    try { clean = validateLandingDraft(values); }
    catch (error) { setError(error instanceof Error ? error.message : "Check your draft."); return; }
    setOperation("save");
    startTransition(async () => {
      try {
        const result = await saveLandingDraft(clean);
        if (result.error) { setError(result.error); return; }
        setValues(clean); setSaved(clean); setHasDraft(true); setMessage(result.success ?? "Draft saved."); router.refresh();
      } catch { setError("The save request failed. Your edits are still in this form; try again."); }
    });
  }
  function publish() {
    if (pending || dirty || !hasDraft || !window.confirm("Publish the saved draft for all homepage sections? It will become visible to all visitors.")) return;
    setError(""); setMessage(""); setOperation("publish");
    startTransition(async () => {
      try {
        const result = await publishLandingDraft();
        if (result.error) { setError(result.error); return; }
        setLive(saved); setMessage(result.success ?? "Published."); router.refresh();
      } catch { setError("The publish request could not be confirmed. Refresh the homepage to check its status before retrying."); }
    });
  }
  return <div className="mt-8">
    <div className="rounded-2xl border border-line bg-surface p-5"><p className="font-semibold">Draft and published copy are separate.</p><p className="mt-2 text-sm leading-6 text-muted">Save Draft keeps your edits private. Publish Saved Draft updates every section together. Button destinations, page layout and Roadmap items are managed separately.</p><p aria-live="polite" className="mt-3 text-sm text-brand">{dirty ? "You have unsaved edits. Save them before publishing." : !hasDraft ? "Save a complete draft before publishing." : different ? `${different} saved fields differ from published copy.` : "The saved draft matches the published copy."}</p></div>
    <div aria-live="polite" aria-atomic="true">{message && <p role="status" className="mt-5 rounded-xl bg-brand-soft p-4 text-sm text-brand">{message}</p>}{error && <p role="alert" className="mt-5 rounded-xl bg-danger-bg p-4 text-sm text-danger-fg">{error}</p>}</div>
    <form onSubmit={save} className="mt-6">
      <fieldset disabled={pending} className="space-y-5 disabled:opacity-70">
        {landingSections.map(section => <details key={section.id} open={section.id === "hero"} className="rounded-2xl border border-line bg-surface p-5 sm:p-6"><summary className="text-lg font-bold">{section.title}<span className="ml-3 text-xs font-normal text-muted">{landingFields.filter(field => field.section === section.id).length} fields</span></summary><div className="mt-6 grid gap-5 md:grid-cols-2">{landingFields.filter(field => field.section === section.id).map(field => <label key={field.key} className={`min-w-0 text-sm font-semibold capitalize ${field.key.endsWith(".description") ? "md:col-span-2" : ""}`}>{field.label}{!field.required && <span className="ml-1 font-normal normal-case text-muted">(optional)</span>}<textarea name={field.key} value={values[field.key]} onChange={event => { setValues(current => ({ ...current, [field.key]: event.target.value })); setMessage(""); }} required={field.required} maxLength={field.maxLength} rows={field.key.endsWith(".description") ? 3 : 2} className="mt-2 block w-full resize-y rounded-xl border border-line-strong bg-surface px-3 py-3 text-sm font-normal normal-case leading-6 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /><span className="mt-1 block text-[11px] font-normal normal-case text-muted">Plain text · up to {field.maxLength} characters</span></label>)}</div></details>)}
      </fieldset>
      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t border-line bg-page/95 py-4"><button type="submit" disabled={pending} className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60">{pending && operation === "save" ? "Saving…" : "Save Draft"}</button><button type="button" disabled={pending || dirty || !hasDraft} onClick={publish} className="rounded-full border border-brand px-5 py-3 text-sm font-semibold text-brand transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50">{pending && operation === "publish" ? "Publishing…" : "Publish Saved Draft"}</button><span className="text-xs text-muted">Changes are public only after publishing.</span></div>
    </form>
  </div>;
}
