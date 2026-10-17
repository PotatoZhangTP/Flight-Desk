import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SiteHeader } from "@/components/site-header";
import { DailyChallengePage, type Challenge, type Memorial } from "@/components/daily-challenge";

export const dynamic = "force-dynamic";
export default async function ChallengesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/challenges");
  const date = new Date().toISOString().slice(0, 10);
  let generator;
  try { generator = createServiceClient(); } catch { generator = null; }
  if (generator) await generator.rpc("ensure_daily_challenges", { p_date: date });
  const [{ data: challenges }, { data: memorials }] = await Promise.all([
    supabase.from("daily_challenges").select("*").eq("challenge_date", date).order("category"),
    supabase.from("memorial_events").select("*").eq("enabled", true),
  ]);
  const today = new Date(`${date}T00:00:00Z`); const monday = new Date(today); monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7)); const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6); const memorialInWeek = (memorials ?? []).filter(event => { const year = event.recurring ? today.getUTCFullYear() : event.publish_year; const publishDate = new Date(Date.UTC(year, event.publish_month - 1, event.publish_day)); return publishDate >= monday && publishDate <= sunday; });
  return <div className="min-h-screen bg-page"><SiteHeader /><main className="mx-auto max-w-6xl px-6 py-12 lg:px-12"><DailyChallengePage initial={{ challenges: (challenges ?? []) as Challenge[], memorials: memorialInWeek as Memorial[] }} selected={(await searchParams).route} /></main></div>;
}
