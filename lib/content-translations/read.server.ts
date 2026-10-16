import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoadmapItem } from "@/lib/roadmap/model";
import { roadmapTranslationFields, type ContentTranslation } from "./model";

export async function readContentTranslations(client: SupabaseClient, ids: string[], admin = false, locale = "zh-CN") {
  if (!ids.length) return { ready: true, rows: [] as ContentTranslation[] };
  try {
    const rows: ContentTranslation[] = [];
    for (let index = 0; index < ids.length; index += 100) {
      const batch = ids.slice(index, index + 100);
      const query = admin ? client.from("content_translations").select("*").eq("entity_type", "roadmap").eq("locale", locale).in("entity_id", batch) : client.rpc("get_public_content_translations", { p_entity_ids: batch, p_locale: locale });
      const { data, error } = await query.abortSignal(AbortSignal.timeout(5000));
      if (error) return { ready: false, rows: [] as ContentTranslation[] };
      rows.push(...(data ?? []).filter((row: ContentTranslation) => row.entity_type === "roadmap" && batch.includes(row.entity_id) && roadmapTranslationFields.includes(row.field_name)));
    }
    return { ready: true, rows };
  } catch { return { ready: false, rows: [] as ContentTranslation[] }; }
}
export async function attachContentTranslations(client: SupabaseClient, items: RoadmapItem[], admin = false): Promise<RoadmapItem[]> {
  const result = await readContentTranslations(client, items.map(item => item.id), admin);
  return items.map(item => ({ ...item, translations: result.rows.filter(row => row.entity_id === item.id), translationsReady: result.ready }));
}
