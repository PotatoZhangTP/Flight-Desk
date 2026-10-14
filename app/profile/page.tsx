import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/profile");
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const name = profile?.display_name?.trim() || user.email?.split("@")[0] || "Pilot";
  return <div className="min-h-screen bg-[#f7f9fc]"><header className="flex items-center justify-between border-b border-[#d9e2ec] bg-white px-6 py-5 lg:px-12"><Brand /><UserMenu email={user.email ?? ""} initials={name.slice(0, 2).toUpperCase()} /></header><main className="mx-auto max-w-3xl px-6 py-10 lg:px-12"><Link href="/dashboard" className="text-sm font-semibold text-[#627d98]">← Back to dashboard</Link><div className="mt-12 rounded-2xl border border-[#d9e2ec] bg-white p-8 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#dff4f0] text-xl font-bold text-[#168c82]">{name.slice(0, 2).toUpperCase()}</div><h1 className="mt-5 text-3xl font-bold text-[#102a43]">{name}</h1><p className="mt-3 text-[#627d98]">Public profile features are not available yet.</p><p className="mt-1 text-sm text-[#829ab1]">Your flight records and statistics remain private until you choose to share them in a future release.</p></div></main></div>;
}
