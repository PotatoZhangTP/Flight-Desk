import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resolvePublishedCopy, type ContentRow } from "./model";

export async function publishedLandingCopy() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("site_content")
      .select("content_key,content,publication_status")
      .eq("publication_status", "published").like("content_key", "landing.%")
      .abortSignal(AbortSignal.timeout(8000));
    // Missing content or an unavailable CMS must not blank the public homepage.
    return resolvePublishedCopy(error ? [] : (data ?? []) as ContentRow[]);
  } catch {
    return resolvePublishedCopy([]);
  }
}
