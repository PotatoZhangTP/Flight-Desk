import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AdminDenied } from "@/components/admin-denied";
import { AdminNavigation } from "@/components/admin-navigation";
import { LandingContentEditor } from "@/components/landing-content-editor";
import { siteAdminAccess } from "@/lib/admin/server";
import { landingFields, resolveDraftCopy, resolvePublishedCopy, type ContentRow } from "@/lib/content/model";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage Landing Page — Flight Desk", robots: { index: false, follow: false } };

export default async function LandingEditorPage() {
  const { supabase, user, isAdmin, error: accessError } = await siteAdminAccess();
  if (!user) redirect("/auth?next=/admin/landing-page");
  if (!isAdmin) return <AdminDenied failed={Boolean(accessError)} />;
  const { data, error } = await supabase.from("site_content").select("content_key,content,publication_status,updated_at").like("content_key", "landing.%").abortSignal(AbortSignal.timeout(8000));
  const rows = (data ?? []) as ContentRow[];
  const completeDraft = landingFields.every(field => rows.some(row => row.content_key === field.key && row.publication_status === "draft"));
  return <><SiteHeader /><main className="mx-auto max-w-6xl px-6 py-12 lg:px-12"><AdminNavigation current="landing" /><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow"><T id="cms.title" /></p><h1 className="mt-3 text-4xl font-bold tracking-tight"><T id="admin.manageLanding" /></h1><p className="mt-4 max-w-xl leading-7 text-muted"><T id="cms.intro" /></p></div><Link href="/" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline"><T id="cms.view" /></Link></div>{error ? <p role="alert" className="mt-8 rounded-xl bg-danger-bg p-5 text-danger-fg"><T id="cms.error" /></p> : <LandingContentEditor initialDraft={resolveDraftCopy(rows)} published={resolvePublishedCopy(rows)} completeDraft={completeDraft} />}</main></>;
}
