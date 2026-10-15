"use client";

import { useState } from "react";
import { requestPasswordChange } from "@/app/auth/actions";

export function PasswordSecurity() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  async function changePassword() {
    setLoading(true); setStatus("");
    const result = await requestPasswordChange();
    setLoading(false);
    setStatus(result.error ? result.error : "Check your email for a secure password change link.");
  }
  return <section className="mt-6 rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold text-ink">Password</h2><p className="mt-2 text-sm text-muted">Your password is protected and can never be viewed here.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"><span className="rounded-xl bg-page px-4 py-3 font-mono tracking-[0.2em] text-muted">••••••••</span><button onClick={changePassword} disabled={loading} className="rounded-full border border-brand px-5 py-3 text-sm font-bold text-brand disabled:opacity-60">{loading ? "Sending…" : "Change password"}</button></div>{status && <p className={`mt-3 text-sm ${status.startsWith("Check") ? "text-brand" : "text-danger-fg"}`}>{status}</p>}</section>;
}
