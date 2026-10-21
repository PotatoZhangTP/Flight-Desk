"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import { T, useLanguage } from "@/components/i18n";
import type { FlightMapData } from "@/lib/flight-map-data";

const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character));

export function FlightMap({ data, compact = false, defaultMode, persistMode = true }: { data: FlightMapData; compact?: boolean; defaultMode?: "2d" | "3d"; persistMode?: boolean }) {
  const { locale } = useLanguage();
  const relatedFlightsLabel = locale === "zh-CN" ? "相关航班" : "Related Flights";
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
    let airportPopup: maplibregl.Popup | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let loadTimer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => { if (loadTimer) clearTimeout(loadTimer); loadTimer = null; airportPopup?.remove(); airportPopup = null; resizeObserver?.disconnect(); resizeObserver = null; if (instance) { instance.remove(); instance = null; } map.current = null; };
    const fail = (stage: string, exception: unknown) => {
      console.error(`[Flight Map] ${stage} failed`, exception);
      if (live) { cleanup(); setReady(false); setError(exception instanceof Error ? exception.message : `Flight Map ${stage} failed.`); }
    };

    try {
      instance = new maplibregl.Map({ container: target, style: styleUrl, center: data.initialCenter ?? [0, 20], zoom: 1.3, renderWorldCopies: false, attributionControl: false });
      map.current = instance;
      loadTimer = setTimeout(() => fail("style loading", new Error("The map style did not load in time.")), 10000);
      resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => instance?.resize()) : null;
      resizeObserver?.observe(target);
      instance.on("load", () => {
        if (!live || !instance) return;
        if (loadTimer) clearTimeout(loadTimer);
        loadTimer = null;
        try {
          instance.setProjection({ type: mode === "3d" ? "globe" : "mercator" });
          instance.addSource("flight-routes", { type: "geojson", data: data.routes });
          instance.addLayer({ id: "flight-routes", type: "line", source: "flight-routes", paint: { "line-color": "#7554C8", "line-width": compact ? 2 : 3, "line-opacity": 0.7 } });
          instance.addSource("flight-airports", { type: "geojson", data: data.airports });
          instance.addLayer({ id: "flight-airports", type: "circle", source: "flight-airports", paint: { "circle-color": "#7554C8", "circle-radius": compact ? 4 : 6, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });
          instance.resize();
          loaded = true;
          instance.on("click", "flight-airports", event => { const feature = event.features?.[0]; if (!feature || feature.geometry.type !== "Point") return; const props = feature.properties ?? {}; const code = String(props.code || props.icao || props.iata || "").trim().toUpperCase(); const countryCode = String(props.countryCode || "").trim().toLowerCase(); const location = [props.municipality, props.countryName].filter(Boolean).join(", "); const flag = /^[a-z]{2}$/.test(countryCode) ? `<span class="fi fi-${escapeHtml(countryCode)}" aria-hidden="true"></span>` : `<span class="flight-airport-popup__flag-fallback" aria-hidden="true">—</span>`; const popupContent = `<div class="flight-airport-popup__header"><span class="flight-airport-popup__flag">${flag}</span><div class="min-w-0"><h3 class="flight-airport-popup__name">${escapeHtml(props.name || "Airport")}</h3><p class="flight-airport-popup__meta">${escapeHtml(props.icao || code || "Airport code unavailable")}${location ? ` · ${escapeHtml(location)}` : ""}</p></div></div><a class="flight-airport-popup__flights" href="/flights?airport=${encodeURIComponent(code)}"><span>${escapeHtml(relatedFlightsLabel)}</span><strong>${escapeHtml(props.count ?? 0)} <span aria-hidden="true">→</span></strong></a>`; airportPopup?.remove(); airportPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: "min(320px, calc(100vw - 32px))", className: "flight-airport-popup" }).setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number]).setHTML(popupContent).addTo(instance!); });
          instance.on("mouseenter", "flight-airports", () => { instance!.getCanvas().style.cursor = "pointer"; });
          instance.on("mouseleave", "flight-airports", () => { instance!.getCanvas().style.cursor = ""; });
          instance.on("click", event => { const features = instance!.queryRenderedFeatures(event.point, { layers: ["flight-airports", "flight-routes"] }); if (!features.length) { airportPopup?.remove(); airportPopup = null; } });
          setReady(true);
        } catch (exception) { fail("load and layer setup", exception); }
      });
      instance.on("error", event => { if (!loaded) console.warn("[Flight Map] MapLibre resource error during initialization", event.error); });
      return () => { live = false; resizeObserver?.disconnect(); cleanup(); };
    } catch (exception) { fail("initialization", exception); }
  }, [data, compact, relatedFlightsLabel]);

  useEffect(() => {
    if (!map.current || !ready) return;
    try { map.current.setProjection({ type: mode === "3d" ? "globe" : "mercator" }); map.current.resize(); } catch (exception) { console.error("[Flight Map] projection switch failed", exception); }
    if (persistMode) try { localStorage.setItem("flightdesk-map-mode", mode); } catch { /* optional preference */ }
  }, [mode, ready, persistMode]);

  if (!styleUrl) return <div className="grid h-full min-h-[260px] place-items-center rounded-2xl border border-dashed border-line bg-page p-6 text-center text-sm text-muted"><T id="map.styleMissing" /></div>;
  if (error) return <div role="alert" className="flight-map-shell grid h-full min-h-[260px] place-items-center overflow-hidden rounded-2xl border border-danger-line bg-danger-bg p-6 text-center text-sm text-danger-fg"><div><T id="map.loadError" /><Link href="/flight-map" className="button-secondary mt-4"><T id="common.retry" /></Link></div></div>;
  return <div className={`flight-map-shell flex min-h-0 flex-col overflow-hidden rounded-2xl ${compact ? "h-full" : "h-[590px]"}`}>
    <div className="relative min-h-0 flex-1">
      <div ref={container} className="absolute inset-0 h-full w-full" />
      {!ready && <div className="absolute inset-0 grid place-items-center bg-page/60 text-sm text-muted"><T id="map.loading" /></div>}
    </div>
    <div className="grid min-h-16 shrink-0 grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 border-t border-line bg-surface/95 px-3 py-3 backdrop-blur-sm sm:h-16 sm:py-0">
      <div className="flex shrink-0 overflow-hidden rounded-lg border border-line-strong bg-elevated shadow-sm">
        <button type="button" aria-label="Zoom In" onClick={() => map.current?.zoomIn()} className="grid h-9 w-9 place-items-center text-lg font-bold text-brand hover:bg-brand-soft">+</button>
        <button type="button" aria-label="Zoom Out" onClick={() => map.current?.zoomOut()} className="grid h-9 w-9 place-items-center border-l border-line text-lg font-bold text-brand hover:bg-brand-soft">−</button>
      </div>
      {ready && <div className="flex shrink-0 rounded-full border border-line bg-elevated p-1 shadow-sm">
        <button type="button" onClick={() => setMode("2d")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${mode === "2d" ? "bg-brand text-on-brand" : "text-brand"}`}>2D</button>
        <button type="button" onClick={() => setMode("3d")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${mode === "3d" ? "bg-brand text-on-brand" : "text-brand"}`}>3D</button>
      </div>}
      <span className="min-w-0 text-right text-[11px] leading-4 text-muted">© MapTiler © OpenStreetMap contributors</span>
    </div>
  </div>;
}
