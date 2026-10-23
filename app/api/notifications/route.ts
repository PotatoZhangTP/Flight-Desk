import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data, error } = await supabase.from("achievement_notifications")
    .select("id,event_id,event_type,is_read,created_at,achievement_definitions(slug,name_en,name_zh,icon_key),achievement_levels(level_key,name_en,name_zh)")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "Notifications unavailable." }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  let query = supabase.from("achievement_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", user.id);
  if (body?.all === true) query = query.eq("is_read", false);
  else if (typeof body?.id === "string") query = query.eq("id", body.id);
  else return NextResponse.json({ error: "A notification id is required." }, { status: 400 });
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Notification could not be updated." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
