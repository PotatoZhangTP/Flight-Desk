"use client";
import { useState } from "react";
import { saveLanguage } from "@/app/settings/language-actions";
import { useLanguage, useText, T } from "./i18n";
import { useAsyncOperation } from "./use-async-operation";

export function LanguageSelector({ settings = false }: { settings?: boolean }) {
  const { locale, setLocale, accountReady } = useLanguage();
  const t = useText();
  const [status, setStatus] = useState("");
  const { busy, run } = useAsyncOperation();
  const controls = <label className="inline-flex min-w-0 items-center gap-2 text-sm text-muted"><span className={settings ? "font-semibold" : "sr-only"}><T id="language.label" /></span><select aria-label={t("Choose language")} value={locale} disabled={busy} onChange={event => {
    const next = event.target.value === "zh-CN" ? "zh-CN" : "en";
    setLocale(next); setStatus(accountReady ? "" : "language.browserSaved");
    if (accountReady) void run(async () => { const result = await saveLanguage(next); setStatus(result.error ? "language.saveError" : "language.accountSaved"); }, () => setStatus("language.saveError"));
  }} className="max-w-full rounded-full border border-line bg-surface px-3 py-2 text-sm text-ink"><option value="en" lang="en">English</option><option value="zh-CN" lang="zh-CN">简体中文</option></select></label>;
  if (!settings) return <div>{controls}<span role="status" className="sr-only">{status && <T id={status} />}{busy && <T id="common.saving" />}</span></div>;
  return <section className="mt-6 rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold"><T id="language.label" /></h2><p className="my-3 text-sm leading-6 text-muted"><T id="language.help" /></p>{controls}{status && <p role="status" className="mt-3 text-sm text-muted"><T id={status} /></p>}{busy && <span role="status" className="ml-3 text-sm"><T id="common.saving" /></span>}</section>;
}
