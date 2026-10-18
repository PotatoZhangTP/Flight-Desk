import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const utcDate = () => new Date().toISOString().slice(0, 10);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const date = utcDate();

  // Reading today's records must not depend on the optional server-side
  // generation credentials. This matters for previews, where the cron has
  // already generated the data but SUPABASE_SERVICE_ROLE_KEY may not exist.
  const [{ data: initialChallenges, error: initialChallengeError }, { data: memorials, error: memorialError }] = await Promise.all([
    supabase.from("daily_challenges").select("*").eq("challenge_date", date).order("category"),
    supabase.from("memorial_events").select("*").eq("enabled", true),
  ]);

  let challenges = initialChallenges ?? [];
  let generationError: string | null = null;

  // Only call the privileged function when today's four records are missing.
  // The date is calculated on the server, never accepted from the browser.
  if (!initialChallengeError && challenges.length < 4) {
    try {
      const generator = createServiceClient();
      let ensureError: { message?: string } | null = null;
      for (const delay of [0, 5000, 15000]) {
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        const result = await generator.rpc("ensure_daily_challenges", { p_date: date });
        ensureError = result.error;
        if (!ensureError) break;
      }

      if (ensureError) {
        generationError = ensureError.message || "Today's challenges could not be generated.";
      } else {
        const { data: generatedChallenges, error: generatedChallengeError } = await supabase
          .from("daily_challenges")
          .select("*")
          .eq("challenge_date", date)
          .order("category");
        if (generatedChallengeError) generationError = generatedChallengeError.message;
        else challenges = generatedChallenges ?? [];
      }
    } catch {
      generationError = "Today's challenges are not available yet.";
    }
  }

  const today = new Date(`${date}T00:00:00Z`);
  const memorialInWeek = (memorials ?? []).filter(event => { const start = event.publish_start_date ? new Date(`${event.publish_start_date}T00:00:00Z`) : new Date(Date.UTC(event.publish_year, event.publish_month - 1, event.publish_day)); const end = event.publish_end_date ? new Date(`${event.publish_end_date}T23:59:59Z`) : start; if (!event.recurring) return today >= start && today <= end; const year = today.getUTCFullYear(); const startThisYear = new Date(Date.UTC(year, start.getUTCMonth(), start.getUTCDate())); const endThisYear = new Date(Date.UTC(year, end.getUTCMonth(), end.getUTCDate(), 23, 59, 59)); return startThisYear <= endThisYear ? today >= startThisYear && today <= endThisYear : today >= startThisYear || today <= endThisYear; });
  return NextResponse.json({
    date,
    challenges,
    memorials: memorialInWeek,
    errors: {
      challenges: initialChallengeError?.message || generationError,
      memorials: memorialError?.message || null,
    },
  }, { headers: { "Cache-Control": "private, max-age=60" } });
}
