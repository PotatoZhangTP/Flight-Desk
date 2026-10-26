import { redirect } from "next/navigation";
import { T } from "@/components/i18n";
import { SiteHeader } from "@/components/site-header";
import { AdminDenied } from "@/components/admin-denied";
import { AdminNavigation } from "@/components/admin-navigation";
import { FeedbackInbox } from "@/components/feedback-inbox";
import { FeedbackChat } from "@/components/feedback-chat";
import { siteAdminAccess } from "@/lib/admin/server";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const { supabase, user, isAdmin, error } = await siteAdminAccess();
  if (!user) redirect("/auth?next=/admin/feedback");
  if (!isAdmin) return <AdminDenied failed={Boolean(error)} />;
  const { data, error: readError } = await supabase.from("feedback_submissions").select("id,type,title,description,submitter_email,created_at,status,is_read,attachments,environment_info").is("archived_at", null).order("created_at", { ascending: false });
  const rows = (data ?? []) as Array<{ id: string; type: "feature" | "bug"; title: string; description: string; submitter_email: string | null; created_at: string; status: "new" | "in_progress" | "resolved"; is_read: boolean; attachments: Array<{ path: string; name: string; size: number; type: string }>; environment_info: Record<string, string> | null }>;
  const paths = rows.flatMap(row => row.attachments.map(file => file.path));
  const signed = paths.length ? await supabase.storage.from("feedback-attachments").createSignedUrls(paths, 600) : { data: [] };
  const urlByPath = new Map((signed.data ?? []).filter(item => item.path && item.signedUrl).map(item => [item.path as string, item.signedUrl as string]));
  const initial = rows.map(row => ({ ...row, attachment_urls: row.attachments.map(file => ({ name: file.name, url: urlByPath.get(file.path) ?? "" })).filter(file => file.url) }));
  return <><SiteHeader /><main className="mx-auto max-w-7xl px-6 py-12 lg:px-12"><AdminNavigation current="feedback" /><div><p className="eyebrow"><T id="admin.workspace" /></p><h1 className="mt-3 text-4xl font-bold tracking-tight"><T id="feedback.inbox" /></h1><p className="mt-4 max-w-2xl leading-7 text-muted"><T id="feedback.inboxHelp" /></p></div>{readError ? <p role="alert" className="mt-8 rounded-2xl bg-danger-bg p-5 text-danger-fg"><T id="feedback.loadError" /></p> : <><FeedbackInbox initial={initial} /><FeedbackChat adminOnly /></>}</main></>;
}
