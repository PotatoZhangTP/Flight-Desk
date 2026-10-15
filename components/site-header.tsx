import Link from "next/link";
import { Brand } from "./brand";
import { AccountControls } from "./account-controls";
import { siteAdminAccess } from "@/lib/admin/server";

export async function SiteHeader() {
  const { user, isAdmin } = await siteAdminAccess();
  return <header className="relative z-20 border-b border-line bg-surface/95"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-4 lg:px-12">
    <Brand />
    <nav aria-label="Main navigation" className="order-3 flex w-full items-center gap-6 border-t border-surface-muted pt-3 text-sm font-semibold text-muted sm:order-none sm:w-auto sm:border-0 sm:pt-0"><Link className="hover:text-brand" href="/#features">Features</Link><Link className="hover:text-brand" href="/#roadmap">Roadmap</Link>{user && <Link className="hover:text-brand" href="/dashboard">Dashboard</Link>}</nav>
    {user ? <AccountControls email={user.email ?? ""} initials={(user.email ?? "P").slice(0, 2).toUpperCase()} isAdmin={isAdmin} /> : <Link href="/auth" className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-on-brand transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Open Your Logbook <span aria-hidden="true">↗</span></Link>}
  </div></header>;
}
