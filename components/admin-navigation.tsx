import { T, LocalizedNav } from "@/components/i18n";
import Link from "@/components/navigation-link";

export function AdminNavigation({ current }: { current: "overview" | "roadmap" | "landing" | "translations" | "memorial" }) {
  return <LocalizedNav label="Administration" className="mb-8 flex flex-wrap gap-2 border-b border-line pb-4">{[
    { id: "overview", href: "/admin", label: "Admin Dashboard" },
    { id: "roadmap", href: "/admin/roadmap", label: "Manage Roadmap" },
    { id: "landing", href: "/admin/landing-page", label: "Manage Landing Page" },
    { id: "translations", href: "/admin/translations", label: "Languages / Translations" },
    { id: "memorial", href: "/admin/memorial-flights", label: "Memorial Flights" },
  ].map(item => <Link key={item.id} href={item.href} aria-current={current === item.id ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-brand ${current === item.id ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-muted hover:text-ink"}`}><T source={item.label} /></Link>)}</LocalizedNav>;
}
