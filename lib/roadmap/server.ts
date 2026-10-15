import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RoadmapItem } from "./model";

export async function roadmapAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { supabase, user: null, isAdmin: false, error: null };
  const { data, error } = await supabase.rpc("is_roadmap_admin").abortSignal(AbortSignal.timeout(8000));
  return { supabase, user, isAdmin: !error && data === true, error };
}

export async function publishedRoadmap() {
  const supabase = await createClient();
  // Explicit filter is required even for an administrator viewing a public page.
  const { data, error } = await supabase.from("roadmap_items")
    .select("id,title,description,category,status,publication_status,priority,target_date,completed_date,sort_order,created_at,updated_at")
    .eq("publication_status", "published").order("sort_order").order("created_at").order("id")
    .abortSignal(AbortSignal.timeout(8000));
  return { items: (data ?? []) as RoadmapItem[], failed: Boolean(error) };
}
