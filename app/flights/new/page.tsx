import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { FlightForm } from "@/components/flight-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewFlightPage() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/auth?next=/flights/new"); const name = user.email?.split("@")[0] || "Pilot"; return <div className="min-h-screen bg-[#f7f9fc]"><header className="flex items-center justify-between border-b border-[#d9e2ec] bg-white px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={name.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-5xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="text-sm font-semibold text-[#627d98]">← Back to dashboard</Link><div className="mt-8 mb-8"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#e8753a]">New logbook entry</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#102a43]">Add a flight</h1><p className="mt-2 text-[#627d98]">Plan the journey details below. You can add actual duration separately.</p></div><FlightForm /></main></div>; }
