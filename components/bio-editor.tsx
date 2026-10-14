"use client";

import { useState } from "react";
import { updateProfileBio } from "@/app/auth/actions";

export function BioEditor({ initialBio }: { initialBio: string }) {
  const [bio, setBio] = useState(initialBio);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); setStatus(""); const result = await updateProfileBio(bio); setSaving(false); if (result.error) setStatus(result.error); else { setEditing(false); setStatus("Saved"); } }
  return <div className="mt-4">{editing ? <><textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={4} className="w-full rounded-xl border border-[#bcccdc] px-4 py-3 text-sm outline-none focus:border-[#168c82]" placeholder="Tell other future-you a little about your aviation journey." /><div className="mt-2 flex items-center gap-3"><button onClick={save} disabled={saving} className="rounded-full bg-[#102a43] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Save bio"}</button><button onClick={() => setEditing(false)} className="text-sm font-semibold text-[#627d98]">Cancel</button><span className="text-xs text-[#829ab1]">{bio.length}/280</span></div></> : <><p className="text-sm leading-6 text-[#627d98]">{bio || "Add a short introduction about your aviation journey."}</p><button onClick={() => setEditing(true)} className="mt-3 text-sm font-semibold text-[#168c82]">{bio ? "Edit bio" : "Add bio"}</button></>}{status && <p className={`mt-2 text-xs ${status === "Saved" ? "text-[#168c82]" : "text-[#b94a3d]"}`}>{status}</p>}</div>;
}
