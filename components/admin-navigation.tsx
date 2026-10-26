import { T, LocalizedNav } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { siteAdminAccess } from "@/lib/admin/server";

export async function AdminNavigation({ current }: { current: "overview" | "roadmap" | "landing" | "translations" | "memorial" | "guidance" | "countryMappings" | "feedback" }) {
  const { supabase, isAdmin } = await siteAdminAccess();
  const { count } = isAdmin ? await supabase.from("inbox_notifications").select("id", { count: "exact", head: true }).eq("recipient_user_id", (await supabase.auth.getUser()).data.user?.id ?? "").eq("is_read", false) : { count: 0 };
  return <LocalizedNav label="Administration" className="mb-8 flex flex-wrap gap-2 border-b border-line pb-4">{[
    { id: "overview", href: "/admin", label: "Admin Dashboard" },
    { id: "roadmap", href: "/admin/roadmap", label: "Manage Roadmap" },
    { id: "landing", href: "/admin/landing-page", label: "Manage Landing Page" },
    { id: "translations", href: "/admin/translations", label: "Languages / Translations" },
    { id: "memorial", href: "/admin/memorial-flights", label: "Memorial Flights" },
    { id: "guidance", href: "/admin/achievement-guidance", label: "Badge Level Guidance" },
    { id: "countryMappings", href: "/admin/country-mappings", label: "Country & Region Mapping" },
    { id: "feedback", href: "/admin/feedback", label: "Feedback Inbox" },
  ].map(item => <Link key={item.id} href={item.href} aria-current={current === item.id ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-brand ${current === item.id ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-muted hover:text-ink"}`}><T source={item.label} />{item.id === "feedback" && Boolean(count) && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[10px] text-white">{count}</span>}</Link>)}</LocalizedNav>;
}
