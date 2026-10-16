"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { T } from "@/components/i18n";
import type { FlightMapData } from "@/lib/flight-map-data";

const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

export function FlightMap({ data, compact = false }: { data: FlightMapData; compact?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [mode, setMode] = useState<"2d" | "3d">(() => typeof window !== "undefined" && localStorage.getItem("flightdesk-map-mode") === "3d" ? "3d" : "2d");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!container.current || !styleUrl) return;
    let live = true;
    try {
      const instance = new maplibregl.Map({ container: container.current, style: styleUrl, center: [0, 20], zoom: 1.3, attributionControl: {} });
      instance.setProjection({ type: mode === "3d" ? "globe" : "mercator" });
      map.current = instance;
      instance.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-left");
      instance.on("load", () => {
        if (!live) return;
        instance.addSource("flight-routes", { type: "geojson", data: data.routes });
        instance.addLayer({ id: "flight-routes", type: "line", source: "flight-routes", paint: { "line-color": "#7554C8", "line-width": compact ? 2 : 3, "line-opacity": 0.7 } });
        instance.addSource("flight-airports", { type: "geojson", data: data.airports });
        instance.addLayer({ id: "flight-airports", type: "circle", source: "flight-airports", paint: { "circle-color": "#7554C8", "circle-radius": compact ? 4 : 6, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });
        instance.on("click", "flight-airports", event => { const feature = event.features?.[0]; if (!feature) return; const props = feature.properties ?? {}; const popup = document.createElement("div"); popup.textContent = `${props.name ?? "Airport"} · ${props.icao ?? ""} ${props.iata ?? ""} · Completed Flights: ${props.count ?? 0}`; new maplibregl.Popup({ closeButton: true }).setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number]).setDOMContent(popup).addTo(instance); });
        instance.on("mouseenter", "flight-airports", () => { instance.getCanvas().style.cursor = "pointer"; });
        instance.on("mouseleave", "flight-airports", () => { instance.getCanvas().style.cursor = ""; });
        instance.on("click", "flight-routes", event => { const feature = event.features?.[0]; if (!feature) return; const props = feature.properties ?? {}; const popup = document.createElement("div"); popup.textContent = `${props.from ?? ""} → ${props.to ?? ""} · Completed Flights: ${props.count ?? 0}`; new maplibregl.Popup({ closeButton: true }).setLngLat(event.lngLat).setDOMContent(popup).addTo(instance); });
        instance.on("mouseenter", "flight-routes", () => { instance.getCanvas().style.cursor = "pointer"; });
        instance.on("mouseleave", "flight-routes", () => { instance.getCanvas().style.cursor = ""; });
        setReady(true);
      });
      instance.on("error", event => { if (event.error) setError(event.error.message || "Map could not be loaded."); });
      return () => { live = false; instance.remove(); map.current = null; };
    } catch (exception) { setError(exception instanceof Error ? exception.message : "Map could not be loaded."); }
  }, [data, compact, mode]);
  useEffect(() => { if (!map.current) return; map.current.setProjection({ type: mode === "3d" ? "globe" : "mercator" }); try { localStorage.setItem("flightdesk-map-mode", mode); } catch { /* optional preference */ } }, [mode]);
  if (!styleUrl) return <div className="grid h-full min-h-[260px] place-items-center rounded-2xl border border-dashed border-line bg-page p-6 text-center text-sm text-muted"><T id="map.styleMissing" /></div>;
  if (error) return <div role="alert" className="grid h-full min-h-[260px] place-items-center rounded-2xl border border-danger-line bg-danger-bg p-6 text-center text-sm text-danger-fg"><div><T id="map.loadError" /><Link href="/flight-map" className="button-secondary mt-4"><T id="common.retry" /></Link></div></div>;
  return <div className="relative h-full min-h-[260px] overflow-hidden rounded-2xl" style={{ minHeight: compact ? "260px" : "520px" }}><div ref={container} className="absolute inset-0" />{ready && <div className="absolute right-3 top-3 z-10 flex rounded-full border border-line bg-elevated p-1 shadow-lg"><button type="button" onClick={() => setMode("2d")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${mode === "2d" ? "bg-brand text-on-brand" : "text-brand"}`}>2D</button><button type="button" onClick={() => setMode("3d")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${mode === "3d" ? "bg-brand text-on-brand" : "text-brand"}`}>3D</button></div>}{!ready && <div className="absolute inset-0 grid place-items-center bg-page/60 text-sm text-muted"><T id="map.loading" /></div>}</div>;
}
