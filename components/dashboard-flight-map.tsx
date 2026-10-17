import Link from "next/link";
import { T } from "@/components/i18n";
import { FlightMap } from "@/components/flight-map";
import { getFlightMapData } from "@/lib/flight-map-data";
import { createClient } from "@/lib/supabase/server";

export async function DashboardFlightMap() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  try {
    const data = await getFlightMapData(supabase, user.id);
    const empty = data.completedFlights === 0;
    return <section className="dashboard-module spotlight-card flex min-h-[270px] min-w-0 flex-col bg-brand-soft/30">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-bold"><T id="dashboard.map" /></h2><Link href="/flight-map" className="button-secondary"><T id="map.viewFull" /></Link></div>
      {data.routes.features.length ? <div className="min-h-0 flex-1"><FlightMap data={data} compact defaultMode="3d" persistMode={false} /></div> : empty ? <div className="grid min-h-[180px] flex-1 place-items-center rounded-xl border border-dashed border-brand/30 px-5 py-7 text-center"><div><div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m3 13 18-7-7 18-3-8Z" /><path d="m11 16 3-4" /></svg></div><h3 className="text-lg font-bold text-heading"><T id="map.emptyTitle" /></h3><p className="mx-auto mt-2 max-w-sm text-sm text-muted"><T id="map.emptyDescription" /></p><Link href="/flights/new" className="button-primary mt-5 inline-flex"><T id="map.addFirstFlight" /></Link></div></div> : <div className="grid min-h-[180px] flex-1 place-items-center rounded-xl border border-dashed border-brand/30 px-5 py-7 text-center text-sm text-muted"><T id="map.emptyData" /></div>}
    </section>;
  } catch {
    return <section className="dashboard-module spotlight-card min-h-[270px] bg-brand-soft/30"><h2 className="text-xl font-bold"><T id="dashboard.map" /></h2><div className="mt-6 rounded-xl border border-danger-line bg-danger-bg p-5 text-sm text-danger-fg"><T id="map.loadError" /></div></section>;
  }
}
