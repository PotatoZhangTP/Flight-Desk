import { redirect } from "next/navigation";
import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { ExcelImportHistory } from "@/components/excel-import-history";
import { requestAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ImportHistoryPage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const { user } = await requestAuth(); if (!user) redirect("/auth?next=/flights/import-history");
  const supabase = await createClient();
  const { data: batches } = await supabase.from("excel_import_batches").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  const list = batches || []; const selectedId = (await searchParams).batch; const selected = list.find(batch => batch.id === selectedId) || list[0] || null;
  const { data: records } = selected ? await supabase.from("excel_import_batch_records").select("*").eq("batch_id", selected.id).eq("user_id", user.id).order("source_row_number") : { data: [] };
  const name = user.email?.split("@")[0] || "Pilot";
  return <div className="min-h-screen bg-page"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={name.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-7xl px-6 py-10 lg:px-12"><Link href="/flights/import/excel" className="button-secondary inline-flex">← <span className="ml-2"><T id="excel.backToImport" /></span></Link><div className="mt-8"><p className="eyebrow"><T source="Excel Import" /></p><h1 className="mt-3 text-4xl font-bold tracking-tight text-brand"><T source="Import History" /></h1><p className="mt-3 text-muted"><T source="Review your Excel import batches and safely undo created flights." /></p></div><ExcelImportHistory batches={list} selected={selected} records={records || []} /></main></div>;
}
