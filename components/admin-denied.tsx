import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { SiteHeader } from "./site-header";

export function AdminDenied({ failed = false }: { failed?: boolean }) {
  return <><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-20"><p className="eyebrow"><T id="admin.back" /></p><h1 className="mt-4 text-4xl font-bold"><T id="admin.denied" /></h1><p role="alert" className="mt-5 text-muted"><T source={failed ? "We couldn’t verify administrator access. Please try again later." : "Your account does not have permission to manage this website."} /></p><Link href="/dashboard" className="mt-8 inline-block font-semibold text-brand"><T id="common.backDashboardArrow" /></Link></main></>;
}
