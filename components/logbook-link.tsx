import Link from "next/link";

export function LogbookLink() {
  return <Link href="/dashboard" className="inline-flex h-12 w-52 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-bold text-on-brand transition hover:-translate-y-0.5 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Open Your Logbook <span aria-hidden="true">↗</span></Link>;
}
