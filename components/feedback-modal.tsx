"use client";

import { useEffect, useRef, useState } from "react";
import { T, useText } from "@/components/i18n";
import { createClient } from "@/lib/supabase/browser";

type FeedbackType = "feature" | "bug";
type Attachment = { path: string; name: string; size: number; type: string };
const maxFiles = 5;
const maxBytes = 5 * 1024 * 1024;
const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function browserInfo() {
  if (typeof navigator === "undefined") return null;
  const agent = navigator.userAgent;
  const browser = /Edg\/([\d.]+)/.exec(agent)?.[1] ? `Edge ${EdgVersion(agent)}` : /Chrome\/([\d.]+)/.exec(agent)?.[1] ? `Chrome ${ChromeVersion(agent)}` : /Firefox\/([\d.]+)/.exec(agent)?.[1] ? `Firefox ${FirefoxVersion(agent)}` : /Version\/([\d.]+).*Safari/.exec(agent)?.[1] ? `Safari ${SafariVersion(agent)}` : "Unknown browser";
  const operatingSystem = /Windows NT/.test(agent) ? "Windows" : /Mac OS X/.test(agent) ? "macOS" : /Android/.test(agent) ? "Android" : /iPhone|iPad/.test(agent) ? "iOS" : /Linux/.test(agent) ? "Linux" : "Unknown operating system";
  return { path: location.pathname, browser, operatingSystem, device: /Mobi|Android|iPhone|iPad/i.test(agent) ? "mobile" : "desktop", submittedAt: new Date().toISOString() };
}

function EdgVersion(agent: string) { return /Edg\/([\d.]+)/.exec(agent)?.[1] ?? ""; }
function ChromeVersion(agent: string) { return /Chrome\/([\d.]+)/.exec(agent)?.[1] ?? ""; }
function FirefoxVersion(agent: string) { return /Firefox\/([\d.]+)/.exec(agent)?.[1] ?? ""; }
function SafariVersion(agent: string) { return /Version\/([\d.]+)/.exec(agent)?.[1] ?? ""; }

export function FeedbackModal({ type, onClose }: { type: FeedbackType; onClose: () => void }) {
  const t = useText();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [includeEnvironment, setIncludeEnvironment] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"" | "success" | "error">("");
  const [errorDetail, setErrorDetail] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isBug = type === "bug";
  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const next = [...files];
    for (const file of selected) {
      if (!allowed.has(file.type) || file.size > maxBytes || next.length >= maxFiles) continue;
      if (!next.some(existing => existing.name === file.name && existing.size === file.size)) next.push(file);
    }
    setFiles(next); event.target.value = "";
  }
  function removeFile(index: number) { setFiles(current => current.filter((_, item) => item !== index)); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !title.trim() || !description.trim()) return;
    setBusy(true); setMessage(""); setErrorDetail("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); setMessage("error"); return; }
    const uploaded: Attachment[] = [];
    try {
      for (const file of files) {
        const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const result = await supabase.storage.from("feedback-attachments").upload(path, file, { contentType: file.type, upsert: false });
        if (result.error) throw result.error;
        uploaded.push({ path, name: file.name, size: file.size, type: file.type });
      }
      const { error } = await supabase.from("feedback_submissions").insert({ type, title: title.trim(), description: description.trim(), attachments: uploaded, environment_info: isBug && includeEnvironment ? browserInfo() : null });
      if (error) throw error;
      setTitle(""); setDescription(""); setFiles([]); setMessage("success");
    } catch (error) {
      if (uploaded.length) await supabase.storage.from("feedback-attachments").remove(uploaded.map(file => file.path));
      if (process.env.NODE_ENV !== "production") {
        const diagnostic = error as { code?: string; message?: string; details?: string; hint?: string };
        console.error("[feedback] submission failed", { code: diagnostic.code, message: diagnostic.message, details: diagnostic.details, hint: diagnostic.hint });
      }
      setMessage("error"); setErrorDetail(error instanceof Error ? error.message : "");
    } finally { setBusy(false); }
  }
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-5"><div><h2 id="feedback-title" className="text-2xl font-bold"><T id={isBug ? "feedback.reportBug" : "feedback.suggestFeature"} /></h2><p className="mt-2 text-sm text-muted"><T id={isBug ? "feedback.bugSubtitle" : "feedback.featureSubtitle"} /></p></div><button type="button" className="button-secondary !min-h-9 !px-3 !py-1.5" onClick={onClose} disabled={busy} aria-label={t("common.close")}>×</button></div>
      {message === "success" ? <div className="mt-8 rounded-xl bg-completed-bg p-5 text-completed-fg" role="status"><p className="font-bold"><T id="feedback.success" /></p><button type="button" className="button-secondary mt-5" onClick={onClose}><T id="common.close" /></button></div> : <form onSubmit={submit} className="mt-7 space-y-5">
        {message === "error" && <p className="rounded-xl bg-danger-bg p-3 text-sm text-danger-fg" role="alert"><T id="feedback.submitError" />{errorDetail && <span className="sr-only"> {errorDetail}</span>}</p>}
        <label className="block text-sm font-semibold text-muted"><T id={isBug ? "feedback.issueTitle" : "feedback.featureTitle"} /><input value={title} onChange={event => setTitle(event.target.value)} maxLength={160} required className="mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" /></label>
        <label className="block text-sm font-semibold text-muted"><T id="feedback.description" /><textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={12000} required rows={6} className="mt-1.5 w-full resize-y rounded-xl border border-line-strong bg-surface px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" /></label>
        {isBug && <div className="rounded-xl bg-surface-muted p-4 text-sm"><label className="flex items-start gap-3"><input type="checkbox" checked={includeEnvironment} onChange={event => setIncludeEnvironment(event.target.checked)} className="mt-0.5" /><span><span className="font-semibold"><T id="feedback.includeEnvironment" /></span><span className="mt-1 block text-muted"><T id="feedback.environmentHelp" /></span></span></label></div>}
        <div><p className="text-sm font-semibold text-muted"><T id="feedback.screenshots" /> <span className="font-normal text-subtle">(<T id="common.optional" />)</span></p><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="sr-only" onChange={choose} /><button type="button" className="button-secondary mt-2" onClick={() => inputRef.current?.click()} disabled={files.length >= maxFiles}><T id="feedback.addScreenshots" /></button><p className="mt-2 text-xs text-subtle"><T id="feedback.screenshotHelp" /></p>{files.length > 0 && <ul className="mt-3 space-y-2">{files.map((file, index) => <li key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm"><span className="truncate">{file.name}</span><button type="button" className="font-semibold text-danger-fg" onClick={() => removeFile(index)}><T id="common.remove" /></button></li>)}</ul>}</div>
        <div className="flex flex-wrap justify-end gap-3"><button type="button" className="button-secondary" onClick={onClose} disabled={busy}><T id="common.cancel" /></button><button type="submit" className="button-primary" disabled={busy || !title.trim() || !description.trim()}>{busy ? <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> <T id="feedback.submitting" /></> : <T id="feedback.submit" />}</button></div>
      </form>}
    </div>
  </div>;
}
