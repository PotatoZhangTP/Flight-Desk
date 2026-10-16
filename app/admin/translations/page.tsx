import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { siteAdminAccess } from "@/lib/admin/server";
import { catalog } from "@/lib/i18n/catalog";
import { SiteHeader } from "@/components/site-header";
import { AdminDenied } from "@/components/admin-denied";
import { AdminNavigation } from "@/components/admin-navigation";
import { TranslationManager } from "@/components/translation-manager";
import { T } from "@/components/i18n";
export const dynamic = "force-dynamic";
export const metadata = { title: "Translations — Flight Desk", robots: { index: false, follow: false } };

export default async function TranslationsPage() {
  const { supabase, user, isAdmin, error: accessError } = await siteAdminAccess();
  if (!user) redirect("/auth?next=/admin/translations");
  if (!isAdmin) return <AdminDenied failed={Boolean(accessError)} />;
  const { data, error } = await supabase.from("translation_overrides").select("translation_key,translation_text,version,updated_at,source_hash").eq("locale", "zh-CN").abortSignal(AbortSignal.timeout(5000));
  const entries = catalog.map(entry => {
    const override = data?.find(row => row.translation_key === entry.key);
    const hash = createHash("sha256").update(entry.en).digest("hex");
    return { ...entry, text: override?.translation_text ?? entry.zh, version: override?.version ?? null, updatedAt: override?.updated_at ?? null, review: Boolean(override && override.source_hash !== hash) };
  });
  return <><SiteHeader /><main className="mx-auto max-w-7xl px-6 py-12 lg:px-12"><AdminNavigation current="translations" /><h1 className="text-3xl font-bold"><T id="translations.title" /></h1><p className="mt-3 text-muted"><T id="translations.help" /></p><TranslationManager entries={entries} ready={!error} /></main></>;
}
