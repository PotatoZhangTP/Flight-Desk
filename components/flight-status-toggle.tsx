"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateFlightStatus } from "@/app/flights/actions";
import { Spinner } from "@/components/async-button";
import { T, UiError, useText } from "@/components/i18n";

export function FlightStatusToggle({ id, status }: { id: string; status: string | null }) {
  const router = useRouter();
  const t = useText();
  const [updating, setUpdating] = useState<"planned" | "completed" | null>(null);
  const [error, setError] = useState("");
  const current = status === "planned" ? "planned" : "completed";

  async function change(next: "planned" | "completed") {
    if (updating || next === current) return;
    setError("");
    setUpdating(next);
    try {
      const result = await updateFlightStatus(id, next);
      if (result.error) {
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
  </div>;
}
