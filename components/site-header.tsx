import Link from "next/link";
import { Brand } from "./brand";
import { UserMenuClient } from "./user-menu-client";
import { roadmapAccess } from "@/lib/roadmap/server";

export async function SiteHeader() {
  const { user, isAdmin } = await roadmapAccess();
  return <header className="relative z-20 border-b border-[#d9e2ec] bg-white/95"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-4 lg:px-12">
    <Brand />
    <nav aria-label="Main navigation" className="order-3 flex w-full items-center gap-6 border-t border-[#edf2f7] pt-3 text-sm font-semibold text-[#486581] sm:order-none sm:w-auto sm:border-0 sm:pt-0"><Link className="hover:text-[#168c82]" href="/#features">Features</Link><Link className="hover:text-[#168c82]" href="/roadmap">Roadmap</Link>{user && <Link className="hover:text-[#168c82]" href="/dashboard">Dashboard</Link>}</nav>
    {user ? <UserMenuClient email={user.email ?? ""} initials={(user.email ?? "P").slice(0, 2).toUpperCase()} isAdmin={isAdmin} /> : <Link href="/auth" className="rounded-full bg-[#102a43] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#244968]">Get started <span aria-hidden="true">↗</span></Link>}
  </div></header>;
}
