import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function access() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, admin: false };
  const { data: admin } = await supabase.rpc("is_site_admin");
  return { supabase, user, admin: admin === true };
}

export async function GET(request: Request) {
  const { supabase, user, admin } = await access();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversation");
  let query = supabase.from("feedback_conversations").select("id,feedback_id,user_id,status,created_at,updated_at,last_activity_at,feedback_submissions(title,type,description,submitter_email)").order("last_activity_at", { ascending: false });
  if (conversationId) query = query.eq("id", conversationId);
  const { data: conversations, error } = await query;
  if (error) return NextResponse.json({ error: "Conversations unavailable." }, { status: 500 });
  const ids = (conversations ?? []).map(item => item.id);
  const { data: messages, error: messageError } = ids.length
    ? await supabase.from("feedback_messages").select("id,conversation_id,sender_id,sender_type,message_type,content,created_at").in("conversation_id", ids).order("created_at", { ascending: true }).order("id", { ascending: true })
    : { data: [], error: null };
  if (messageError) return NextResponse.json({ error: "Messages unavailable." }, { status: 500 });
  const lastByConversation = new Map<string, (typeof messages)[number]>();
  for (const message of messages ?? []) lastByConversation.set(message.conversation_id, message);
  const result = (conversations ?? []).map(conversation => ({ ...conversation, last_message: lastByConversation.get(conversation.id) ?? null, messages: conversationId === conversation.id ? (messages ?? []) : undefined }));
  return NextResponse.json({ conversations: result, isAdmin: admin });
}

export async function POST(request: Request) {
  const { supabase, user } = await access();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body?.conversationId !== "string" || typeof body?.content !== "string") return NextResponse.json({ error: "A conversation and message are required." }, { status: 400 });
  const { data, error } = await supabase.rpc("send_feedback_message", { p_conversation_id: body.conversationId, p_content: body.content });
  if (error) return NextResponse.json({ error: error.code === "55000" ? "This conversation is closed." : "Message could not be sent." }, { status: error.code === "55000" ? 409 : 500 });
  return NextResponse.json({ message: data });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await access();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body?.conversationId === "string" && body?.status === undefined) {
    const { error } = await supabase.from("inbox_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("recipient_user_id", user.id).eq("conversation_id", body.conversationId).eq("is_read", false);
    if (error) return NextResponse.json({ error: "Conversation notifications could not be updated." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (typeof body?.conversationId !== "string" || !["open", "closed"].includes(body?.status)) return NextResponse.json({ error: "A valid conversation status is required." }, { status: 400 });
  const { data, error } = await supabase.rpc("set_feedback_conversation_status", { p_conversation_id: body.conversationId, p_status: body.status });
  if (error) return NextResponse.json({ error: "Conversation status could not be updated." }, { status: 500 });
  return NextResponse.json({ conversation: data });
}
