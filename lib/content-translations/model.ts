export const roadmapTranslationFields = ["title", "description", "category"] as const;
export type ContentField = (typeof roadmapTranslationFields)[number];
export type ContentTranslation = {
  id: string; entity_type: string; entity_id: string; field_name: ContentField; locale: string;
  source_text: string; source_hash: string; translated_source_hash: string | null;
  translated_text: string | null; translation_source: "auto" | "manual";
  translation_status: "pending" | "completed" | "failed" | "outdated";
  generation: string; error_code: string | null; updated_at: string;
};

/** Shared by public pages and admin saved-content previews. No provider calls. */
export function resolveContentText(source: string, row: ContentTranslation | undefined, locale: string): string {
  if (locale === "en" || !row || row.locale !== locale || !row.translated_text?.trim()) return source;
  if (row.translation_source === "manual" && ["completed", "outdated"].includes(row.translation_status)) return row.translated_text;
  if (row.translation_source === "auto" && row.translation_status === "completed" && row.source_text === source && row.source_hash === row.translated_source_hash) return row.translated_text;
  return source;
}
export function validContentText(value: unknown, max = 12000): value is string {
  return typeof value === "string" && value.length <= max && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
}
/** Polling may observe a newer English source before the surrounding RSC refreshes. */
export function currentContentSource(source: string, itemUpdatedAt: string, row: ContentTranslation | undefined): string {
  return row && row.source_text !== source && Date.parse(row.updated_at) >= Date.parse(itemUpdatedAt) ? row.source_text : source;
}
export const validEntityId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function retryDelaySeconds(attempt: number): number { return Math.min(3600, 30 * 2 ** Math.min(Math.max(attempt - 1, 0), 7)); }
