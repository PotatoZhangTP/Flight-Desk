"use client";
import { T, useText } from "@/components/i18n";


import Link from "@/components/navigation-link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ServerActionForm } from "./server-action-form";
import { SubmitButton } from "./async-button";
import { signOut } from "@/app/auth/actions";

export function UserMenuClient({ initials, avatarUrl }: { initials: string; avatarUrl?: string | null }) {
  const t = useText();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) { if (!root.current?.closest("[inert]") && !root.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (!root.current?.closest("[inert]") && event.key === "Escape" && open) { setOpen(false); trigger.current?.focus(); } }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const linkClass = "block rounded-xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand";
  return <div ref={root} className="relative" onBlur={event => { if (!event.currentTarget.closest("[inert]") && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label={t("header.openUserMenu")} className="rounded-full transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand">
      <span className="grid h-10 w-10 overflow-hidden place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">{avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}</span>
    </button>
    {open && <div role="menu" className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-line bg-elevated p-2 shadow-xl shadow-ink/10">
      <Link href="/settings" onClick={() => { if (pathname === "/settings") setOpen(false); }} className={linkClass}><T id="settings.account" /></Link>
      <ServerActionForm action={signOut}><SubmitButton busyLabel={t("Signing out…")} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-danger-action transition-colors hover:bg-danger-bg hover:text-danger-action-hover focus-visible:outline-2 focus-visible:outline-danger-action"><T id="auth.signOut" /></SubmitButton></ServerActionForm>
    </div>}
  </div>;
}
