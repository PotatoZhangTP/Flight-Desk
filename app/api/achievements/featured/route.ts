import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ids = body?.featuredDefinitionIds;
  if (!Array.isArray(ids) || ids.length > 5 || ids.some((id: unknown) => typeof id !== "string") || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "Invalid featured achievements." }, { status: 400 });
  }

  if (ids.length) {
    const { data: definitions, error } = await supabase.from("achievement_definitions").select("id").in("id", ids).eq("is_active", true).eq("is_hidden", false);
    if (error || definitions?.length !== ids.length) return NextResponse.json({ error: "One or more achievements are unavailable." }, { status: 400 });
    const { data: unlocked, error: unlockedError } = await supabase.from("user_achievements").select("achievement_definition_id").eq("user_id", user.id).in("achievement_definition_id", ids);
    if (unlockedError || new Set((unlocked ?? []).map(row => row.achievement_definition_id)).size !== ids.length) {
      return NextResponse.json({ error: "Only unlocked achievements can be featured." }, { status: 400 });
    }
  }

  const { error } = await supabase.from("user_achievement_featured_preferences").upsert({
    user_id: user.id,
    featured_definition_ids: ids,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ featuredDefinitionIds: ids });
}
