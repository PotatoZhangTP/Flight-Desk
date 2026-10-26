import { redirect } from "next/navigation";
import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { SiteHeader } from "@/components/site-header";
import { FeedbackChat } from "@/components/feedback-chat";
import { NotificationsInbox } from "@/components/notifications-inbox";
import { requestAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { user } = await requestAuth();
  if (!user) redirect("/auth?next=/inbox");
  const tab = (await searchParams).tab === "messages" ? "messages" : "notifications";
  return <><SiteHeader /><main className="mx-auto max-w-7xl px-6 py-12 lg:px-12"><Link href="/dashboard" className="button-secondary"><T id="common.backDashboard" /></Link><div className="mt-10"><p className="eyebrow"><T id="feedback.notificationCenter" /></p><h1 className="mt-3 text-4xl font-bold tracking-tight"><T id="feedback.notificationCenter" /></h1></div><div className="mt-8 flex gap-2 border-b border-line pb-3"><a href="/inbox?tab=notifications" className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "notifications" ? "bg-brand-soft text-brand" : "text-muted"}`}><T id="feedback.notifications" /></a><a href="/inbox?tab=messages" className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "messages" ? "bg-brand-soft text-brand" : "text-muted"}`}><T id="feedback.messages" /></a></div>{tab === "messages" ? <FeedbackChat /> : <NotificationsInbox />}</main></>;
}
