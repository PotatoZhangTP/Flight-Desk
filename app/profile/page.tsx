import { T, LocalizedDate, StatisticValue, StatisticDetail } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { BioEditor } from "@/components/bio-editor";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { createClient } from "@/lib/supabase/server";
import { completedFlightStats } from "@/lib/flight-stats";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/profile");
  const [{ data: profile }, { data: flights, error }] = await Promise.all([
    supabase.from("profiles").select("display_name, bio").eq("id", user.id).maybeSingle(),
    supabase.from("flights").select("status, actual_duration_minutes, scheduled_duration_minutes, duration_minutes, aircraft_type, departure_airport_icao, arrival_airport_icao, departure_airport_iata, arrival_airport_iata, departure_airport, arrival_airport, departure_country_code, arrival_country_code").eq("user_id", user.id),
  ]);
  const name = profile?.display_name?.trim() || user.email?.split("@")[0] || "Pilot";
  const stats = completedFlightStats(flights ?? []);
  const records = (flights ?? []).filter(flight => !flight.status || flight.status === "completed");
  const totalMinutes = stats.minutes;
  const aircraft = stats.aircraft;
  const airports = stats.airports;
  return <div className="min-h-screen bg-page"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={name.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-5xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="text-sm font-semibold text-muted"><T id="common.backDashboard" /></Link>{error ? <div className="mt-8 rounded-2xl border border-danger-line bg-danger-bg p-5 text-sm text-danger-fg"><T id="profile.statsError" /></div> : <><section className="mt-8 rounded-2xl border border-line bg-surface p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center"><div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-brand-soft text-2xl font-bold text-brand">{name.slice(0, 2).toUpperCase()}</div><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-brand"><T id="profile.aviation" /></p><h1 className="mt-2 text-3xl font-bold text-ink">{name}</h1><p className="mt-2 text-sm text-subtle"><T id="profile.memberSince" />{" "}<LocalizedDate value={user.created_at} monthOnly /></p></div></div><div className="mt-8 border-t border-line pt-6"><h2 className="text-lg font-bold text-ink"><T id="common.about" /></h2><BioEditor initialBio={profile?.bio ?? ""} /></div></section><section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><ProfileStat label="Flights" value={String(records.length)} /><ProfileStat label="Flight time" value={`${Math.floor(totalMinutes / 60)}h`} detail={totalMinutes ? `${totalMinutes % 60}m additional` : "No duration yet"} /><ProfileStat label="Aircraft types" value={aircraft ? String(aircraft) : "—"} /><ProfileStat label="Airports" value={airports ? String(airports) : "—"} /></section><section className="mt-6 rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold text-ink"><T id="profile.journey" /></h2><p className="mt-2 text-sm text-muted"><T id="profile.journeyHelp" /></p><div className="mt-5 grid gap-4 sm:grid-cols-3"><Placeholder title="Favourite airlines" /><Placeholder title="Favourite aircraft" /><Placeholder title="Flying map" /></div></section><section className="mt-6 rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold text-ink"><T id="profile.achievements" /></h2><div className="mt-4 rounded-xl bg-page p-6 text-center text-sm text-subtle"><T id="profile.achievementsEmpty" /></div></section></>}</main></div>;
}

function ProfileStat({ label, value, detail }: { label: string; value: string; detail?: string }) { return <div className="rounded-2xl border border-line bg-surface p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-subtle"><T source={label} /></p><p className="mt-2 text-3xl font-bold text-ink"><StatisticValue value={value} /></p><p className="mt-1 text-xs text-muted"><StatisticDetail value={detail ?? (value === "—" ? "Not available yet" : "From your private logbook")} /></p></div>; }
function Placeholder({ title }: { title: string }) { return <div className="rounded-xl border border-dashed border-line-strong p-5"><p className="font-bold text-ink"><T source={title} /></p><p className="mt-2 text-sm text-subtle"><T id="common.soon" /></p></div>; }
