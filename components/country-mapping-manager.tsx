"use client";

import countries from "flag-icons/country.json";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { T, useText } from "@/components/i18n";
import { CountryFlag } from "@/components/country-flag";
import { deleteCountryMapping, saveCountryMapping, setCountryMappingStatus } from "@/app/admin/country-mappings/actions";

type Mapping = { id: string; original_code: string; target_code: string; is_active: boolean };
const options = countries.filter(country => country.iso).map(country => ({ code: country.code.toUpperCase(), name: country.name })).sort((a, b) => a.name.localeCompare(b.name));
const input = "mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

export function CountryMappingManager({ initialMappings }: { initialMappings: Mapping[] }) {
  const router = useRouter();
  const t = useText();
  const [editing, setEditing] = useState<Mapping | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState("");
  const [target, setTarget] = useState("");
  const [active, setActive] = useState(true);
  function start(mapping?: Mapping) { setEditing(mapping || null); setOriginal(mapping?.original_code || ""); setTarget(mapping?.target_code || ""); setActive(mapping?.is_active ?? true); setOpen(true); setMessage(""); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setMessage("");
    const form = new FormData();
    if (editing) form.set("id", editing.id);
    form.set("original_code", original); form.set("target_code", target); form.set("is_active", active ? "on" : "off");
    const result = await saveCountryMapping(form);
    setSaving(false); setMessage(result.error || result.success || "");
    if (!result.error) { setOpen(false); router.refresh(); }
  }
  async function toggle(mapping: Mapping) { const result = await setCountryMappingStatus(mapping.id, !mapping.is_active); setMessage(result.error || result.success || ""); if (!result.error) router.refresh(); }
  async function remove(mapping: Mapping) { if (!window.confirm(`${t("admin.deleteMappingConfirm")} ${mapping.original_code} → ${mapping.target_code}`)) return; const result = await deleteCountryMapping(mapping.id); setMessage(result.error || result.success || ""); if (!result.error) router.refresh(); }
  const label = (code: string) => options.find(option => option.code === code)?.name || code;
  return <section className="mt-8 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted"><T source="Only active mappings affect airport display and country statistics." /></p><button type="button" className="button-primary" onClick={() => start()}><T source="Add Mapping" /></button></div>
    {message && <p role="status" className="rounded-xl bg-brand-soft p-3 text-sm font-semibold text-brand"><T id={message} /></p>}
    {open && <form onSubmit={submit} className="rounded-2xl border border-brand/30 bg-surface p-6"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-muted"><T source="Original Region" /><select value={original} onChange={event => setOriginal(event.target.value)} className={input} required><option value=""><T id="admin.selectCountry" /></option>{options.map(option => <option key={option.code} value={option.code}>{option.name} ({option.code})</option>)}</select></label><label className="text-sm font-semibold text-muted"><T source="Display Country" /><select value={target} onChange={event => setTarget(event.target.value)} className={input} required><option value=""><T id="admin.selectDisplayCountry" /></option>{options.map(option => <option key={option.code} value={option.code}>{option.name} ({option.code})</option>)}</select></label></div><div className="mt-4 rounded-xl bg-brand-soft/50 p-4 text-sm text-muted"><p className="font-semibold text-brand"><T id="admin.previewChanges" /></p><p className="mt-2">{original && target ? <><CountryFlag code={target} /> {label(original)} ({original}) → {label(target)} ({target})</> : <T id="admin.selectBothCountries" />}</p><p className="mt-2"><T id="admin.affectedAreas" />: <T source="Aviation Passport" /> · <T source="Dashboard Countries" /> · <T source="Country Collector" /> · <T source="Flight Search" /> · <T source="Flight Details" /></p></div><label className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} /><T id="admin.active" /></label><div className="mt-5 flex flex-wrap gap-3"><button type="submit" disabled={saving} className="button-primary">{saving ? <T id="common.saving" /> : <T id="admin.saveMapping" />}</button><button type="button" className="button-secondary" onClick={() => setOpen(false)}><T id="common.cancel" /></button></div></form>}
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface"><table className="w-full min-w-[780px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-wider text-subtle"><tr><th className="px-5 py-4"><T id="admin.originalRegion" /></th><th><T id="admin.originalCode" /></th><th><T id="admin.displayCountry" /></th><th><T id="admin.displayCode" /></th><th><T id="admin.flag" /></th><th><T id="admin.mappingStatus" /></th><th className="px-5"><T id="admin.actions" /></th></tr></thead><tbody>{initialMappings.map(mapping => <tr key={mapping.id} className="border-b border-surface-muted"><td className="px-5 py-4">{label(mapping.original_code)}</td><td>{mapping.original_code}</td><td>{label(mapping.target_code)}</td><td>{mapping.target_code}</td><td><CountryFlag code={mapping.target_code} /></td><td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${mapping.is_active ? "bg-completed-bg text-completed-fg" : "bg-surface-muted text-muted"}`}><T id={mapping.is_active ? "admin.active" : "admin.inactive"} /></span></td><td className="px-5"><div className="flex flex-wrap gap-2"><button type="button" className="button-secondary !min-h-9 !px-3 !py-1.5 text-xs" onClick={() => start(mapping)}><T id="admin.edit" /></button><button type="button" className="button-secondary !min-h-9 !px-3 !py-1.5 text-xs" onClick={() => void toggle(mapping)}><T id={mapping.is_active ? "admin.disable" : "admin.enable"} /></button><button type="button" className="button-danger !min-h-9 !px-3 !py-1.5 text-xs" onClick={() => void remove(mapping)}><T id="admin.delete" /></button></div></td></tr>)}</tbody></table>{!initialMappings.length && <p className="p-6 text-sm text-muted"><T id="admin.noMappings" /></p>}</div>
  </section>;
}
