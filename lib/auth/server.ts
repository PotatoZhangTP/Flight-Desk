import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * One verified Auth lookup per React server render. This cache is request
 * scoped; it never shares a session or private data between users.
 */
export const requestAuth = cache(async () => {
  const supabase = await createClient();
  const hasAuthCookie = (await cookies()).getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
  if (!hasAuthCookie) return { supabase, user: null, error: null };
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user, error };
});
