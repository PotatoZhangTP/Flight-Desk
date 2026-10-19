"use client";

import { useEffect } from "react";
import { T } from "@/components/i18n";

export function FlightArrival({ flightId, page, saved }: { flightId: string; page: number; saved?: string }) {
  useEffect(() => {
    const row = document.getElementById(`flight-${flightId}`);
    row?.scrollIntoView({ block: "center", behavior: "instant" });
    const url = new URL(window.location.href);
    url.searchParams.delete("focusFlightId");
    url.searchParams.delete("saved");
    url.searchParams.set("page", String(page));
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    // Highlight expires without a request or a change to the filtered dataset.
    const timer = window.setTimeout(() => row?.classList.remove("!bg-brand-soft", "ring-2", "ring-inset", "ring-brand"), 4000);
    return () => window.clearTimeout(timer);
  }, [flightId, page]);
  return saved ? <p role="status" className="mt-4 text-sm font-semibold text-brand"><T id={saved === "completed" ? "memorial.savedCompleted" : "memorial.savedPlanned"} /></p> : null;
}
