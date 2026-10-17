"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "@/components/navigation-link";
import { T } from "@/components/i18n";

function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </span>
  );
}

export function AddFlightDropdown() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative z-40">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="button-primary">
        <span aria-hidden="true" className="mr-1 text-lg leading-none">+</span>
        <T id="flight.add" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-2 text-left shadow-sm">
          <Link href="/flights/new" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <MenuIcon><path d="M12 5v14M5 12h14" /></MenuIcon>
            <span className="min-w-0 flex-1"><strong className="block text-sm font-bold text-ink"><T source="Add Manually" /></strong><span className="block text-xs text-muted"><T source="Enter flight details" /></span></span>
            <span aria-hidden="true" className="text-lg text-brand">→</span>
          </Link>
          <div className="my-1 border-t border-line" />
          <MenuItem icon={<path d="M4 5h16v14H4zM8 9h8M8 13h5" />} title="Import from Excel" description="Bulk import flight history" />
          <div className="my-1 border-t border-line" />
          <MenuItem icon={<path d="M4 17h16M6 17l2-7h8l2 7M10 10V6h4v4M12 3v3" />} title="Import from SimBrief" description="Import a generated flight plan" />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3 opacity-75">
      <MenuIcon>{icon}</MenuIcon>
      <span className="min-w-0 flex-1"><strong className="block text-sm font-bold text-ink">{title}</strong><span className="block text-xs text-muted">{description}</span></span>
      <span className="rounded-full bg-page px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-subtle"><T id="common.soon" /></span>
    </div>
  );
}
