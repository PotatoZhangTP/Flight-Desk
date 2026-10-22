import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const setHighestLevels = body?.setHighestLevels === true;
  const ids = body?.featuredDefinitionIds;
  const displayLevelKeys = body?.displayLevelKeys;
  if (setHighestLevels) {
    const [{ data: definitions, error: definitionsError }, { data: levels, error: levelsError }, { data: awards, error: awardsError }, { data: preference, error: preferenceError }] = await Promise.all([
      supabase.from("achievement_definitions").select("id,badge_type").eq("is_active", true).eq("is_hidden", false),
      supabase.from("achievement_levels").select("id,achievement_definition_id,level_key,level_order"),
      supabase.from("user_achievements").select("achievement_definition_id,achievement_level_id").eq("user_id", user.id),
      supabase.from("user_achievement_featured_preferences").select("featured_definition_ids,display_level_keys").eq("user_id", user.id).maybeSingle(),
    ]);
    if (definitionsError || levelsError || awardsError || preferenceError) return NextResponse.json({ error: "Could not restore highest badge levels." }, { status: 500 });
    const levelById = new Map((levels ?? []).map(level => [level.id, level]));
    const definitionById = new Map((definitions ?? []).map(definition => [definition.id, definition]));
    const highest = new Map<string, { level_key: string; level_order: number }>();
    for (const award of awards ?? []) {
      const level = levelById.get(award.achievement_level_id);
      const definition = definitionById.get(award.achievement_definition_id);
      if (!level || definition?.badge_type !== "progressive") continue;
      const current = highest.get(award.achievement_definition_id);
      if (!current || level.level_order > current.level_order) highest.set(award.achievement_definition_id, level);
    }
    const storedIds = Array.isArray(preference?.featured_definition_ids) ? preference.featured_definition_ids as string[] : [];
    const storedLevels = preference?.display_level_keys && typeof preference.display_level_keys === "object" && !Array.isArray(preference.display_level_keys) ? preference.display_level_keys as Record<string, string> : {};
    const nextLevels = { ...storedLevels };
    for (const [definitionId, level] of highest) nextLevels[definitionId] = level.level_key;
    const { error: saveError } = await supabase.from("user_achievement_featured_preferences").upsert({ user_id: user.id, featured_definition_ids: storedIds, display_level_keys: nextLevels, updated_at: new Date().toISOString() });
    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });
    return NextResponse.json({ featuredDefinitionIds: storedIds, displayLevelKeys: nextLevels });
  }
  if (!Array.isArray(ids) || ids.length > 5 || ids.some((id: unknown) => typeof id !== "string") || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "Invalid featured achievements." }, { status: 400 });
  }
  if (displayLevelKeys !== undefined && (!displayLevelKeys || typeof displayLevelKeys !== "object" || Array.isArray(displayLevelKeys))) return NextResponse.json({ error: "Invalid display levels." }, { status: 400 });

  if (ids.length) {
    const { data: definitions, error } = await supabase.from("achievement_definitions").select("id").in("id", ids).eq("is_active", true).eq("is_hidden", false);
    if (error || definitions?.length !== ids.length) return NextResponse.json({ error: "One or more achievements are unavailable." }, { status: 400 });
    const { data: unlocked, error: unlockedError } = await supabase.from("user_achievements").select("achievement_definition_id").eq("user_id", user.id).in("achievement_definition_id", ids);
    if (unlockedError || new Set((unlocked ?? []).map(row => row.achievement_definition_id)).size !== ids.length) {
      return NextResponse.json({ error: "Only unlocked achievements can be featured." }, { status: 400 });
    }
    for (const [definitionId, levelKey] of Object.entries(displayLevelKeys ?? {})) {
      if (!ids.includes(definitionId) || !["bronze", "silver", "gold", "platinum"].includes(String(levelKey))) return NextResponse.json({ error: "Invalid display level selection." }, { status: 400 });
      const { data: level } = await supabase.from("achievement_levels").select("id").eq("achievement_definition_id", definitionId).eq("level_key", levelKey).maybeSingle();
      if (!level) return NextResponse.json({ error: "Invalid display level selection." }, { status: 400 });
    }
  }

  const { data: existingPreference } = await supabase.from("user_achievement_featured_preferences").select("display_level_keys").eq("user_id", user.id).maybeSingle();
  const existingDisplayLevels = existingPreference?.display_level_keys && typeof existingPreference.display_level_keys === "object" && !Array.isArray(existingPreference.display_level_keys) ? existingPreference.display_level_keys as Record<string, string> : {};
  const { error } = await supabase.from("user_achievement_featured_preferences").upsert({
    user_id: user.id,
    featured_definition_ids: ids,
    display_level_keys: { ...existingDisplayLevels, ...(displayLevelKeys ?? {}) },
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ featuredDefinitionIds: ids });
}
