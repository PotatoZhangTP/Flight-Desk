import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { FlightForm } from "@/components/flight-form";
import { UserMenu } from "@/components/user-menu";
import { createClient } from "@/lib/supabase/server";

export default async function EditFlightPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/flights/${id}/edit`);
  const { data: flight, error } = await supabase.from("flights").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error || !flight) notFound();
  return <div className="min-h-screen bg-page"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={(user.email?.slice(0, 2) || "P").toUpperCase()} /></header><main className="mx-auto max-w-5xl px-6 py-10 lg:px-12"><Link href={`/flights/${id}`} className="text-sm font-semibold text-muted">← Back to flight</Link><div className="mt-8 mb-8"><p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">Edit logbook entry</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-ink">Edit flight</h1><p className="mt-2 text-muted">Update your journey details below.</p></div><FlightForm initialData={flight} /></main></div>;
}
