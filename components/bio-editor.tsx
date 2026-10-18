"use client";

import { useState } from "react";
import { updateProfileBio } from "@/app/auth/actions";
import { T, UiError, useText } from "@/components/i18n";
import { AsyncButton } from "./async-button";
import { useAsyncOperation } from "./use-async-operation";

export function BioEditor({ initialBio }: { initialBio: string }) {
  const t = useText();
  const [bio, setBio] = useState(initialBio);
  const [savedBio, setSavedBio] = useState(initialBio);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const { busy: saving, run } = useAsyncOperation();

  async function save() {
    await run(async () => {
      setStatus("");
      const result = await updateProfileBio(bio);
      if (result.error) {
        setStatus(result.error);
        return;
      }
      setSavedBio(bio.trim());
      setEditing(false);
      setStatus(t("common.saved"));
    }, () => setStatus(t("common.saveError")));
  }

  return <div className="mt-4">
    {editing ? <>
      <textarea disabled={saving} aria-label={t("profile.bio")} value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} rows={4} className="w-full rounded-xl border border-line-strong px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" placeholder={t("profile.bioPlaceholder")} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <AsyncButton onClick={save} busy={saving} busyLabel={t("common.saving")} className="button-primary !h-auto !rounded-full px-4 py-2 text-sm disabled:opacity-60"><T id="profile.saveBio" /></AsyncButton>
        <button type="button" disabled={saving} onClick={() => { setBio(savedBio); setEditing(false); }} className="button-secondary !h-auto !rounded-full px-4 py-2 text-sm"><T id="common.cancel" /></button>
        <span className="text-xs text-subtle">{bio.length}/280</span>
      </div>
    </> : <>
      <p className="text-sm leading-6 text-muted">{bio || <T id="profile.bioEmpty" />}</p>
      <button type="button" onClick={() => { setEditing(true); setStatus(""); }} className="mt-3 text-sm font-semibold text-brand"><T id={bio ? "profile.editBio" : "profile.addBio"} /></button>
    </>}
    {status && <p role={status === t("common.saved") ? "status" : "alert"} className={`mt-2 text-xs ${status === t("common.saved") ? "text-brand" : "text-danger-fg"}`}><UiError message={status} /></p>}
  </div>;
}
