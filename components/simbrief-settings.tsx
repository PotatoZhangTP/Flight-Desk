"use client";

import { useState } from "react";
import { T, UiError, useText } from "@/components/i18n";
import { removeSimBriefIntegration, saveSimBriefIntegration, testSimBriefConnection } from "@/app/flights/import/simbrief/actions";

export function SimBriefSettings({ initial }: { initial: { navigraph_alias: string | null; pilot_id: string | null } | null }) {
  const t = useText();
  const [alias, setAlias] = useState(initial?.navigraph_alias || "");
  const [pilotId, setPilotId] = useState(initial?.pilot_id || "");
  const [busy, setBusy] = useState<"save" | "test" | "remove" | null>(null);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  async function run(action: "save" | "test" | "remove") {
    setBusy(action); setStatus(""); setFailed(false);
    const result = (action === "save" ? await saveSimBriefIntegration({ alias, pilotId }) : action === "test" ? await testSimBriefConnection({ alias, pilotId }) : await removeSimBriefIntegration()) as { error?: string; success?: string };
    if (result.error) { setFailed(true); setStatus(result.error); }
    else { setStatus(result.success || ""); if (action === "remove") { setAlias(""); setPilotId(""); } }
    setBusy(null);
  }
  const input = "mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
  return <section className="spotlight-card rounded-2xl border border-line bg-surface p-6">
    <h2 className="text-xl font-bold text-ink"><T id="simbrief.title" /></h2>
    <p className="mt-2 text-sm leading-6 text-muted"><T id="simbrief.description" /></p>
    <div className="mt-6 grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold text-muted"><T id="simbrief.alias" /><input value={alias} onChange={event => setAlias(event.target.value)} className={input} placeholder="e.g. pilot.alias" autoComplete="off" /><span className="mt-1 block text-xs font-normal text-subtle"><T id="simbrief.aliasHelp" /></span></label>
      <label className="text-sm font-semibold text-muted"><T id="simbrief.pilotId" /><input value={pilotId} onChange={event => setPilotId(event.target.value)} className={input} inputMode="numeric" autoComplete="off" /></label>
    </div>
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button type="button" disabled={Boolean(busy)} onClick={() => void run("save")} className="button-primary">{busy === "save" ? t("Saving…") : <T id="simbrief.saveConfig" />}</button>
      <button type="button" disabled={Boolean(busy)} onClick={() => void run("test")} className="button-secondary">{busy === "test" ? t("Loading…") : <T id="simbrief.testConnection" />}</button>
      {(alias || pilotId) && <button type="button" disabled={Boolean(busy)} onClick={() => void run("remove")} className="rounded-full border border-danger-line px-4 py-2 text-sm font-bold text-danger-fg">{busy === "remove" ? t("Saving…") : <T id="simbrief.removeConfig" />}</button>}
    </div>
    {status && <p role={failed ? "alert" : "status"} className={`mt-4 text-sm font-semibold ${failed ? "text-danger-fg" : "text-brand"}`}><UiError message={status} /></p>}
  </section>;
}
