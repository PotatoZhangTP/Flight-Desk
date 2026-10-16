import Link from "@/components/navigation-link";
import { ServerActionForm } from "@/components/server-action-form";
import { SubmitButton } from "@/components/async-button";
import { requestPasswordReset } from "@/app/auth/actions";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const params = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-page p-6"><div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-xl shadow-ink/5"><Link href="/auth" className="text-sm font-semibold text-muted">← Back to sign in</Link><h1 className="mt-8 text-3xl font-bold tracking-tight text-ink">Reset your password</h1><p className="mt-3 text-sm leading-6 text-muted">We’ll send a secure reset link to your email address.</p>{params.sent ? <p role="status" className="mt-6 rounded-lg bg-brand-soft p-3 text-sm text-brand">Check your inbox for the password reset link.</p> : <ServerActionForm action={requestPasswordReset} className="mt-6 space-y-4"><label className="block text-sm font-semibold text-ink">Email<input required name="email" type="email" className="mt-1.5 w-full rounded-xl border border-line-strong px-4 py-3 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" placeholder="you@example.com" /></label>{params.error && <p role="alert" className="rounded-lg bg-danger-bg p-3 text-sm text-danger-fg">{params.error}</p>}<SubmitButton busyLabel="Sending reset link…" className="w-full rounded-full bg-brand px-5 py-3 font-bold text-on-brand transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Send reset link</SubmitButton></ServerActionForm>}</div></main>;
}
