"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { FlightMapData } from "@/lib/flight-map-data";

const FlightMap = dynamic(
  () => import("@/components/flight-map").then(module => module.FlightMap),
  { ssr: false, loading: () => <MapFallback /> },
);

function MapFallback() {
  return <div className="grid h-full min-h-[220px] place-items-center rounded-2xl bg-page/60 text-sm text-muted"><span className="h-8 w-32 rounded-lg skeleton-shimmer" /></div>;
}

export function LazyFlightMap({ data }: { data: FlightMapData }) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node || visible) return;
    if (!("IntersectionObserver" in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);
  return <div ref={root} className="h-full min-h-[220px]">{visible ? <FlightMap data={data} compact defaultMode="3d" persistMode={false} /> : <MapFallback />}</div>;
}
