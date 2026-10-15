import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { PasswordSecurity } from "@/components/password-security";
import { ProfileEditor } from "@/components/profile-editor";
import { AppearanceSettings } from "@/components/theme-controls";
import { UserMenu } from "@/components/user-menu";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/settings");
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const displayName = profile?.display_name?.trim() || user.email?.split("@")[0] || "Pilot";
  return <div className="min-h-screen bg-page"><header className="flex items-center justify-between border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={displayName.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-3xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="text-sm font-semibold text-muted">← Back to dashboard</Link><p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-brand">Account</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-ink">Settings</h1><p className="mt-2 text-muted">Manage your account details and preferences.</p><section className="mt-8 rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold text-ink">Profile details</h2><div className="mt-6 flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-soft text-lg font-bold text-brand">{displayName.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><ProfileEditor initialName={displayName} /><p className="mt-1 text-sm text-subtle">Default avatar · uploads coming later</p></div></div></section><section className="mt-6 rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold text-ink">Sign-in email</h2><p className="mt-2 text-sm text-muted">This is the email connected to your Flight Desk account.</p><p className="mt-4 rounded-xl bg-page px-4 py-3 font-semibold text-ink">{user.email}</p></section><AppearanceSettings /><PasswordSecurity /></main></div>;
}
