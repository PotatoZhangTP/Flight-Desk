"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { T } from "@/components/i18n";
import type { FlightMapData } from "@/lib/flight-map-data";
import type { PassportFlight } from "@/lib/passport-visits";

const DemoMap = dynamic(() => import("@/components/flight-map").then(module => module.FlightMap), {
  ssr: false,
  loading: () => <ShowcaseLoading labelId="landing.loadingMap" />,
});
const DemoPassport = dynamic(() => import("@/components/aviation-passport").then(module => module.AviationPassport), {
  ssr: false,
  loading: () => <ShowcaseLoading labelId="landing.loadingPassport" />,
});

const demoAirports: Array<[string, string, [number, number], string]> = [
  ["LHR", "London Heathrow", [-0.4543, 51.47], "GB"],
  ["JFK", "John F. Kennedy International", [-73.7781, 40.6413], "US"],
  ["HND", "Tokyo Haneda", [139.7798, 35.5494], "JP"],
  ["SIN", "Singapore Changi", [103.994, 1.3644], "SG"],
  ["SYD", "Sydney Kingsford Smith", [151.1772, -33.9461], "AU"],
  ["DXB", "Dubai International", [55.3644, 25.2532], "AE"],
];

const airportFeatures: GeoJSON.Feature<GeoJSON.Point>[] = demoAirports.map(([code, name, coordinates, countryCode]) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates },
  properties: { code, name, countryCode, count: 1 },
}));

const demoRoutes: Array<Array<[number, number]>> = [
  [[-0.4543, 51.47], [-30, 55], [-55, 48], [-73.7781, 40.6413]],
  [[139.7798, 35.5494], [125, 25], [112, 12], [103.994, 1.3644]],
  [[151.1772, -33.9461], [120, -18], [85, 2], [55.3644, 25.2532]],
];

const routeFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = demoRoutes.map((coordinates, index) => ({
  type: "Feature",
  geometry: { type: "LineString", coordinates },
  properties: { demo: true, route: index + 1 },
}));

const demoMapData: FlightMapData = {
  routes: { type: "FeatureCollection", features: routeFeatures },
  airports: { type: "FeatureCollection", features: airportFeatures },
  skipped: 0,
  completedFlights: 3,
  initialCenter: [25, 22],
};

const demoFlights: PassportFlight[] = [
  { id: "landing-demo-1", flight_date: "2024-04-18", status: "completed", departure_country_code: "GB", arrival_country_code: "US" },
  { id: "landing-demo-2", flight_date: "2024-08-02", status: "completed", departure_country_code: "JP", arrival_country_code: "SG" },
  { id: "landing-demo-3", flight_date: "2025-02-11", status: "completed", departure_country_code: "AU", arrival_country_code: "AE" },
];

function ShowcaseLoading({ labelId }: { labelId: string }) {
  return <div className="grid h-full min-h-[360px] place-items-center rounded-2xl border border-dashed border-line bg-page/60 p-6 text-center text-sm text-muted"><T id={labelId} /></div>;
}

export function LandingProductShowcase() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const target = root.current;
    if (!target || active) return;
    if (!("IntersectionObserver" in window)) { setActive(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setActive(true); observer.disconnect(); }
    }, { rootMargin: "320px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [active]);

  return <section ref={root} id="explore-flight-desk" aria-labelledby="explore-flight-desk-title" className="site-container landing-section">
    <h2 id="explore-flight-desk-title" className="text-center text-3xl font-bold tracking-tight sm:text-4xl"><T id="landing.exploreTitle" /></h2>
    <div className="landing-experience-grid mt-7">
      <article className="landing-experience-card spotlight-card">
        <p className="mb-4 text-sm leading-6 text-muted"><T id="landing.exploreMapHelp" /></p>
        <div className="landing-map-demo">{active ? <DemoMap data={demoMapData} compact defaultMode="3d" persistMode={false} /> : <ShowcaseLoading labelId="landing.mapPreview" />}</div>
      </article>
      <article className="landing-experience-card landing-passport-card spotlight-card">
        <p className="mb-4 text-sm leading-6 text-muted"><T id="landing.explorePassportHelp" /></p>
        {active ? <DemoPassport demo displayName="Flight Desk Guest" passportNumber={2026} memberSince="2024-01-01" userId="landing-public-demo" flights={demoFlights} totalFlights={3} countries={6} minutes={1960} /> : <ShowcaseLoading labelId="landing.passportPreview" />}
      </article>
    </div>
  </section>;
}
