"use client";

import { useState } from "react";
import { updateAvatarUrl } from "@/app/auth/actions";
import { T, UiError, useText } from "@/components/i18n";
import { AsyncButton } from "./async-button";
import { useAsyncOperation } from "./use-async-operation";

export function AvatarUrlEditor({ initialAvatarUrl }: { initialAvatarUrl?: string | null }) {
  const t = useText();
  const [value, setValue] = useState(initialAvatarUrl ?? "");
  const [savedValue, setSavedValue] = useState(initialAvatarUrl ?? "");
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const { busy: saving, run } = useAsyncOperation();

  async function save() {
    await run(async () => {
      setStatus("");
      const result = await updateAvatarUrl(value);
      if (result.error) {
        setStatus(result.error);
        return;
      }
      setSavedValue(value.trim());
      setEditing(false);
      setStatus(t("common.saved"));
    }, () => setStatus(t("common.saveError")));
  }

  if (!editing) {
    return <div className="mt-3"><button type="button" onClick={() => { setEditing(true); setStatus(""); }} className="text-sm font-semibold text-brand"><T id="profile.changeAvatar" /></button>{status && <p role="status" className="mt-2 text-xs text-brand">{status}</p>}</div>;
  }

  return <div className="mt-3 max-w-lg"><label className="sr-only" htmlFor="avatar-url"><T id="profile.avatarUrl" /></label><input id="avatar-url" disabled={saving} value={value} onChange={(event) => setValue(event.target.value)} placeholder={t("profile.avatarUrlPlaceholder")} inputMode="url" className="w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" /><p className="mt-2 text-xs text-subtle"><T id="profile.avatarHelp" /></p><div className="mt-3 flex flex-wrap gap-2"><AsyncButton type="button" onClick={save} busy={saving} busyLabel={t("common.saving")} className="button-primary !h-auto !rounded-full px-4 py-2 text-sm disabled:opacity-60"><T id="common.save" /></AsyncButton><button type="button" disabled={saving} onClick={() => { setValue(savedValue); setEditing(false); setStatus(""); }} className="button-secondary !h-auto !rounded-full px-4 py-2 text-sm"><T id="common.cancel" /></button></div>{status && <p role="alert" className="mt-2 text-xs text-danger-fg"><UiError message={status} /></p>}</div>;
}
