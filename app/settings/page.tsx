import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { PasswordSecurity } from "@/components/password-security";
import { ProfileEditor } from "@/components/profile-editor";
import { AvatarUrlEditor } from "@/components/avatar-url-editor";
import { BioEditor } from "@/components/bio-editor";
import { LanguageSelector } from "@/components/language-selector";
import { AppearanceSettings } from "@/components/theme-controls";
import { UserMenu } from "@/components/user-menu";
import { DashboardSpotlight } from "@/components/dashboard-spotlight";
import { createClient } from "@/lib/supabase/server";
import { FullSettingsPreferences } from "@/components/full-settings";
import { SettingsSections } from "@/components/settings-sections";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/settings");
  const { data: profile } = await supabase.from("profiles").select("display_name,avatar_url,bio").eq("id", user.id).maybeSingle();
  const displayName = profile?.display_name?.trim() || user.email?.split("@")[0] || "Pilot";
  const account = <section className="space-y-6">
    <section className="spotlight-card rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-xl font-bold text-ink"><T id="profile.details" /></h2>
      <div className="mt-6 flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-soft text-lg font-bold text-brand">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : displayName.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><ProfileEditor initialName={displayName} /><AvatarUrlEditor initialAvatarUrl={profile?.avatar_url} /></div></div>
      <div className="mt-6 border-t border-line pt-6"><h3 className="text-sm font-bold text-ink"><T id="profile.bio" /></h3><BioEditor initialBio={profile?.bio ?? ""} /></div>
    </section>
    <section className="spotlight-card rounded-2xl border border-line bg-surface p-6"><h2 className="text-xl font-bold text-ink"><T id="profile.emailTitle" /></h2><p className="mt-2 text-sm text-muted"><T id="profile.emailHelp" /></p><p className="mt-4 rounded-xl bg-page px-4 py-3 font-semibold text-ink">{user.email}</p></section>
    <div className="spotlight-card rounded-2xl"><PasswordSecurity /></div>
  </section>;
  return <div className="min-h-screen bg-page"><DashboardSpotlight /><header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={displayName.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-5xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="text-sm font-semibold text-muted"><T id="common.backDashboard" /></Link><p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-brand"><T id="profile.account" /></p><h1 className="mt-2 text-4xl font-bold tracking-tight text-ink"><T id="common.settings" /></h1><p className="mt-2 text-muted"><T id="profile.settingsHelp" /></p><SettingsSections general={<><AppearanceSettings /><LanguageSelector settings /><FullSettingsPreferences /></>} account={account} /></main></div>;
}
