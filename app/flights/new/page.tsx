import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { FlightForm } from "@/components/flight-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewFlightPage() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/auth?next=/flights/new"); const name = user.email?.split("@")[0] || "Pilot"; return <div className="min-h-screen bg-page"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={name.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-5xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="text-sm font-semibold text-muted"><T id="common.backDashboard" /></Link><div className="mt-8 mb-8"><div className="flex items-center justify-between gap-4"><h1 className="text-4xl font-bold tracking-tight text-brand"><T id="flight.add" /></h1><span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-brand-soft text-brand"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4Z" /><path d="M16 5v2m0 3v4m0 3v2M7 12h5m-2-2 2 2-2 2" /></svg></span></div></div><FlightForm /></main></div>; }
