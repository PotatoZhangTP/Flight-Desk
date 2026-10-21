import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { resolvePublishedCopy, type ContentRow } from "./model";

const readPublishedLandingCopy = unstable_cache(async () => {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.from("site_content")
      .select("content_key,content,publication_status")
      .eq("publication_status", "published").like("content_key", "landing.%")
      .abortSignal(AbortSignal.timeout(1800));
    // Missing content or an unavailable CMS must not blank the public homepage.
    return resolvePublishedCopy(error ? [] : (data ?? []) as ContentRow[]);
  } catch {
    return resolvePublishedCopy([]);
  }
}, ["published-landing-copy-v1"], { revalidate: 60 });

export async function publishedLandingCopy() { return readPublishedLandingCopy(); }
