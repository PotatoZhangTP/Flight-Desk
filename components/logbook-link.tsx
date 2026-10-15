import Link from "next/link";

export function LogbookLink() {
  return <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-on-brand transition hover:-translate-y-0.5 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Open Your Logbook <span aria-hidden="true">↗</span></Link>;
}
