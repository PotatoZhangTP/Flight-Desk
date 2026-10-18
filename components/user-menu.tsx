import { createClient } from "@/lib/supabase/server";
import { AccountControls } from "./account-controls";

export async function UserMenu({ email, initials }: { email: string; initials: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).maybeSingle() : { data: null };
  const name = profile?.display_name?.trim() || email.split("@")[0] || initials;
  return <AccountControls initials={name.slice(0, 2).toUpperCase()} avatarUrl={profile?.avatar_url} />;
}
