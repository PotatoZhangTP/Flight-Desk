"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "@/app/auth/actions";

export function UserMenu({ email, initials }: { email: string; initials: string }) {
  const [open, setOpen] = useState(false);
  return <div className="relative"><button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Open user menu" className="flex items-center gap-3 rounded-full p-1.5 transition hover:bg-[#f7f9fc]"><span className="hidden max-w-[180px] truncate text-sm text-[#627d98] sm:inline">{email}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#dff4f0] text-sm font-bold text-[#168c82]">{initials}</span><span className="hidden text-xs text-[#829ab1] sm:inline">⌄</span></button>{open && <div className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border border-[#d9e2ec] bg-white p-2 shadow-xl shadow-[#102a43]/10"><Link href="/profile" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#102a43] hover:bg-[#f7f9fc]">My Profile</Link><Link href="/settings" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#102a43] hover:bg-[#f7f9fc]">Settings</Link><form action={signOut}><button className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#b94a3d] hover:bg-[#fff5f2]">Sign out</button></form></div>}</div>;
}
