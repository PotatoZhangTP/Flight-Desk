"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function isTrustedHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".vercel.app");
}

async function getSiteUrl() {
  const requestHeaders = await headers();
  const requestOrigin = requestHeaders.get("origin");
  if (requestOrigin) {
    try {
      const origin = new URL(requestOrigin);
      if ((origin.protocol === "https:" || origin.hostname === "localhost" || origin.hostname === "127.0.0.1") && isTrustedHost(origin.hostname)) {
        return origin.origin;
      }
    } catch {
      // Ignore malformed Origin values and use the trusted proxy fallback below.
    }
  }

  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    try {
      const host = new URL(`https://${forwardedHost}`);
      if (isTrustedHost(host.hostname)) return host.origin;
    } catch {
      // Ignore malformed forwarded hosts.
    }
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (process.env.VERCEL_ENV === "preview" && vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await getSiteUrl()}/auth/callback` },
  });
  return { error: error?.message ?? null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateDisplayName(displayName: string) {
  const name = displayName.trim();
  if (!name || name.length > 80) return { error: "Please enter a name up to 80 characters." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateProfileBio(bio: string) {
  const value = bio.trim();
  if (value.length > 280) return { error: "Your bio must be 280 characters or fewer." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const { error } = await supabase.from("profiles").update({ bio: value }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/settings");
  return { error: null };
}

export async function updateAvatarUrl(avatarUrl: string) {
  const value = avatarUrl.trim();
  if (value) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") return { error: "Please enter a valid image URL." };
    } catch {
      return { error: "Please enter a valid image URL." };
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const { error } = await supabase.from("profiles").update({ avatar_url: value || null }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { error: null };
}

export async function requestPasswordChange() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "No signed-in email was found." };
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${await getSiteUrl()}/auth/callback?next=/auth/update-password`,
  });
  return { error: error?.message ?? null };
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/auth/reset-password?error=Enter%20your%20email%20address");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getSiteUrl()}/auth/callback?next=/auth/update-password`,
  });
  if (error) redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  redirect("/auth/reset-password?sent=1");
}
