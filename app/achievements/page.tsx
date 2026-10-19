import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import Link from "@/components/navigation-link";
import { T } from "@/components/i18n";
import { AchievementCabin } from "@/components/achievement-cabin";
import { readAchievementCabin } from "@/lib/achievements/server";
import { createClient } from "@/lib/supabase/server";

export default async function AchievementsPage() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/auth?next=/achievements"); const cabin = await readAchievementCabin(supabase, user.id); return <div className="min-h-screen bg-page"><SiteHeader /><main className="mx-auto max-w-7xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="button-secondary"><T id="common.backDashboard" /></Link><AchievementCabin cabin={cabin} /></main></div>; }
