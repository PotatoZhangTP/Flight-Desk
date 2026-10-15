import Link from "next/link";
import { SiteHeader } from "./site-header";

export function AdminDenied({ failed = false }: { failed?: boolean }) {
  return <><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-20"><p className="eyebrow">Administrator access</p><h1 className="mt-4 text-4xl font-bold">Access denied</h1><p role="alert" className="mt-5 text-muted">{failed ? "We couldn’t verify administrator access. Please try again later." : "Your account does not have permission to manage this website."}</p><Link href="/dashboard" className="mt-8 inline-block font-semibold text-brand">Back to dashboard →</Link></main></>;
}
