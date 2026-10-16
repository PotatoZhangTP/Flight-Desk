"use client";
import { T, useText, UiError } from "@/components/i18n";


import { useState } from "react";
import { requestPasswordChange } from "@/app/auth/actions";
import { AsyncButton } from "./async-button";
import { useAsyncOperation } from "./use-async-operation";

export function PasswordSecurity() {
  const t = useText();
  const [status, setStatus] = useState("");
  const { busy: loading, run } = useAsyncOperation();
  async function changePassword() {
    await run(async () => {
      setStatus(""); const result = await requestPasswordChange();
      setStatus(result.error ? result.error : "Check your email for a secure password change link.");
    }, () => setStatus("The email request could not be confirmed. Check your connection and inbox before retrying."));
  }
  return <section className="mt-6 rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold text-ink"><T id="auth.password" /></h2><p className="mt-2 text-sm text-muted"><T id="settings.passwordHelp" /></p><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"><span className="rounded-xl bg-page px-4 py-3 font-mono tracking-[0.2em] text-muted">••••••••</span><AsyncButton onClick={changePassword} busy={loading} busyLabel={t("Sending…")} className="rounded-full border border-brand px-5 py-3 text-sm font-bold text-brand disabled:opacity-60"><T id="settings.changePassword" /></AsyncButton></div>{status && <p role={status.startsWith("Check") ? "status" : "alert"} className={`mt-3 text-sm ${status.startsWith("Check") ? "text-brand" : "text-danger-fg"}`}><UiError message={status} /></p>}</section>;
}
