"use client";
import { useState } from "react";
import { T, useLanguage, useText } from "@/components/i18n";
import { savePreferences } from "@/app/settings/preference-actions";
import { dateFormats, distanceUnits, timeFormats } from "@/lib/preferences";

export function FullSettingsPreferences() {
  const { preferences, setPreferences } = useLanguage(); const t = useText();
  const [value, setValue] = useState(preferences); const [status, setStatus] = useState(""); const [saving, setSaving] = useState(false);
  function change(key: keyof typeof value, next: string) { setValue(current => ({ ...current, [key]: next })); setStatus(""); }
  async function save() { setSaving(true); setStatus(""); const result = await savePreferences(value); if (result.error) setStatus("settings.saveError"); else { setPreferences(value); setStatus("settings.saved"); } setSaving(false); }
  return <section className="rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold"><T id="settings.general" /></h2><p className="mt-2 text-sm text-muted"><T id="settings.generalHelp" /></p><div className="mt-6 grid gap-5 sm:grid-cols-3"><SettingSelect label="settings.dateFormat" value={value.dateFormat} options={dateFormats.map(item => [item, item])} onChange={next => change("dateFormat", next)} /><SettingSelect label="settings.distanceUnit" value={value.distanceUnit} options={[["km", "Kilometers (km)"], ["mi", "Miles (mi)"], ["nm", "Nautical Miles (nm)"]] } onChange={next => change("distanceUnit", next)} /><SettingSelect label="settings.timeFormat" value={value.timeFormat} options={[["12h", "12-hour (AM/PM)"], ["24h", "24-hour"]]} onChange={next => change("timeFormat", next)} /></div><div className="mt-6 flex flex-wrap items-center gap-3"><button type="button" disabled={saving} onClick={save} className="rounded-full bg-brand px-5 py-3 text-sm font-bold text-on-brand disabled:opacity-60">{saving ? t("Saving…") : t("Save Settings")}</button>{status && <p role="status" className={status === "settings.saved" ? "text-sm text-brand" : "text-sm text-danger-fg"}><T id={status} /></p>}</div></section>;
}
function SettingSelect({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) { return <label className="block text-sm font-semibold"><T id={label} /><select value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-line-strong bg-surface px-3 py-3 font-normal text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
