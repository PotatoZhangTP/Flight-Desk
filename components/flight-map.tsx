"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import { T } from "@/components/i18n";
import type { FlightMapData } from "@/lib/flight-map-data";

const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

export function FlightMap({ data, compact = false, defaultMode, persistMode = true }: { data: FlightMapData; compact?: boolean; defaultMode?: "2d" | "3d"; persistMode?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [mode, setMode] = useState<"2d" | "3d">(() => defaultMode ?? (typeof window !== "undefined" && localStorage.getItem("flightdesk-map-mode") === "3d" ? "3d" : "2d"));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const target = container.current;
    if (!target || !styleUrl) return;
    let live = true;
    let loaded = false;
    let instance: MapLibreMap | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const cleanup = () => { resizeObserver?.disconnect(); resizeObserver = null; if (instance) { instance.remove(); instance = null; } map.current = null; };
    const fail = (stage: string, exception: unknown) => {
      console.error(`[Flight Map] ${stage} failed`, exception);
      if (live) { cleanup(); setReady(false); setError(exception instanceof Error ? exception.message : `Flight Map ${stage} failed.`); }
    };

    try {
      instance = new maplibregl.Map({ container: target, style: styleUrl, center: [0, 20], zoom: 1.3, renderWorldCopies: false, attributionControl: false });
      map.current = instance;
      resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => instance?.resize()) : null;
      resizeObserver?.observe(target);
      instance.on("load", () => {
        if (!live || !instance) return;
        try {
          instance.setProjection({ type: mode === "3d" ? "globe" : "mercator" });
          instance.addSource("flight-routes", { type: "geojson", data: data.routes });
          instance.addLayer({ id: "flight-routes", type: "line", source: "flight-routes", paint: { "line-color": "#7554C8", "line-width": compact ? 2 : 3, "line-opacity": 0.7 } });
          instance.addSource("flight-airports", { type: "geojson", data: data.airports });
          instance.addLayer({ id: "flight-airports", type: "circle", source: "flight-airports", paint: { "circle-color": "#7554C8", "circle-radius": compact ? 4 : 6, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });
          instance.resize();
          loaded = true;
          instance.on("click", "flight-airports", event => { const feature = event.features?.[0]; if (!feature) return; const props = feature.properties ?? {}; const popup = document.createElement("div"); popup.textContent = `${props.name ?? "Airport"} · ${props.icao ?? ""} ${props.iata ?? ""} · Completed Flights: ${props.count ?? 0}`; new maplibregl.Popup({ closeButton: true }).setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number]).setDOMContent(popup).addTo(instance!); });
          instance.on("mouseenter", "flight-airports", () => { instance!.getCanvas().style.cursor = "pointer"; });
          instance.on("mouseleave", "flight-airports", () => { instance!.getCanvas().style.cursor = ""; });
          instance.on("click", "flight-routes", event => { const feature = event.features?.[0]; if (!feature) return; const props = feature.properties ?? {}; const popup = document.createElement("div"); popup.textContent = `${props.from ?? ""} → ${props.to ?? ""} · Completed Flights: ${props.count ?? 0}`; new maplibregl.Popup({ closeButton: true }).setLngLat(event.lngLat).setDOMContent(popup).addTo(instance!); });
          instance.on("mouseenter", "flight-routes", () => { instance!.getCanvas().style.cursor = "pointer"; });
          instance.on("mouseleave", "flight-routes", () => { instance!.getCanvas().style.cursor = ""; });
          setReady(true);
        } catch (exception) { fail("load and layer setup", exception); }
      });
      instance.on("error", event => { if (!loaded) console.warn("[Flight Map] MapLibre resource error during initialization", event.error); });
      return () => { live = false; resizeObserver?.disconnect(); cleanup(); };
    } catch (exception) { fail("initialization", exception); }
  }, [data, compact]);

  useEffect(() => {
    if (!map.current || !ready) return;
    try { map.current.setProjection({ type: mode === "3d" ? "globe" : "mercator" }); map.current.resize(); } catch (exception) { console.error("[Flight Map] projection switch failed", exception); }
    if (persistMode) try { localStorage.setItem("flightdesk-map-mode", mode); } catch { /* optional preference */ }
  }, [mode, ready, persistMode]);

  if (!styleUrl) return <div className="grid h-full min-h-[260px] place-items-center rounded-2xl border border-dashed border-line bg-page p-6 text-center text-sm text-muted"><T id="map.styleMissing" /></div>;
  if (error) return <div role="alert" className="flight-map-shell grid h-full min-h-[260px] place-items-center overflow-hidden rounded-2xl border border-danger-line bg-danger-bg p-6 text-center text-sm text-danger-fg"><div><T id="map.loadError" /><Link href="/flight-map" className="button-secondary mt-4"><T id="common.retry" /></Link></div></div>;
  return <div className="flight-map-shell relative h-full min-h-[320px] overflow-hidden rounded-2xl" style={{ minHeight: compact ? "330px" : "590px" }}><div ref={container} className="absolute inset-x-0 top-0 h-[calc(100%-64px)] w-full" />{!ready && <div className="absolute inset-x-0 top-0 grid h-[calc(100%-64px)] place-items-center bg-page/60 text-sm text-muted"><T id="map.loading" /></div>}<div className="absolute inset-x-0 bottom-0 flex h-16 items-center gap-3 border-t border-line bg-surface/95 px-3 backdrop-blur-sm"><div className="flex overflow-hidden rounded-lg border border-line-strong bg-elevated shadow-sm"><button type="button" aria-label="Zoom In" onClick={() => map.current?.zoomIn()} className="grid h-9 w-9 place-items-center text-lg font-bold text-brand hover:bg-brand-soft">+</button><button type="button" aria-label="Zoom Out" onClick={() => map.current?.zoomOut()} className="grid h-9 w-9 place-items-center border-l border-line text-lg font-bold text-brand hover:bg-brand-soft">−</button></div>{ready && <div className="flex rounded-full border border-line bg-elevated p-1 shadow-sm"><button type="button" onClick={() => setMode("2d")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${mode === "2d" ? "bg-brand text-on-brand" : "text-brand"}`}>2D</button><button type="button" onClick={() => setMode("3d")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${mode === "3d" ? "bg-brand text-on-brand" : "text-brand"}`}>3D</button></div>}<span className="ml-auto truncate text-right text-[11px] text-muted">© MapTiler © OpenStreetMap contributors</span></div></div>;
}
