"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";

export function UserMenuClient({ email, initials, isAdmin }: { email: string; initials: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape" && open) { setOpen(false); trigger.current?.focus(); } }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const linkClass = "block rounded-xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand";
  return <div ref={root} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Open user menu" className="flex items-center gap-3 rounded-full p-1.5 transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand">
      <span className="hidden max-w-[180px] truncate text-sm text-muted sm:inline">{email}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">{initials}</span><span aria-hidden="true" className="hidden text-xs text-subtle sm:inline">⌄</span>
    </button>
    {open && <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-line bg-surface p-2 shadow-xl shadow-ink/10">
      <Link href="/profile" onClick={() => setOpen(false)} className={linkClass}>My Profile</Link>
      <Link href="/settings" onClick={() => setOpen(false)} className={linkClass}>Settings</Link>
      {isAdmin && <Link href="/admin/roadmap" onClick={() => setOpen(false)} className={linkClass}>Manage Roadmap</Link>}
      <form action={signOut}><button className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-danger-fg hover:bg-danger-bg focus-visible:outline-2 focus-visible:outline-brand">Sign out</button></form>
    </div>}
  </div>;
}
