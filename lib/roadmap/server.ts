import "server-only";
import { unstable_cache } from "next/cache";
import { requestAuth } from "@/lib/auth/server";
import { createPublicClient } from "@/lib/supabase/public";
import { readRoadmapItems, type DatabaseRoadmapItem } from "./read-model.server";
import { attachContentTranslations } from "@/lib/content-translations/read.server";

export async function roadmapAccess() {
  const { supabase, user, error: authError } = await requestAuth();
  if (authError || !user) return { supabase, user: null, isAdmin: false, error: null };
  const { data, error } = await supabase.rpc("is_roadmap_admin").abortSignal(AbortSignal.timeout(8000));
  return { supabase, user, isAdmin: !error && data === true, error };
}

const readPublishedRoadmap = unstable_cache(async () => {
  try {
    const supabase = createPublicClient();
    // Explicit filter is required even for an administrator viewing a public page.
    const { data, error } = await supabase.from("roadmap_items")
      .select("id,title,description,category,status,publication_status,priority,target_date,completed_date,sort_order,created_at,updated_at")
      .eq("publication_status", "published").order("sort_order").order("created_at").order("id")
      .abortSignal(AbortSignal.timeout(1800));
    return { items: await attachContentTranslations(supabase, readRoadmapItems((data ?? []) as DatabaseRoadmapItem[])), failed: Boolean(error) };
  } catch {
    return { items: [], failed: true };
  }
}, ["published-roadmap-v1"], { revalidate: 60 });

export async function publishedRoadmap() { return readPublishedRoadmap(); }
