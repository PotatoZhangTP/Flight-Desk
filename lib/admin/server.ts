import "server-only";
import { requestAuth } from "@/lib/auth/server";

export async function siteAdminAccess() {
  const { supabase, user, error: authError } = await requestAuth();
  if (!user || authError) return { supabase, user: null, isAdmin: false, error: null };
  const { data, error } = await supabase.rpc("is_site_admin").abortSignal(AbortSignal.timeout(8000));
  return { supabase, user, isAdmin: !error && data === true, error };
}
