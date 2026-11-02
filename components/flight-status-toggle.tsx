"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateFlightStatus } from "@/app/flights/actions";
import { Spinner } from "@/components/async-button";
import { T, UiError, useText } from "@/components/i18n";
import Link from "@/components/navigation-link";

export function FlightStatusToggle({ id, status, departureDate }: { id: string; status: string | null; departureDate: string | null }) {
  const router = useRouter();
  const t = useText();
  const [updating, setUpdating] = useState<"planned" | "completed" | null>(null);
  const [error, setError] = useState("");
  const [dateWarning, setDateWarning] = useState(false);
  const current = status === "planned" ? "planned" : "completed";

  async function change(next: "planned" | "completed") {
    if (updating || next === current) return;
    if (next === "completed" && !departureDate) { setDateWarning(true); return; }
    setError("");
    setUpdating(next);
    try {
      const result = await updateFlightStatus(id, next);
      if (result.error) {
        if (result.error === "flight.departureDateRequired") { setDateWarning(true); return; }
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("flight.statusUpdateError");
    } finally {
      setUpdating(null);
    }
  }

  return <div className="flex flex-col items-center gap-1">
    <div className="flex items-center justify-center gap-1" aria-label={t("flight.markAs")}>
      <button type="button" title={t("flight.markCompleted")} aria-label={t("flight.markCompleted")} aria-pressed={current === "completed"} disabled={Boolean(updating)} onClick={() => void change("completed")} className={`grid h-8 w-8 place-items-center rounded-lg border text-sm font-bold transition ${current === "completed" ? "border-completed-fg bg-completed-bg text-completed-fg" : "border-line-strong text-muted hover:border-completed-fg hover:text-completed-fg"}`}>
        {updating === "completed" ? <Spinner /> : "✓"}
      </button>
      <button type="button" title={t("flight.markPlanned")} aria-label={t("flight.markPlanned")} aria-pressed={current === "planned"} disabled={Boolean(updating)} onClick={() => void change("planned")} className={`grid h-8 w-8 place-items-center rounded-lg border text-sm font-bold transition ${current === "planned" ? "border-brand bg-brand-soft text-brand" : "border-line-strong text-muted hover:border-brand hover:text-brand"}`}>
        {updating === "planned" ? <Spinner /> : "—"}
      </button>
    </div>
    {updating && <span role="status" className="sr-only">{t("flight.updatingStatus")}</span>}
    {error && <p role="alert" className="max-w-40 text-center text-xs text-danger-fg"><UiError message={error} /></p>}
    {dateWarning && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDateWarning(false); }}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-left shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="departure-date-required-title">
        <h2 id="departure-date-required-title" className="text-xl font-bold text-ink"><T id="flight.departureDateRequiredTitle" /></h2>
        <p className="mt-3 text-sm leading-6 text-muted"><T id="flight.departureDateRequired" /></p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="button-secondary" onClick={() => setDateWarning(false)}><T id="common.cancel" /></button>
          <Link href={`/flights/${id}/edit`} className="button-primary" onClick={() => setDateWarning(false)}><T id="flight.edit" /></Link>
        </div>
      </div>
    </div>}
  </div>;
}
