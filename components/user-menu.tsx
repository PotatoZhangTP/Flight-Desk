import { siteAdminAccess } from "@/lib/admin/server";
import { AccountControls } from "./account-controls";

export async function UserMenu({ email, initials, profile: providedProfile }: { email: string; initials: string; profile?: { displayName?: string | null; avatarUrl?: string | null } }) {
  const { supabase, user, isAdmin } = await siteAdminAccess();
  const { data: fetchedProfile } = user && !providedProfile ? await supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).maybeSingle() : { data: null };
  const profile = providedProfile ?? { displayName: fetchedProfile?.display_name, avatarUrl: fetchedProfile?.avatar_url };
  const name = profile.displayName?.trim() || email.split("@")[0] || initials;
  return <AccountControls initials={name.slice(0, 2).toUpperCase()} avatarUrl={profile.avatarUrl} isAdmin={isAdmin} />;
}
