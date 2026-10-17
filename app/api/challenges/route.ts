import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") || new Date().toISOString().slice(0, 10);
  let generator;
  try { generator = createServiceClient(); } catch { return NextResponse.json({ error: "unavailable" }, { status: 503 }); }
  const { error: ensureError } = await generator.rpc("ensure_daily_challenges", { p_date: date });
  if (ensureError) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const [{ data: challenges, error }, { data: memorials }] = await Promise.all([
    supabase.from("daily_challenges").select("*").eq("challenge_date", date).order("category"),
    supabase.from("memorial_events").select("*").eq("enabled", true),
  ]);
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const today = new Date(`${date}T00:00:00Z`);
  const monday = new Date(today); monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6);
  const memorialInWeek = (memorials ?? []).filter(event => { const year = event.recurring ? today.getUTCFullYear() : event.event_year; const anniversary = new Date(Date.UTC(year, event.event_month - 1, event.event_day)); return anniversary >= monday && anniversary <= sunday; });
  return NextResponse.json({ date, challenges: challenges ?? [], memorials: memorialInWeek }, { headers: { "Cache-Control": "private, max-age=60" } });
}
