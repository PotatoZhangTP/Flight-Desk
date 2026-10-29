import { pinyin } from "pinyin-pro";

const chinese = /[\u3400-\u9fff]/;

function groupedPinyin(value: string) {
  const syllables = pinyin(value, { type: "array", toneType: "none" }) as string[];
  const variants = new Set<string>();
  for (let length = 2; length <= Math.min(syllables.length, 6); length += 1) {
    const prefix = syllables.slice(0, length);
    variants.add(prefix.join(" "));
    if (prefix.length > 1) {
      const grouped: string[] = [];
      for (let index = 0; index < prefix.length; index += 2) grouped.push(prefix.slice(index, index + 2).join(""));
      variants.add(grouped.join(" "));
    }
  }
  return [...variants].filter(value => value.length >= 4);
}

/** Original text first, then stable pinyin search candidates for Chinese input. */
export function airportSearchQueries(value: string) {
  const original = value.trim();
  if (!original) return [];
  const queries = new Set([original]);
  if (chinese.test(original)) for (const variant of groupedPinyin(original)) queries.add(variant);
  return [...queries];
}
