import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteAdminAccess } from "@/lib/admin/server";
import { validEntityId } from "@/lib/content-translations/model";
import { readContentTranslations } from "@/lib/content-translations/read.server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ids = [...new Set((params.get("ids") ?? "").split(",").filter(Boolean).map(id => id.toLowerCase()))];
  const locale = params.get("locale") ?? "zh-CN";
  if (!/^[a-z]{2}(-[A-Za-z0-9]{2,8})*$/.test(locale)) return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  if (!ids.length || ids.length > 100 || ids.some(id => !validEntityId(id))) return NextResponse.json({ error: "Invalid content references" }, { status: 400 });
  if (params.get("admin") === "1") {
    const { supabase, user, isAdmin } = await siteAdminAccess();
    if (!user || !isAdmin) return NextResponse.json({ error: "Access denied" }, { status: 403 });
    return NextResponse.json(await readContentTranslations(supabase, ids, true, locale), { headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json(await readContentTranslations(await createClient(), ids, false, locale), { headers: { "Cache-Control": "private, no-store" } });
}
