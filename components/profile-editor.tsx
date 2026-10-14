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

  return <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-bold text-[#102a43]">{name || "Pilot"}</p><button type="button" onClick={() => { setOpen(!open); setStatus(""); }} aria-label="Edit display name" className="grid h-7 w-7 place-items-center rounded-full text-[#e8753a] transition hover:bg-[#fff5f2] focus:outline-none focus:ring-2 focus:ring-[#e8753a]">✎</button></div>{open && <div className="mt-3 flex max-w-md flex-wrap gap-2"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="min-w-0 flex-1 rounded-xl border border-[#bcccdc] px-3 py-2 text-sm outline-none focus:border-[#168c82]" aria-label="Display name" /><button type="button" onClick={save} disabled={saving} className="rounded-xl bg-[#102a43] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Save"}</button><button type="button" onClick={() => { setName(initialName); setOpen(false); }} className="rounded-xl border border-[#bcccdc] px-4 py-2 text-sm font-bold text-[#627d98]">Cancel</button></div>}{status && <p className={`mt-2 text-xs ${status === "Saved" ? "text-[#168c82]" : "text-[#b94a3d]"}`}>{status}</p>}</div>;
}
