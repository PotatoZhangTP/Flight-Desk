"use client";
import { T, useText, UiError } from "@/components/i18n";


import { useState } from "react";
import { updateDisplayName } from "@/app/auth/actions";
import { AsyncButton } from "./async-button";
import { useAsyncOperation } from "./use-async-operation";

export function ProfileEditor({ initialName }: { initialName: string }) {
  const t = useText();
  const [name, setName] = useState(initialName);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const { busy: saving, run } = useAsyncOperation();
  const [savedName, setSavedName] = useState(initialName);

  async function save() {
    await run(async () => {
      setStatus("");
      const result = await updateDisplayName(name);
      if (result.error) { setStatus(result.error); return; }
      setSavedName(name); setOpen(false); setStatus("Saved");
    }, () => setStatus("Save could not be confirmed. Your edits are still here; check before retrying."));
  }

  return <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-bold text-ink">{name || <T source="Pilot" />}</p><button type="button" onClick={() => { setOpen(!open); setStatus(""); }} disabled={saving} aria-label={t("Edit display name")} className="grid h-7 w-7 place-items-center rounded-full text-brand transition hover:bg-brand-soft focus:outline-none focus:ring-2 focus:ring-brand">✎</button></div>{open && <div className="mt-3 flex max-w-md flex-wrap gap-2"><input disabled={saving} autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="min-w-0 flex-1 rounded-xl border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" aria-label={t("Display name")} /><AsyncButton type="button" onClick={save} busy={saving} busyLabel={t("Saving…")} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-on-brand disabled:opacity-60"><T id="common.save" /></AsyncButton><button type="button" disabled={saving} onClick={() => { setName(savedName); setOpen(false); }} className="rounded-xl border border-line-strong px-4 py-2 text-sm font-bold text-muted"><T id="common.cancel" /></button></div>}{status && <p role={status === "Saved" ? "status" : "alert"} className={`mt-2 text-xs ${status === "Saved" ? "text-brand" : "text-danger-fg"}`}><UiError message={status} /></p>}</div>;
}
