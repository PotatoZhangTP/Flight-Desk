"use client";

import { FormEvent, useState } from "react";
import Link from "@/components/navigation-link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { signUpWithEmail } from "@/app/auth/actions";
import { AsyncButton } from "./async-button";
import { useAsyncOperation } from "./use-async-operation";

export function AuthForm({ initialError = "" }: { initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(""); const [error, setError] = useState(initialError);
  const { busy, run } = useAsyncOperation();
  const [navigating, setNavigating] = useState(false);
  const loading = busy || navigating;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    await run(async () => {
      setError(""); setMessage("");
      const result = mode === "login" ? await createClient().auth.signInWithPassword({ email, password }) : await signUpWithEmail(email, password);
      if (result.error) {
        const text = typeof result.error === "string" ? result.error : result.error.message;
        setError(text.toLowerCase().includes("invalid login") ? "Email or password is incorrect." : text); return;
      }
      if (mode === "signup") { setMessage("Account created. Check your inbox to verify your email before signing in."); return; }
      setNavigating(true); router.push("/dashboard"); router.refresh();
    }, () => setError("Sign in or account creation could not be confirmed. Check your connection before trying again."));
  }
  const fieldClass = "mt-2 w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-brand focus:ring-4 focus:ring-brand/10";
  return <div className="rounded-2xl border border-line bg-surface p-6 shadow-lg shadow-ink/5 sm:p-8">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Welcome to Flight Desk</p>
    <h2 className="mt-3 text-2xl font-bold tracking-tight">{mode === "login" ? "Ready for your next chapter?" : "Start your flying story."}</h2>
    <p className="mt-3 text-sm leading-6 text-muted">{mode === "login" ? "Sign in to pick up where you left off." : "Create your account and keep every journey together."}</p>
    <div aria-label="Account access mode" className="mb-7 mt-6 flex gap-1 rounded-xl border border-line bg-surface-muted p-1">
      <button type="button" disabled={loading} aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(""); setMessage(""); }} className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${mode === "login" ? "bg-surface text-brand shadow-sm" : "text-muted hover:text-brand"}`}>Sign in</button>
      <button type="button" disabled={loading} aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); setMessage(""); }} className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${mode === "signup" ? "bg-surface text-brand shadow-sm" : "text-muted hover:text-brand"}`}>Create account</button>
    </div>
    <form onSubmit={submit} className="space-y-5">
      <div><label htmlFor="auth-email" className="block text-sm font-semibold">Email</label><input disabled={loading} id="auth-email" required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={fieldClass} placeholder="you@example.com" /></div>
      <div><label htmlFor="auth-password" className="block text-sm font-semibold">Password</label><div className="relative"><input disabled={loading} id="auth-password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className={`${fieldClass} pr-12`} placeholder="At least 6 characters" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute bottom-1 right-1 grid h-10 w-10 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</svg></button></div></div>
      {mode === "login" && <Link href="/auth/reset-password" className="block rounded text-right text-sm font-semibold text-brand transition hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-brand">Forgot password?</Link>}
      {error && <p role="alert" className="rounded-xl border border-danger-line bg-danger-bg p-3 text-sm leading-6 text-danger-fg">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-line bg-brand-soft p-3 text-sm leading-6 text-brand">{message}</p>}
      <AsyncButton busy={loading} busyLabel={mode === "login" ? "Signing in…" : "Creating account…"} className="w-full rounded-full bg-brand px-5 py-3.5 text-sm font-bold text-on-brand transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60">{mode === "login" ? "Sign in" : "Create account"}</AsyncButton>
    </form>
  </div>;
}
