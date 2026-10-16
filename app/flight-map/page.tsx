import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { T } from "@/components/i18n";
import { FlightMap } from "@/components/flight-map";
import { createClient } from "@/lib/supabase/server";
import { getFlightMapData } from "@/lib/flight-map-data";

export default async function FlightMapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/flight-map");
  let data; let error = false;
  try { data = await getFlightMapData(supabase, user.id); } catch { error = true; }
  return <div className="min-h-screen bg-page"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={(user.email ?? "P").slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-7xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="button-secondary"><T id="common.backDashboard" /></Link><div className="mt-8"><h1 className="text-4xl font-bold tracking-tight text-brand"><T id="dashboard.map" /></h1><p className="mt-2 text-muted"><T id="map.subtitle" /></p></div><div className="mt-8 min-h-[520px]">{error ? <div className="grid min-h-[520px] place-items-center rounded-2xl border border-danger-line bg-danger-bg p-6 text-center text-danger-fg"><div><T id="map.loadError" /><div><Link href="/flight-map" className="button-secondary mt-4"><T id="common.retry" /></Link></div></div></div> : data?.routes.features.length ? <FlightMap data={data} /> : <div className="grid min-h-[520px] place-items-center rounded-2xl border border-dashed border-line bg-surface p-6 text-center text-muted"><T id="map.empty" /></div>}</div></main></div>;
}
