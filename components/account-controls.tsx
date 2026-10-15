import Link from "next/link";
import { UserMenuClient } from "./user-menu-client";

export function AccountControls({ email, initials, isAdmin }: { email: string; initials: string; isAdmin: boolean }) {
  return <div className="flex shrink-0 items-center gap-2">
    {isAdmin && <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 px-3 py-2 text-xs font-semibold text-brand transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="m10 2 6 2.5v5c0 4-6 7.5-6 7.5s-6-3.5-6-7.5v-5L10 2Z" strokeLinejoin="round" /></svg>Admin Panel</Link>}
    <UserMenuClient email={email} initials={initials} />
  </div>;
}
