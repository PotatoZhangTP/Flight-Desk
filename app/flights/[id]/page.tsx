import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { FlightForm } from "@/components/flight-form";
import { UserMenu } from "@/components/user-menu";
import { createClient } from "@/lib/supabase/server";
import { CountryFlag } from "@/components/country-flag";

export default async function FlightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/flights/${id}`);
  const { data: flight, error } = await supabase.from("flights").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error || !flight) notFound();
  return <div className="min-h-screen bg-page"><header className="flex items-center justify-between border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={(user.email?.slice(0, 2) || "P").toUpperCase()} /></header><main className="mx-auto max-w-5xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="text-sm font-semibold text-muted">← Back to dashboard</Link><div className="mt-8 mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">Flight record</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-ink">{flight.departure_airport_iata || flight.departure_airport} → {flight.arrival_airport_iata || flight.arrival_airport}</h1><p className="mt-2 text-muted"><CountryFlag code={flight.departure_country_code} /> {flight.departure_airport_name || flight.departure_airport} · <CountryFlag code={flight.arrival_country_code} /> {flight.arrival_airport_name || flight.arrival_airport}</p></div><Link href={`/flights/${id}/edit`} className="rounded-full bg-brand px-6 py-3 text-center font-bold text-on-brand shadow-lg shadow-brand/10 transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-page">Edit flight</Link></div><FlightSummary flight={flight} /></main></div>;
}

function FlightSummary({ flight }: { flight: Record<string, any> }) { return <section className="rounded-2xl border border-line bg-surface p-6"><div className="grid gap-5 sm:grid-cols-2"><Info label="Airline" value={[flight.airline, flight.flight_number].filter(Boolean).join(" · ") || "—"} /><Info label="Aircraft" value={[flight.aircraft_type, flight.registration].filter(Boolean).join(" · ") || "—"} /><Info label="Scheduled duration" value={flight.scheduled_duration_minutes == null ? "—" : `${Math.floor(flight.scheduled_duration_minutes / 60)}h ${flight.scheduled_duration_minutes % 60}m`} /><Info label="Actual duration" value={flight.actual_duration_minutes == null ? "—" : `${Math.floor(flight.actual_duration_minutes / 60)}h ${flight.actual_duration_minutes % 60}m`} /><Info label="Departure" value={`${flight.departure_local_date || flight.flight_date || "—"} ${flight.departure_local_time || ""} · ${flight.departure_timezone || ""}`} /><Info label="Arrival" value={`${flight.arrival_local_date || "—"} ${flight.arrival_local_time || ""} · ${flight.arrival_timezone || ""}`} /></div>{flight.notes && <div className="mt-6 border-t border-line pt-5"><p className="text-xs font-bold uppercase tracking-wider text-subtle">Notes</p><p className="mt-2 whitespace-pre-wrap text-muted">{flight.notes}</p></div>}</section>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wider text-subtle">{label}</p><p className="mt-1 font-semibold text-ink">{value}</p></div>; }
