import { flightCountry } from "@/lib/flight-country";
import { isCompletedPassportFlight, passportVisits } from "@/lib/passport-visits";
import { T } from "@/components/i18n";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { StatCard } from "@/components/stat-card";
import { UserMenu } from "@/components/user-menu";
import { DashboardRecentFlights } from "@/components/dashboard-recent-flights";
import { DashboardFlightMap } from "@/components/dashboard-flight-map";
import { DailyChallengeModule, AviationPassportDataModule, ReportsModule, FeedbackModule } from "@/components/dashboard-v2-modules";
import { requestAuth } from "@/lib/auth/server";
import { AddFlightDropdown } from "@/components/add-flight-dropdown";
import { DashboardSpotlight } from "@/components/dashboard-spotlight";
import { airportCoordinateMap, completedFlightStats } from "@/lib/flight-stats";
import { formatDistance, normalizePreferences, type UserPreferences } from "@/lib/preferences";
import { buildFlightMapData, type MapAirportRow, type MapFlight } from "@/lib/flight-map-data";
import { DashboardAchievements, DashboardAchievementsFallback } from "@/components/dashboard-achievements";
import { Suspense } from "react";
import { formatAircraftDisplayName, loadAircraftDisplayMap } from "@/lib/aircraft-catalog";

