import { redirect } from "next/navigation";
import Link from "@/components/navigation-link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SiteHeader } from "@/components/site-header";
import { DailyChallengePage, type Challenge, type Memorial } from "@/components/daily-challenge";
import { flownChallengeCategories } from "@/lib/daily-challenge-flight-status";

export const dynamic = "force-dynamic";
export default async function ChallengesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/challenges");
  const date = new Date().toISOString().slice(0, 10);
  let generator;
  try { generator = createServiceClient(); } catch { generator = null; }
  if (generator) await generator.rpc("ensure_daily_challenges", { p_date: date });
  const [{ data: challenges }, { data: memorials }, { data: completions }, { data: flownFlights }] = await Promise.all([
    supabase.from("daily_challenges").select("*").eq("challenge_date", date).order("category"),
    supabase.from("memorial_events").select("*").eq("enabled", true),
    supabase.from("daily_challenge_completions").select("category").eq("challenge_date", date),
    supabase.from("flights").select("departure_airport_icao,arrival_airport_icao,departure_airport_iata,arrival_airport_iata").eq("user_id", user.id).eq("status", "completed"),
  ]);
  const today = new Date(`${date}T00:00:00Z`); const memorialInWeek = (memorials ?? []).filter(event => { const start = event.publish_start_date ? new Date(`${event.publish_start_date}T00:00:00Z`) : new Date(Date.UTC(event.publish_year, event.publish_month - 1, event.publish_day)); const end = event.publish_end_date ? new Date(`${event.publish_end_date}T23:59:59Z`) : start; if (!event.recurring) return today >= start && today <= end; const year = today.getUTCFullYear(); const startThisYear = new Date(Date.UTC(year, start.getUTCMonth(), start.getUTCDate())); const endThisYear = new Date(Date.UTC(year, end.getUTCMonth(), end.getUTCDate(), 23, 59, 59)); return startThisYear <= endThisYear ? today >= startThisYear && today <= endThisYear : today >= startThisYear || today <= endThisYear; });
  const currentChallenges = (challenges ?? []) as Challenge[];
  return <div className="min-h-screen bg-page"><SiteHeader /><main className="mx-auto max-w-6xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="button-secondary inline-flex">← <span className="ml-2">Back To Dashboard</span></Link><div className="mt-10"><DailyChallengePage initial={{ challenges: currentChallenges, memorials: memorialInWeek as Memorial[], completedCategories: (completions ?? []).map(completion => completion.category), flownCategories: flownChallengeCategories(currentChallenges, flownFlights ?? []) }} selected={(await searchParams).route} /></div></main></div>;
}
