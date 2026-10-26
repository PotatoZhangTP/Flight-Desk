import { redirect } from "next/navigation";
import Link from "@/components/navigation-link";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { T } from "@/components/i18n";
import { SimBriefImporter } from "@/components/simbrief-importer";
import { getSimBriefIntegration } from "@/app/flights/import/simbrief/actions";
import { requestAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function SimBriefImportPage() {
  const { user } = await requestAuth();
  if (!user) redirect("/auth?next=/flights/import/simbrief");
  const config = await getSimBriefIntegration();
  const name = user.email?.split("@")[0] || "Pilot";
  return <div className="min-h-screen bg-page"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={name.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-5xl px-6 py-10 lg:px-12"><Link href="/flights/new" className="button-secondary inline-flex"><T id="simbrief.backToAdd" /></Link><div className="mt-8"><p className="eyebrow"><T id="simbrief.title" /></p><h1 className="mt-3 text-4xl font-bold tracking-tight text-brand"><T id="flight.importSimbrief" /></h1><p className="mt-3 text-muted"><T id="simbrief.description" /></p></div><SimBriefImporter initialConfig={config} /></main></div>;
}
