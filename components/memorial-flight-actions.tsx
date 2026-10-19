"use client";

import { useEffect, useRef, useState } from "react";
import { T, useText } from "@/components/i18n";
import { readMemorialFlightState, saveMemorialFlight } from "@/app/memorial-flights/actions";
import { simbriefUrl } from "@/lib/simbrief-url";

export function MemorialFlightActions({ event, dark = false }: { event: { id: string; departure_icao: string; arrival_icao: string; suggested_aircraft?: string | null }; dark?: boolean }) {
  const t = useText();
  const [status, setStatus] = useState<string | null>(null);
  const [flightId, setFlightId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setMessage("");
    setFailed(false);
    readMemorialFlightState(event.id).then(result => {
      if (live) { setStatus(result.status); setFlightId(result.flightId); }
    }).catch(() => { if (live) { setFailed(true); setMessage("memorial.flightLoadError"); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [event.id, retry]);

  async function save(action: "plan" | "complete" | "uncomplete") {
    if (locked.current) return;
    locked.current = true;
    setBusy(action); setMessage(""); setFailed(false);
    try {
      const result = await saveMemorialFlight(event.id, action);
      if (!mounted.current) return;
      if (result.error) { setFailed(true); setMessage(result.error); }
      else { setFlightId(result.flightId!); setStatus(result.status!); setMessage(action === "uncomplete" ? "memorial.savedPlanned" : result.status === "completed" ? "memorial.savedCompleted" : "memorial.savedPlanned"); }
    } catch { if (mounted.current) { setFailed(true); setMessage("memorial.flightSaveError"); } }
    finally { locked.current = false; if (mounted.current) setBusy(null); }
  }

  const secondary = `button-secondary px-3 py-2 text-xs ${dark ? "!border-[#d5b36a]/60 !bg-transparent !text-[#ead291] hover:!bg-white/5" : ""}`;
  return <div className="mt-4 flex flex-wrap items-center gap-3" aria-busy={loading || Boolean(busy)}>
    <a target="_blank" rel="noreferrer" href={simbriefUrl(event)} className={`button-primary px-3 py-2 text-xs ${dark ? "!bg-[#d5b36a] !text-[#192237] hover:!bg-[#ead291]" : ""}`}><T id="memorial.importSimbrief" /> ↗</a>
    <button type="button" disabled={loading || Boolean(busy) || Boolean(flightId)} onClick={() => void save("plan")} className={secondary}>{busy === "plan" ? <T id="common.saving" /> : <T id={flightId ? "memorial.added" : "memorial.addFlight"} />}</button>
    <button type="button" disabled={loading || Boolean(busy)} onClick={() => void save(status === "completed" ? "uncomplete" : "complete")} className={secondary}>{busy && busy !== "plan" ? <T id="common.saving" /> : <T id={status === "completed" ? "memorial.completed" : "memorial.markComplete"} />}</button>
    {loading && <span role="status" className="text-xs"><T id="common.loading" /></span>}
    {message && <p role={failed ? "alert" : "status"} className={`basis-full text-sm ${failed ? dark ? "text-red-200" : "text-danger-fg" : dark ? "text-[#ead291]" : "text-brand"}`}>{t(message)}{failed && <button type="button" onClick={() => setRetry(value => value + 1)} className="ml-2 underline"><T id="common.retry" /></button>}</p>}
  </div>;
}
