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
  return <section className="mt-6 rounded-2xl border border-[#d9e2ec] bg-white p-6"><h2 className="text-xl font-bold text-[#102a43]">Password</h2><p className="mt-2 text-sm text-[#627d98]">Your password is protected and can never be viewed here.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"><span className="rounded-xl bg-[#f7f9fc] px-4 py-3 font-mono tracking-[0.2em] text-[#627d98]">••••••••</span><button onClick={changePassword} disabled={loading} className="rounded-full border border-[#e8753a] px-5 py-3 text-sm font-bold text-[#c95f2b] disabled:opacity-60">{loading ? "Sending…" : "Change password"}</button></div>{status && <p className={`mt-3 text-sm ${status.startsWith("Check") ? "text-[#168c82]" : "text-[#b94a3d]"}`}>{status}</p>}</section>;
}
