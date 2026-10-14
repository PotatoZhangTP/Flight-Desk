import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { PasswordSecurity } from "@/components/password-security";
import { ProfileEditor } from "@/components/profile-editor";
import { UserMenu } from "@/components/user-menu";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/settings");
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const displayName = profile?.display_name?.trim() || user.email?.split("@")[0] || "Pilot";
  return <div className="min-h-screen bg-[#f7f9fc]"><header className="flex items-center justify-between border-b border-[#d9e2ec] bg-white px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={displayName.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-3xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="text-sm font-semibold text-[#627d98]">← Back to dashboard</Link><p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-[#e8753a]">Account</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#102a43]">Settings</h1><p className="mt-2 text-[#627d98]">Manage your account details and preferences.</p><section className="mt-8 rounded-2xl border border-[#d9e2ec] bg-white p-6"><h2 className="text-xl font-bold text-[#102a43]">Profile details</h2><div className="mt-6 flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#dff4f0] text-lg font-bold text-[#168c82]">{displayName.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><ProfileEditor initialName={displayName} /><p className="mt-1 text-sm text-[#829ab1]">Default avatar · uploads coming later</p></div></div></section><section className="mt-6 rounded-2xl border border-[#d9e2ec] bg-white p-6"><h2 className="text-xl font-bold text-[#102a43]">Sign-in email</h2><p className="mt-2 text-sm text-[#627d98]">This is the email connected to your Flight Desk account.</p><p className="mt-4 rounded-xl bg-[#f7f9fc] px-4 py-3 font-semibold text-[#102a43]">{user.email}</p></section><PasswordSecurity /></main></div>;
}
