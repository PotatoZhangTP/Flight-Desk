"use client";

import { useState } from "react";
import { updateDisplayName } from "@/app/auth/actions";

export function ProfileEditor({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true); setStatus("");
    const result = await updateDisplayName(name);
    setSaving(false);
    if (result.error) { setStatus(result.error); return; }
    setOpen(false); setStatus("Saved");
  }

  return <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-bold text-ink">{name || "Pilot"}</p><button type="button" onClick={() => { setOpen(!open); setStatus(""); }} aria-label="Edit display name" className="grid h-7 w-7 place-items-center rounded-full text-brand transition hover:bg-brand-soft focus:outline-none focus:ring-2 focus:ring-brand">✎</button></div>{open && <div className="mt-3 flex max-w-md flex-wrap gap-2"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="min-w-0 flex-1 rounded-xl border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" aria-label="Display name" /><button type="button" onClick={save} disabled={saving} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-on-brand disabled:opacity-60">{saving ? "Saving…" : "Save"}</button><button type="button" onClick={() => { setName(initialName); setOpen(false); }} className="rounded-xl border border-line-strong px-4 py-2 text-sm font-bold text-muted">Cancel</button></div>}{status && <p className={`mt-2 text-xs ${status === "Saved" ? "text-brand" : "text-danger-fg"}`}>{status}</p>}</div>;
}
