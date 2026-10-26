"use server";

import { revalidatePath } from "next/cache";
import { siteAdminAccess } from "@/lib/admin/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function adminMutation(id: string, update: Record<string, unknown>) {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin || !uuid.test(id)) return { error: "admin.denied" };
  const { error } = await supabase.from("feedback_submissions").update(update).eq("id", id);
  if (error) return { error: "feedback.updateError" };
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
  return { success: "feedback.updated" };
}

export async function setFeedbackRead(id: string, isRead: boolean) {
  return adminMutation(id, { is_read: isRead });
}

export async function setFeedbackStatus(id: string, status: "new" | "in_progress" | "resolved") {
  return adminMutation(id, { status });
}

export async function archiveFeedback(id: string) {
  return adminMutation(id, { archived_at: new Date().toISOString(), is_read: true });
}
