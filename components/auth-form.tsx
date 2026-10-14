"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { signUpWithEmail } from "@/app/auth/actions";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const supabase = createClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await signUpWithEmail(email, password);
    setLoading(false);
    if (result.error) { setError(typeof result.error === "string" ? result.error : result.error.message); return; }
    if (mode === "signup") { setMessage("Account created. Check your inbox to verify your email before signing in."); return; }
    router.push("/dashboard"); router.refresh();
  }

  return <div className="rounded-2xl border border-[#d9e2ec] bg-white p-6 shadow-xl shadow-[#102a43]/5"><div className="mb-6 flex rounded-xl bg-[#f7f9fc] p-1"><button onClick={() => setMode("login")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${mode === "login" ? "bg-white text-[#102a43] shadow-sm" : "text-[#829ab1]"}`}>Sign in</button><button onClick={() => setMode("signup")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${mode === "signup" ? "bg-white text-[#102a43] shadow-sm" : "text-[#829ab1]"}`}>Create account</button></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold text-[#486581]">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#bcccdc] px-4 py-3 text-[#102a43] outline-none focus:border-[#168c82]" placeholder="you@example.com" /></label><label className="block text-sm font-semibold text-[#486581]">Password<input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#bcccdc] px-4 py-3 text-[#102a43] outline-none focus:border-[#168c82]" placeholder="At least 6 characters" /></label>{mode === "login" && <a href="/auth/reset-password" className="block text-right text-sm font-semibold text-[#168c82]">Forgot password?</a>}{error && <p className="rounded-lg bg-[#fff0ed] p-3 text-sm text-[#b94a3d]">{error}</p>}{message && <p className="rounded-lg bg-[#dff4f0] p-3 text-sm text-[#16756d]">{message}</p>}<button disabled={loading} className="w-full rounded-full bg-[#e8753a] px-5 py-3 font-bold text-white disabled:opacity-60">{loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form></div>;
}