export default async function DashboardPage() {
  const { supabase, user } = await requestAuth(); if (!user) redirect("/auth?next=/dashboard");
  const readPassportFlights = async () => {
    const query = supabase.from("flights").select("id,flight_date,status,actual_duration_minutes,scheduled_duration_minutes,duration_minutes,aircraft_type,departure_airport_icao,arrival_airport_icao,departure_airport_iata,arrival_airport_iata,departure_airport,arrival_airport,departure_country_code,arrival_country_code").eq("user_id", user.id);
    const first = await query.order("id").range(0, 999);
    if (first.error) return first;
    const data = [...(first.data ?? [])];
    if (data.length === 1000) for (let offset = 1000; ; offset += 1000) {
      const batch = await query.range(offset, offset + 999);
      if (batch.error) return { data: null, error: batch.error };
      data.push(...(batch.data ?? []));
      if (!batch.data || batch.data.length < 1000) break;
    }
    return { data, error: null };
  };
  const [{ data: profile, error: profileError }, { data: all, error: statsError }, { data: flights, error: flightsError }] = await Promise.all([
    supabase.from("profiles").select("display_name,avatar_url,passport_number,created_at,date_format,distance_unit,time_format,passport_cover_background,passport_title_color,passport_brand_color,passport_title_font,passport_cover_texture,passport_inner_background,passport_inner_title_color,passport_inner_font,passport_inner_texture,passport_inner_texture_color,passport_inner_page_number_color").eq("id", user.id).maybeSingle(),
    readPassportFlights(),
    supabase.from("flights").select("id,flight_date,departure_airport,arrival_airport,aircraft_type,duration_minutes,status").eq("user_id", user.id).order("flight_date", { ascending: false }).limit(50),
  ]);
  const profileRead = profileError ? await supabase.from("profiles").select("display_name,avatar_url,created_at,date_format,distance_unit,time_format").eq("id", user.id).maybeSingle() : { data: profile, error: null }; const profileRecord = profileRead.data as { display_name?: string | null; avatar_url?: string | null; passport_number?: number | null; created_at?: string; distance_unit?: string; passport_cover_background?: string | null; passport_title_color?: string | null; passport_brand_color?: string | null; passport_title_font?: string | null; passport_cover_texture?: string | null; passport_cover_texture_color?: string | null; passport_inner_background?: string | null; passport_inner_title_color?: string | null; passport_inner_font?: string | null; passport_inner_texture?: string | null; passport_inner_texture_color?: string | null; passport_inner_page_number_color?: string | null } | null; const rows = all ?? [];
  const recentAircraftDisplayMap = await loadAircraftDisplayMap(supabase, (flights ?? []).map((flight) => flight.aircraft_type));
  const recentFlights = (flights ?? []).map((flight) => ({ ...flight, aircraft_display_name: formatAircraftDisplayName(flight.aircraft_type, null, recentAircraftDisplayMap) }));
  const codes = [...new Set(rows.flatMap(row => [row.departure_airport_icao, row.arrival_airport_icao, row.departure_airport_iata, row.arrival_airport_iata, row.departure_airport, row.arrival_airport]).filter((code): code is string => Boolean(code)).map(code => code.trim().toUpperCase()))];
  const airportFields = "name,municipality,country_code,country_name,icao_code,iata_code,ident,latitude,longitude";
  const [{ data: icao }, { data: iata }, { data: ident }] = codes.length ? await Promise.all([supabase.from("airports").select(airportFields).in("icao_code", codes), supabase.from("airports").select(airportFields).in("iata_code", codes), supabase.from("airports").select(airportFields).in("ident", codes)]) : [{ data: [] }, { data: [] }, { data: [] }];
  const airportRows = [...(icao ?? []), ...(iata ?? []), ...(ident ?? [])] as MapAirportRow[];
  const stats = completedFlightStats(rows, airportCoordinateMap(airportRows)); const name = profileRecord?.display_name?.trim() || user.email?.split("@")[0] || "Pilot"; const distance = stats.totalDistanceKm ? formatDistance(stats.totalDistanceKm, normalizePreferences({ distanceUnit: profileRecord?.distance_unit as UserPreferences["distanceUnit"] }).distanceUnit) : "—"; const airportCountries = new Map<string, { countryCode: string | null }>();
  for (const airport of airportRows) for (const code of [airport.icao_code, airport.iata_code, airport.ident]) if (code) airportCountries.set(code.trim().toUpperCase(), { countryCode: airport.country_code ?? null });
  const passportFlights = rows.filter(isCompletedPassportFlight).map(row => ({ id: row.id, status: row.status, flight_date: row.flight_date, departure_country_code: flightCountry(row, "departure", airportCountries), arrival_country_code: flightCountry(row, "arrival", airportCountries) }));
  const passportCountryCount = passportVisits(passportFlights).size;
  const mapFlights = rows.filter(row => row.status === "completed").sort((left, right) => String(right.flight_date ?? "").localeCompare(String(left.flight_date ?? ""))) as MapFlight[];
  const mapData = buildFlightMapData(mapFlights, airportRows);
  return <div className="min-h-screen bg-page"><DashboardSpotlight /><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={name.slice(0, 2).toUpperCase()} profile={{ displayName: profileRecord?.display_name, avatarUrl: profileRecord?.avatar_url }} /></header><main className="mx-auto max-w-7xl px-6 py-10 lg:px-12"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><h1 className="text-4xl font-bold tracking-tight"><T id="dashboard.greeting" /> {name}.</h1><div className="flex justify-end"><AddFlightDropdown /></div></div>{profileRead.error || statsError || flightsError ? <div className="mt-8 rounded-2xl border border-danger-line bg-danger-bg p-5 text-sm text-danger-fg"><T id="dashboard.error" /></div> : <><div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6"><StatCard label="Total Flights" value={String(stats.completedCount)} /><StatCard label="Flight Time" value={`${Math.floor(stats.minutes / 60)}h`} detail={`${stats.minutes % 60}m`} /><StatCard label="Airports" value={String(stats.airports)} /><StatCard label="Countries" value={String(stats.countries)} /><StatCard label="Aircraft" value={String(stats.aircraft)} /><StatCard label="Total Distance" value={distance} /></div><div className="mt-8 grid items-stretch gap-6 lg:grid-cols-[4fr_6fr]"><DashboardFlightMap data={mapData} /><AviationPassportDataModule displayName={profileRecord?.display_name} avatarUrl={profileRecord?.avatar_url} passportNumber={profileRecord?.passport_number} memberSince={profileRecord?.created_at ?? new Date().toISOString()} userId={user.id} flights={passportFlights} totalFlights={stats.completedCount} countries={passportCountryCount} minutes={stats.minutes} passportCoverBackground={profileRecord?.passport_cover_background} passportTitleColor={profileRecord?.passport_title_color} passportBrandColor={profileRecord?.passport_brand_color} passportTitleFont={profileRecord?.passport_title_font} passportCoverTexture={profileRecord?.passport_cover_texture} passportCoverTextureColor={profileRecord?.passport_cover_texture_color} passportInnerBackground={profileRecord?.passport_inner_background} passportInnerTitleColor={profileRecord?.passport_inner_title_color} passportInnerFont={profileRecord?.passport_inner_font} passportInnerTexture={profileRecord?.passport_inner_texture} passportInnerTextureColor={profileRecord?.passport_inner_texture_color} passportInnerPageNumberColor={profileRecord?.passport_inner_page_number_color} /></div><div className="mt-8 grid items-stretch gap-6 lg:grid-cols-[3fr_2fr]"><DashboardRecentFlights flights={recentFlights} /><DailyChallengeModule /></div><div className="mt-8 grid items-stretch gap-6 lg:grid-cols-[1fr_3fr_1fr]"><ReportsModule /><Suspense fallback={<DashboardAchievementsFallback />}><DashboardAchievements userId={user.id} /></Suspense><FeedbackModule /></div></>}</main></div>;
}
