import Link from "next/link";
import { redirect } from "next/navigation";
import { BioEditor } from "@/components/bio-editor";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/profile");
  const [{ data: profile }, { data: flights, error }] = await Promise.all([
    supabase.from("profiles").select("display_name, bio").eq("id", user.id).maybeSingle(),
    supabase.from("flights").select("duration_minutes, aircraft_type, departure_airport, arrival_airport").eq("user_id", user.id),
  ]);
  const name = profile?.display_name?.trim() || user.email?.split("@")[0] || "Pilot";
  const records = flights ?? [];
  const totalMinutes = records.reduce((sum, flight) => sum + (flight.duration_minutes ?? 0), 0);
  const aircraft = new Set(records.map((flight) => flight.aircraft_type).filter(Boolean)).size;
  const airports = new Set(records.flatMap((flight) => [flight.departure_airport, flight.arrival_airport]).filter(Boolean)).size;
  return <div className="min-h-screen bg-[#f7f9fc]"><header className="flex items-center justify-between border-b border-[#d9e2ec] bg-white px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={name.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-5xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="text-sm font-semibold text-[#627d98]">← Back to dashboard</Link>{error ? <div className="mt-8 rounded-2xl border border-[#f3c5bd] bg-[#fff5f2] p-5 text-sm text-[#b94a3d]">We couldn’t load your profile statistics. Please refresh and try again.</div> : <><section className="mt-8 rounded-2xl border border-[#d9e2ec] bg-white p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center"><div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-[#dff4f0] text-2xl font-bold text-[#168c82]">{name.slice(0, 2).toUpperCase()}</div><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#e8753a]">Aviation profile</p><h1 className="mt-2 text-3xl font-bold text-[#102a43]">{name}</h1><p className="mt-2 text-sm text-[#829ab1]">Member since {new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p></div></div><div className="mt-8 border-t border-[#edf2f7] pt-6"><h2 className="text-lg font-bold text-[#102a43]">About</h2><BioEditor initialBio={profile?.bio ?? ""} /></div></section><section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><ProfileStat label="Flights" value={String(records.length)} /><ProfileStat label="Flight time" value={`${Math.floor(totalMinutes / 60)}h`} detail={totalMinutes ? `${totalMinutes % 60}m additional` : "No duration yet"} /><ProfileStat label="Aircraft types" value={aircraft ? String(aircraft) : "—"} /><ProfileStat label="Airports" value={airports ? String(airports) : "—"} /></section><section className="mt-6 rounded-2xl border border-[#d9e2ec] bg-white p-6"><h2 className="text-xl font-bold text-[#102a43]">Aviation journey</h2><p className="mt-2 text-sm text-[#627d98]">A place for your favourite airlines, aircraft and future flying map.</p><div className="mt-5 grid gap-4 sm:grid-cols-3"><Placeholder title="Favourite airlines" /><Placeholder title="Favourite aircraft" /><Placeholder title="Flying map" /></div></section><section className="mt-6 rounded-2xl border border-[#d9e2ec] bg-white p-6"><h2 className="text-xl font-bold text-[#102a43]">Achievements</h2><div className="mt-4 rounded-xl bg-[#f7f9fc] p-6 text-center text-sm text-[#829ab1]">Achievement badges will appear here as your flying history grows.</div></section></>}</main></div>;
}

function ProfileStat({ label, value, detail }: { label: string; value: string; detail?: string }) { return <div className="rounded-2xl border border-[#d9e2ec] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#829ab1]">{label}</p><p className="mt-2 text-3xl font-bold text-[#102a43]">{value}</p><p className="mt-1 text-xs text-[#627d98]">{detail ?? (value === "—" ? "Not available yet" : "From your private logbook")}</p></div>; }
function Placeholder({ title }: { title: string }) { return <div className="rounded-xl border border-dashed border-[#bcccdc] p-5"><p className="font-bold text-[#102a43]">{title}</p><p className="mt-2 text-sm text-[#829ab1]">Coming soon</p></div>; }
