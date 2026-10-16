import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { PasswordSecurity } from "@/components/password-security";
import { ProfileEditor } from "@/components/profile-editor";
import { LanguageSelector } from "@/components/language-selector";
import { AppearanceSettings } from "@/components/theme-controls";
import { UserMenu } from "@/components/user-menu";
import { createClient } from "@/lib/supabase/server";
import { FullSettingsPreferences } from "@/components/full-settings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/settings");
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const displayName = profile?.display_name?.trim() || user.email?.split("@")[0] || "Pilot";
  return <div className="min-h-screen bg-page"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={displayName.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-5xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="text-sm font-semibold text-muted"><T id="common.backDashboard" /></Link><p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-brand"><T id="profile.account" /></p><h1 className="mt-2 text-4xl font-bold tracking-tight text-ink"><T id="common.settings" /></h1><p className="mt-2 text-muted"><T id="profile.settingsHelp" /></p><div className="mt-8 grid gap-6 lg:grid-cols-[180px_1fr]"><nav className="hidden rounded-2xl border border-line bg-surface p-3 lg:block"><a href="#general" className="block rounded-xl bg-brand-soft px-3 py-2.5 text-sm font-bold text-brand"><T id="settings.general" /></a><a href="#account" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-brand-soft"><T id="settings.account" /></a><a href="#flight-preferences" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-brand-soft"><T id="settings.flightPreferences" /></a></nav><div className="min-w-0 space-y-6"><div id="general"><AppearanceSettings /><LanguageSelector settings /><FullSettingsPreferences /></div><section id="account" className="space-y-6"><section className="rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold text-ink"><T id="profile.details" /></h2><div className="mt-6 flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-soft text-lg font-bold text-brand">{displayName.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><ProfileEditor initialName={displayName} /><p className="mt-1 text-sm text-subtle"><T id="profile.defaultAvatar" /></p></div></div></section><section className="rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold text-ink"><T id="profile.emailTitle" /></h2><p className="mt-2 text-sm text-muted"><T id="profile.emailHelp" /></p><p className="mt-4 rounded-xl bg-page px-4 py-3 font-semibold text-ink">{user.email}</p></section><PasswordSecurity /></section><section id="flight-preferences" className="rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold"><T id="settings.flightPreferences" /></h2><p className="mt-2 text-sm text-muted"><T id="settings.flightPreferencesHelp" /></p></section></div></div></main></div>;
}
