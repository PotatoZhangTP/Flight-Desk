import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { FlightForm } from "@/components/flight-form";
import { createClient } from "@/lib/supabase/server";
import { displayCountryCode, loadCountryMappings } from "@/lib/country-region";

export default async function NewFlightPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/flights/new");
  const params = await searchParams;
  const names = [params.departure, params.arrival].filter(Boolean) as string[];
  const { data: airports } = names.length ? await supabase.from("airports").select("id,ident,name,iata_code,icao_code,country_code,country_name,municipality,timezone,latitude,longitude").in("iata_code", names.map(value => value.toUpperCase())) : { data: [] };
  const mappings = await loadCountryMappings(supabase);
  const byIata = new Map((airports ?? []).map(airport => [airport.iata_code, { ...airport, country_code: displayCountryCode(airport.country_code, mappings) }]));
  const initialData = {
    departure_airport: byIata.get(params.departure?.toUpperCase() || "")?.name,
    departure_airport_iata: params.departure?.toUpperCase(),
    departure_airport_icao: byIata.get(params.departure?.toUpperCase() || "")?.icao_code,
    departure_country_code: byIata.get(params.departure?.toUpperCase() || "")?.country_code,
    arrival_airport: byIata.get(params.arrival?.toUpperCase() || "")?.name,
    arrival_airport_iata: params.arrival?.toUpperCase(),
    arrival_airport_icao: byIata.get(params.arrival?.toUpperCase() || "")?.icao_code,
    arrival_country_code: byIata.get(params.arrival?.toUpperCase() || "")?.country_code,
  };
  const name = user.email?.split("@")[0] || "Pilot";
  return <div className="min-h-screen bg-page"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={name.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-5xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="text-sm font-semibold text-muted"><T id="common.backDashboard" /></Link><div className="mt-8 mb-8"><div className="flex items-center justify-between gap-4"><h1 className="text-4xl font-bold tracking-tight text-brand"><T id="flight.add" /></h1><span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-brand-soft text-brand"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0-2-4Z" /><path d="M16 5v2m0 3v4m0 3v2M7 12h5m-2-2 2 2-2 2" /></svg></span></div></div><FlightForm initialData={initialData} /></main></div>;
}
