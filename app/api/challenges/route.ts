import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { flownChallengeCategories } from "@/lib/daily-challenge-flight-status";
import { addDailyChallengeReasons } from "@/lib/daily-challenge-recommendation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const utcDate = () => new Date().toISOString().slice(0, 10);

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const date = utcDate();
  const readSignal = () => AbortSignal.any([request.signal, AbortSignal.timeout(5000)]);

  // Reading today's records must not depend on the optional server-side
  // generation credentials. This matters for previews, where the cron has
  // already generated the data but SUPABASE_SERVICE_ROLE_KEY may not exist.
  const [{ data: initialChallenges, error: initialChallengeError }, { data: memorials, error: memorialError }, { data: completions, error: completionError }] = await Promise.all([
    supabase.from("daily_challenges").select("*").eq("challenge_date", date).order("category").abortSignal(readSignal()),
    supabase.from("memorial_events").select("*").eq("enabled", true).abortSignal(readSignal()),
    supabase.from("daily_challenge_completions").select("category").eq("challenge_date", date).abortSignal(readSignal()),
  ]);

  let challenges = initialChallenges ?? [];
  let generationError: string | null = null;

  // Only call the privileged function when today's four records are missing.
  // The date is calculated on the server, never accepted from the browser.
  if (!initialChallengeError && challenges.length < 4) {
    try {
      // Production normally uses the service role for the one global write.
      // Preview deployments may intentionally omit that secret; the fallback
      // uses the authenticated client and the narrowly-scoped database grant
      // for ensure_daily_challenges(current UTC date).
      let generator;
      try {
        generator = createServiceClient();
      } catch {
        generator = supabase;
      }
      const { error: ensureError } = await generator
        .rpc("ensure_daily_challenges", { p_date: date })
        .abortSignal(readSignal());

      if (ensureError) {
        generationError = ensureError.message || "Today's challenges could not be generated.";
      } else {
        const { data: generatedChallenges, error: generatedChallengeError } = await supabase
          .from("daily_challenges")
          .select("*")
          .eq("challenge_date", date)
          .order("category")
          .abortSignal(readSignal());
        if (generatedChallengeError) generationError = generatedChallengeError.message;
        else challenges = generatedChallenges ?? [];
      }
    } catch {
      generationError = "Today's challenges are not available yet.";
    }
  }

  const { data: flownFlights, error: flownFlightsError } = await supabase
    .from("flights")
    .select("departure_airport_icao,arrival_airport_icao,departure_airport_iata,arrival_airport_iata")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .abortSignal(readSignal());

  const today = new Date(`${date}T00:00:00Z`);
  const memorialInWeek = (memorials ?? []).filter(event => { const start = event.publish_start_date ? new Date(`${event.publish_start_date}T00:00:00Z`) : new Date(Date.UTC(event.publish_year, event.publish_month - 1, event.publish_day)); const end = event.publish_end_date ? new Date(`${event.publish_end_date}T23:59:59Z`) : start; if (!event.recurring) return today >= start && today <= end; const year = today.getUTCFullYear(); const startThisYear = new Date(Date.UTC(year, start.getUTCMonth(), start.getUTCDate())); const endThisYear = new Date(Date.UTC(year, end.getUTCMonth(), end.getUTCDate(), 23, 59, 59)); return startThisYear <= endThisYear ? today >= startThisYear && today <= endThisYear : today >= startThisYear || today <= endThisYear; });
  const challengesWithReasons = await addDailyChallengeReasons(supabase, challenges);
  return NextResponse.json({
    date,
    challenges: challengesWithReasons,
    memorials: memorialInWeek,
    completedCategories: (completions ?? []).map(completion => completion.category),
    flownCategories: flownChallengeCategories(challengesWithReasons, flownFlights ?? []),
    errors: {
      challenges: initialChallengeError?.message || generationError,
      memorials: memorialError?.message || null,
      completions: completionError?.message || null,
      flights: flownFlightsError?.message || null,
    },
  }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}
