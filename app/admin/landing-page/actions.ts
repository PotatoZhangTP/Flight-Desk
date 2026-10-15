"use server";

import { revalidatePath } from "next/cache";
import { siteAdminAccess } from "@/lib/admin/server";
import { validateLandingDraft, type ContentRow } from "@/lib/content/model";

export type ContentResult = { error?: string; success?: string; changedRows?: number };

export async function saveLandingDraft(input: unknown): Promise<ContentResult> {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin) return { error: "Access denied. Sign in with an authorized administrator account." };
  let copy;
  try { copy = validateLandingDraft(input); }
  catch (error) { return { error: error instanceof Error ? error.message : "Check the draft fields." }; }
  const rows = Object.entries(copy).map(([content_key, content]) => ({ content_key, content, publication_status: "draft" }));
  const { data, error } = await supabase.from("site_content").upsert(rows, { onConflict: "content_key,publication_status" }).select("content_key");
  if (error || data?.length !== rows.length) return { error: "Draft could not be saved. Check your connection and administrator access, then try again." };
  revalidatePath("/admin/landing-page");
  return { success: "Draft saved. The public homepage is unchanged." };
}

export async function publishLandingDraft(): Promise<ContentResult> {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  if (!user || !isAdmin) return { error: "Access denied. Sign in with an authorized administrator account." };
  // Validate the persisted draft again, not an administrator flag or copy sent by a browser.
  const { data, error } = await supabase.from("site_content").select("content_key,content,publication_status").eq("publication_status", "draft").like("content_key", "landing.%");
  if (error) return { error: "The saved draft could not be checked. Nothing was published." };
  const knownDraft = Object.fromEntries(((data ?? []) as ContentRow[]).map(row => [row.content_key, row.content]));
  try { validateLandingDraft(knownDraft); }
  catch { return { error: "The saved draft is incomplete or invalid. Save a complete draft before publishing." }; }
  const result = await supabase.rpc("publish_landing_page");
  if (result.error || typeof result.data !== "number") return { error: "Publishing could not be confirmed. Your draft remains saved; refresh the public homepage before retrying." };
  revalidatePath("/");
  revalidatePath("/admin/landing-page");
  return { success: "Published. Refresh the public homepage to see the new copy.", changedRows: result.data };
}
