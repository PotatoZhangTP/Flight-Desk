import { T, LocalizedNav } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { Brand } from "./brand";
import { PreferencesMenu } from "./preferences-menu";
import { LogbookLink } from "./logbook-link";
import { UserMenu } from "./user-menu";
import { requestAuth } from "@/lib/auth/server";

export async function SiteHeader() {
  const { user } = await requestAuth();
  return <header className="site-header relative z-20 border-b border-line bg-surface/95"><div className="site-container flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4">
    <Brand />
    <LocalizedNav label="Main navigation" className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-3 border-t border-surface-muted pt-3 text-sm font-semibold text-muted lg:order-none lg:w-auto lg:border-0 lg:pt-0"><Link className="rounded hover:text-brand focus-visible:outline-2 focus-visible:outline-brand" href="/#features"><T id="common.features" /></Link><Link className="rounded hover:text-brand focus-visible:outline-2 focus-visible:outline-brand" href="/roadmap"><T id="common.roadmap" /></Link><Link className="rounded transition hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand" href="/pricing"><T id="common.pricing" /></Link>{user && <Link className="hover:text-brand" href="/dashboard"><T id="common.dashboard" /></Link>}</LocalizedNav>
    <div className="site-header-controls flex flex-wrap items-center gap-3">{user ? <UserMenu email={user.email ?? ""} initials={(user.email ?? "P").slice(0, 2).toUpperCase()} /> : <><PreferencesMenu /><LogbookLink /></>}</div>
  </div></header>;
}
