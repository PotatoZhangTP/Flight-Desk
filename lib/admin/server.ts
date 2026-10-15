import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function siteAdminAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) return { supabase, user: null, isAdmin: false, error: null };
  const { data, error } = await supabase.rpc("is_site_admin").abortSignal(AbortSignal.timeout(8000));
  return { supabase, user, isAdmin: !error && data === true, error };
}
