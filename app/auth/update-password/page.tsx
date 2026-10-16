"use client";
import { LanguageSelector } from "@/components/language-selector";
import { T, useText, UiError } from "@/components/i18n";


import { FormEvent, useState } from "react";
import { AsyncButton } from "@/components/async-button";
import { useAsyncOperation } from "@/components/use-async-operation";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function UpdatePasswordPage() {
  const t = useText();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { busy, run } = useAsyncOperation();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (message) return;
    await run(async () => {
      setError("");
      const { error } = await createClient().auth.updateUser({ password });
      if (error) { setError(error.message); return; }
      setMessage("Password updated successfully.");
      router.push("/dashboard?password_updated=1");
    }, () => setError("The update could not be confirmed. Check your connection before retrying."));
  }
  return <main className="grid min-h-screen place-items-center bg-page p-6"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-xl">
    <div className="mb-6"><LanguageSelector /></div><h1 className="text-3xl font-bold text-ink"><T id="auth.newPasswordTitle" /></h1>
    <label className="mt-6 block text-sm font-semibold text-ink"><T id="auth.newPassword" /><input disabled={busy || !!message} required minLength={6} autoComplete="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line-strong px-4 py-3" /></label>
    {error && <p role="alert" className="mt-4 text-sm text-danger-fg"><UiError message={error} /></p>}
    {message && <p role="status" className="mt-4 text-sm text-brand"><T source={message} /></p>}
    <AsyncButton busy={busy} disabled={!!message} busyLabel={t("Updating password…")} className="mt-6 w-full rounded-full bg-brand px-5 py-3 font-bold text-on-brand"><T id="auth.updatePassword" /></AsyncButton>
  </form></main>;
}
