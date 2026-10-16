"use client";

import { useState } from "react";
import { updateProfileBio } from "@/app/auth/actions";
import { AsyncButton } from "./async-button";
import { useAsyncOperation } from "./use-async-operation";

export function BioEditor({ initialBio }: { initialBio: string }) {
  const [bio, setBio] = useState(initialBio);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const { busy: saving, run } = useAsyncOperation();
  async function save() {
    await run(async () => {
      setStatus(""); const result = await updateProfileBio(bio);
      if (result.error) setStatus(result.error);
      else { setEditing(false); setStatus("Saved"); }
    }, () => setStatus("Save could not be confirmed. Your edits are still here; check before retrying."));
  }
  return <div className="mt-4">{editing ? <><textarea disabled={saving} aria-label="Profile bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={4} className="w-full rounded-xl border border-line-strong px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" placeholder="Tell other future-you a little about your aviation journey." /><div className="mt-2 flex items-center gap-3"><AsyncButton onClick={save} busy={saving} busyLabel="Saving…" className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-brand disabled:opacity-60">Save bio</AsyncButton><button disabled={saving} onClick={() => setEditing(false)} className="text-sm font-semibold text-muted">Cancel</button><span className="text-xs text-subtle">{bio.length}/280</span></div></> : <><p className="text-sm leading-6 text-muted">{bio || "Add a short introduction about your aviation journey."}</p><button onClick={() => setEditing(true)} className="mt-3 text-sm font-semibold text-brand">{bio ? "Edit bio" : "Add bio"}</button></>}{status && <p role={status === "Saved" ? "status" : "alert"} className={`mt-2 text-xs ${status === "Saved" ? "text-brand" : "text-danger-fg"}`}>{status}</p>}</div>;
}
