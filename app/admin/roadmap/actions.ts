"use server";

import { revalidatePath } from "next/cache";
import { roadmapAccess } from "@/lib/roadmap/server";
import { parseRoadmapForm } from "@/lib/roadmap/model";

export type RoadmapResult = { error?: string; success?: string };
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
function refreshRoadmap() { revalidatePath("/"); revalidatePath("/roadmap"); revalidatePath("/admin/roadmap"); }

export async function saveRoadmap(form: FormData): Promise<RoadmapResult> {
  const { supabase, user, isAdmin } = await roadmapAccess();
  if (!user || !isAdmin) return { error: "Access denied. Sign in with an authorized administrator account." };
  let input;
  try { input = parseRoadmapForm(form); }
  catch (error) { return { error: error instanceof Error ? error.message : "Check the form fields." }; }
  const id = String(form.get("id") ?? "");
  if (id && !validId(id)) return { error: "Invalid roadmap item." };
  const query = id ? supabase.from("roadmap_items").update(input).eq("id", id) : supabase.from("roadmap_items").insert(input);
  const { data, error } = await query.select("id").single();
  if (error || !data) return { error: "The item could not be saved. Refresh, check your administrator access, and try again." };
  refreshRoadmap();
  return { success: input.publication_status === "published" ? "Published. The public roadmap and homepage now reflect this item." : "Draft saved. This item is private to administrators." };
}

export async function deleteRoadmap(id: string): Promise<RoadmapResult> {
  const { supabase, user, isAdmin } = await roadmapAccess();
  if (!user || !isAdmin) return { error: "Access denied. Sign in with an authorized administrator account." };
  if (!validId(id)) return { error: "Invalid roadmap item." };
  const { data, error } = await supabase.from("roadmap_items").delete().eq("id", id).select("id").single();
  if (error || !data) return { error: "The item could not be deleted. Refresh and check your administrator access." };
  refreshRoadmap();
  return { success: "Roadmap item deleted." };
}
