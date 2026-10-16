import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { StatCard } from "@/components/stat-card";
import { UserMenu } from "@/components/user-menu";
import { DashboardRecentFlights } from "@/components/dashboard-recent-flights";
import { DashboardFlightMap } from "@/components/dashboard-flight-map";
import { createClient } from "@/lib/supabase/server";
import { UpcomingButton } from "@/components/upcoming-button";
import { airportCoordinateMap, completedFlightStats } from "@/lib/flight-stats";
import { formatDistance, normalizePreferences } from "@/lib/preferences";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/dashboard");
  const [{ data: profile, error: profileError }, { data: all, error: statsError }, { data: flights, error: flightsError }] = await Promise.all([
    supabase.from("profiles").select("display_name,date_format,distance_unit,time_format").eq("id", user.id).maybeSingle(),
    supabase.from("flights").select("status,actual_duration_minutes,scheduled_duration_minutes,duration_minutes,aircraft_type,departure_airport_icao,arrival_airport_icao,departure_airport_iata,arrival_airport_iata,departure_airport,arrival_airport,departure_country_code,arrival_country_code").eq("user_id", user.id),
    supabase.from("flights").select("id,flight_date,departure_airport,arrival_airport,aircraft_type,duration_minutes,status").eq("user_id", user.id).order("flight_date", { ascending: false }).limit(50),
  ]);
  const rows = all ?? [];
  const airportCodes = [...new Set(rows.flatMap((row) => [row.departure_airport_icao, row.arrival_airport_icao, row.departure_airport_iata, row.arrival_airport_iata, row.departure_airport, row.arrival_airport]).filter((code): code is string => Boolean(code)).map((code) => code.trim().toUpperCase()))];
  const [{ data: icao }, { data: iata }, { data: ident }] = airportCodes.length ? await Promise.all([
    supabase.from("airports").select("icao_code,iata_code,ident,latitude,longitude").in("icao_code", airportCodes),
    supabase.from("airports").select("icao_code,iata_code,ident,latitude,longitude").in("iata_code", airportCodes),
    supabase.from("airports").select("icao_code,iata_code,ident,latitude,longitude").in("ident", airportCodes),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  const stats = completedFlightStats(rows, airportCoordinateMap([...(icao ?? []), ...(iata ?? []), ...(ident ?? [])]));
  const name = profile?.display_name?.trim() || user.email?.split("@")[0] || "Pilot";
  const distance = stats.totalDistanceKm ? formatDistance(stats.totalDistanceKm, normalizePreferences({ dateFormat: profile?.date_format, distanceUnit: profile?.distance_unit, timeFormat: profile?.time_format }).distanceUnit) : "—";
  return <div className="min-h-screen bg-page"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={name.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-7xl px-6 py-10 lg:px-12"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><h1 className="text-4xl font-bold tracking-tight"><T id="dashboard.greeting" /> {name}.</h1><div className="flex gap-3"><UpcomingButton className="rounded-full border border-line px-6 py-3 font-bold text-brand"><T id="dashboard.importButton" /></UpcomingButton><Link href="/flights/new" className="rounded-full bg-brand px-6 py-3 font-bold text-on-brand"><T id="flight.addLink" /></Link></div></div>{profileError || statsError || flightsError ? <div className="mt-8 rounded-2xl border border-danger-line bg-danger-bg p-5 text-sm text-danger-fg"><T id="dashboard.error" /></div> : <><div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6"><StatCard label="Total Flights" value={String(stats.completedCount)} /><StatCard label="Flight Time" value={`${Math.floor(stats.minutes / 60)}h`} detail={`${stats.minutes % 60}m`} /><StatCard label="Airports" value={String(stats.airports)} /><StatCard label="Countries" value={String(stats.countries)} /><StatCard label="Aircraft" value={String(stats.aircraft)} /><StatCard label="Total Distance" value={distance} /></div><div className="mt-8 grid items-stretch gap-6 lg:grid-cols-[1.1fr_.9fr]"><DashboardRecentFlights flights={flights ?? []} /><DashboardFlightMap /></div></>}</main></div>;
}
