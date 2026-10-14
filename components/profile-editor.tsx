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

  return <div className="mt-2"><button onClick={() => setOpen(!open)} aria-label="Edit display name" className="text-sm font-semibold text-[#168c82]">{open ? "Cancel" : "✎ Edit"}</button>{open && <div className="mt-3 flex max-w-md gap-2"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="min-w-0 flex-1 rounded-xl border border-[#bcccdc] px-3 py-2 text-sm outline-none focus:border-[#168c82]" aria-label="Display name" /><button onClick={save} disabled={saving} className="rounded-xl bg-[#102a43] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Save"}</button></div>}{status && <p className={`mt-2 text-xs ${status === "Saved" ? "text-[#168c82]" : "text-[#b94a3d]"}`}>{status}</p>}</div>;
}
