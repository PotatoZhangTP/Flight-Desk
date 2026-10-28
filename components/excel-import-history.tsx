"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { T, useText } from "@/components/i18n";

type Batch = { id: string; file_name: string; total_records: number; imported_count: number; failed_count: number; skipped_count: number; already_imported_count: number; status: string; created_at: string };
type RecordRow = { id: string; source_row_number: number; outcome: string; flight_id: string | null; original_data: Record<string, unknown>; error_type: string | null; error_message: string | null; suggestion: string | null; undo_status: string | null; undo_reason: string | null };

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function ExcelImportHistory({ batches, selected, records }: { batches: Batch[]; selected: Batch | null; records: RecordRow[] }) {
  const t = useText(); const router = useRouter(); const [confirming, setConfirming] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function undo() {
    if (!selected || busy) return; setBusy(true); setError("");
    try { const response = await fetch(`/api/flights/import-history/${selected.id}/undo`, { method: "POST" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || t("Undo failed.")); setConfirming(false); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : t("Undo failed.")); } finally { setBusy(false); }
  }
  function downloadErrors() {
    const failed = records.filter(record => record.outcome === "failed"); if (!failed.length || !selected) return;
    const header = ["Excel Row", "Error Type", "Error", "Suggested Fix", "Original Data"];
    const lines = [header, ...failed.map(record => [record.source_row_number, record.error_type, record.error_message, record.suggestion, JSON.stringify(record.original_data)])].map(row => row.map(csvCell).join(","));
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${selected.file_name.replace(/\.[^.]+$/, "")}-errors.csv`; link.click(); URL.revokeObjectURL(url);
  }
  return <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(18rem,24rem)_1fr]">
    <section className="rounded-2xl border border-line bg-surface p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{t("Import History")}</h2><span className="text-xs text-muted">{batches.length}</span></div><div className="mt-4 space-y-2">{batches.map(batch => <a key={batch.id} href={`/flights/import-history?batch=${batch.id}`} className={`block rounded-xl border p-4 transition hover:border-brand ${selected?.id === batch.id ? "border-brand bg-brand-soft/40" : "border-line"}`}><p className="truncate font-semibold">{batch.file_name}</p><p className="mt-1 text-xs text-muted">{new Date(batch.created_at).toLocaleString()} · {batch.total_records} {t("records")}</p><p className="mt-2 text-xs font-bold text-brand">{t(batch.status)}</p></a>)}{!batches.length && <p className="text-sm text-muted">{t("No import history yet.")}</p>}</div></section>
    <section className="rounded-2xl border border-line bg-surface p-5">{selected ? <><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">{selected.file_name}</h2><p className="mt-1 text-sm text-muted">{new Date(selected.created_at).toLocaleString()}</p></div><div className="flex flex-wrap gap-2">{records.some(record => record.outcome === "failed") && <button type="button" className="button-secondary" onClick={downloadErrors}>{t("Download Error Report")}</button>}{selected.status !== "undone" && selected.imported_count > 0 && <button type="button" className="button-danger" onClick={() => setConfirming(true)}>{t("Undo Import")}</button>}</div></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5"><span>{t("Total")}: <strong>{selected.total_records}</strong></span><span>{t("Imported")}: <strong>{selected.imported_count}</strong></span><span>{t("Failed")}: <strong>{selected.failed_count}</strong></span><span>{t("Skipped")}: <strong>{selected.skipped_count}</strong></span><span>{t("Already Imported")}: <strong>{selected.already_imported_count}</strong></span></div>{error && <p role="alert" className="mt-4 rounded-xl bg-danger-bg p-3 text-sm text-danger-fg">{error}</p>}<div className="mt-5 space-y-2">{records.map(record => <div key={record.id} className="rounded-xl border border-line p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{t("Excel row")} {record.source_row_number}</span><span className="font-bold text-brand">{t(record.outcome)}</span></div>{record.flight_id && <p className="mt-1 text-xs text-muted">{t("Flight created")}: {record.flight_id}</p>}{record.error_message && <p className="mt-2 text-danger-fg">{record.error_message}</p>}{record.suggestion && <p className="mt-1 text-xs text-muted">{record.suggestion}</p>}{record.undo_reason && <p className="mt-1 text-xs text-danger-fg">{record.undo_reason}</p>}</div>)}</div>{confirming && <div className="mt-5 rounded-xl border border-danger/30 bg-danger-bg p-4"><p className="font-semibold">{t("Undo this import?")}</p><p className="mt-1 text-sm">{t("This will remove only flights created by this batch.")} {selected.imported_count} {t("flights are eligible for review.")}</p><div className="mt-3 flex gap-2"><button type="button" className="button-danger" disabled={busy} onClick={() => void undo()}>{busy ? t("Undoing…") : t("Confirm Undo")}</button><button type="button" className="button-secondary" disabled={busy} onClick={() => setConfirming(false)}>{t("Cancel")}</button></div></div>}</> : <p className="py-10 text-sm text-muted">{t("Select an import batch to view details.")}</p>}</section>
  </div>;
}
