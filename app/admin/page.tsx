import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AdminDenied } from "@/components/admin-denied";
import { AdminNavigation } from "@/components/admin-navigation";
import { siteAdminAccess } from "@/lib/admin/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Panel — Flight Desk", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const { user, isAdmin, error } = await siteAdminAccess();
  if (!user) redirect("/auth?next=/admin");
  if (!isAdmin) return <AdminDenied failed={Boolean(error)} />;
  return <><SiteHeader /><main className="mx-auto max-w-6xl px-6 py-12 lg:px-12"><AdminNavigation current="overview" /><p className="eyebrow"><T id="admin.website" /></p><h1 className="mt-3 text-4xl font-bold tracking-tight"><T id="admin.panel" /></h1><p className="mt-4 max-w-xl leading-7 text-muted"><T id="admin.intro" /></p><div className="mt-10 grid gap-5 md:grid-cols-2">{[
    { href: "/admin/roadmap", title: "Manage Roadmap", description: "Organize product milestones, development statuses and published updates." },
    { href: "/admin/landing-page", title: "Manage Landing Page", description: "Edit homepage copy privately, save a draft, then publish it when you’re ready." },
    { href: "/admin/translations", title: "Languages / Translations", description: "Review and customize interface translations without redeploying the website." },
    { href: "/admin/memorial-flights", title: "Memorial Flights", description: "Create, publish and maintain aviation memorial routes." },
    { href: "/admin/achievement-guidance", title: "Badge Level Guidance", description: "Manage the unlock guidance shown for achievement levels." },
  ].map(module => <Link key={module.href} href={module.href} className="interaction-card rounded-2xl border border-line bg-surface p-7 shadow-sm shadow-ink/5 transition hover:border-brand/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"><h2 className="text-xl font-bold"><T source={module.title} /> <span aria-hidden="true" className="text-brand">→</span></h2><p className="mt-3 text-sm leading-7 text-muted"><T source={module.description} /></p></Link>)}</div></main></>;
}
