import { redirect } from "next/navigation";
import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { ExcelImporter } from "@/components/excel-importer";
import { requestAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function ExcelImportPage() {
  const { user } = await requestAuth();
  if (!user) redirect("/auth?next=/flights/import/excel");
  const name = user.email?.split("@")[0] || "Pilot";
  return <div className="min-h-screen bg-page"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={name.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-7xl px-6 py-10 lg:px-12"><Link href="/flights/new" className="button-secondary inline-flex">← <span className="ml-2"><T id="excel.backToAdd" /></span></Link><div className="mt-8"><p className="eyebrow"><T id="excel.kicker" /></p><h1 className="mt-3 text-4xl font-bold tracking-tight text-brand"><T id="excel.title" /></h1><p className="mt-3 text-muted"><T id="excel.description" /></p></div><ExcelImporter /></main></div>;
}
