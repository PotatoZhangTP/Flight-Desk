import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const [{ data, error }, { data: messages, error: messageError }] = await Promise.all([supabase.from("achievement_notifications")
    .select("id,event_id,event_type,is_read,created_at,achievement_definitions(slug,name_en,name_zh,icon_key),achievement_levels(level_key,name_en,name_zh)")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50), supabase.from("inbox_notifications")
    .select("id,notification_type,is_read,created_at,title,body,conversation_id,message_id")
    .eq("recipient_user_id", user.id).order("created_at", { ascending: false }).limit(50)]);
  if (error) return NextResponse.json({ error: "Notifications unavailable." }, { status: 500 });
  const achievements = (data ?? []).map(item => {
    const definition = Array.isArray(item.achievement_definitions) ? item.achievement_definitions[0] : item.achievement_definitions;
    const level = Array.isArray(item.achievement_levels) ? item.achievement_levels[0] : item.achievement_levels;
    return { ...item, achievement_definitions: definition ?? null, achievement_levels: level ?? null, kind: "achievement", title: definition?.name_en ?? "Achievement", body: item.event_type === "revoked" ? "Achievement status updated." : "Achievement unlocked.", target: "/achievements", conversation_id: null };
  });
  const feedback = messageError ? [] : (messages ?? []).map(item => ({ id: item.id, event_id: item.id, kind: "message", event_type: item.notification_type, is_read: item.is_read, created_at: item.created_at, title: item.title, body: item.body, target: null, conversation_id: item.conversation_id }));
  return NextResponse.json({ notifications: [...achievements, ...feedback].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100) });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body?.all === true) {
    const [achievements, messages] = await Promise.all([
      supabase.from("achievement_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", user.id).eq("is_read", false),
      supabase.from("inbox_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("recipient_user_id", user.id).eq("is_read", false),
    ]);
    if (achievements.error || messages.error) return NextResponse.json({ error: "Notifications could not be updated." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (typeof body?.id === "string" && body?.kind === "message") {
    const { error } = await supabase.from("inbox_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", body.id).eq("recipient_user_id", user.id);
    if (error) return NextResponse.json({ error: "Notification could not be updated." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  let query = supabase.from("achievement_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", user.id);
  if (typeof body?.id === "string") query = query.eq("id", body.id);
  else return NextResponse.json({ error: "A notification id is required." }, { status: 400 });
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Notification could not be updated." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body?.id !== "string") return NextResponse.json({ error: "A notification id is required." }, { status: 400 });
  const table = body?.kind === "message" ? "inbox_notifications" : "achievement_notifications";
  const owner = table === "inbox_notifications" ? "recipient_user_id" : "user_id";
  const { error } = await supabase.from(table).delete().eq("id", body.id).eq(owner, user.id);
  if (error) return NextResponse.json({ error: "Notification could not be deleted." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
