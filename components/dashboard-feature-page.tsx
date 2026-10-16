import { redirect } from "next/navigation";
import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { createClient } from "@/lib/supabase/server";
export async function DashboardFeaturePage({ title, next }: { title: string; next: string }) { const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect(`/auth?next=${next}`); return <div className="min-h-screen bg-page"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand/><UserMenu email={user.email??""} initials={(user.email??"P").slice(0,2).toUpperCase()}/></header><main className="mx-auto max-w-4xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="button-secondary"><T id="common.backDashboard"/></Link><h1 className="mt-8 text-4xl font-bold tracking-tight text-brand"><T id={title}/></h1><div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-10 text-center"><p className="text-muted"><T id="dashboard.pageComingSoon"/></p></div></main></div>; }
