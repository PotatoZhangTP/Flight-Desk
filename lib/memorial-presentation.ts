export const memorialTypes = ["accident_memorial", "historical_anniversary"] as const;
export type MemorialType = typeof memorialTypes[number];

export type MemorialPresentation = {
  memorial_type?: string | null;
  memorial_message_en?: string | null;
  memorial_message_zh?: string | null;
};

// Legacy records have no classification; keep their quiet remembrance treatment.
export function normalizeMemorialType(value: unknown): MemorialType {
  return value === "historical_anniversary" ? value : "accident_memorial";
}

export function memorialCardCopy(event: MemorialPresentation & {
  title_en: string; title_zh?: string | null;
  description_en?: string | null; description_zh?: string | null;
}, locale: string) {
  const chinese = locale === "zh-CN";
  const title = chinese ? event.title_zh || event.title_en : event.title_en || event.title_zh;
  // Prefer an administrator's short message in either language to a long story.
  const message = chinese
    ? event.memorial_message_zh || event.memorial_message_en || event.description_zh || event.description_en
    : event.memorial_message_en || event.memorial_message_zh || event.description_en || event.description_zh;
  return { title, message };
}
