import { createTranslator } from "next-intl";
import { byKey } from "./catalog";

/** Only plain messages with the same named arguments as the English source. */
export function validTranslation(key: string, value: unknown): value is string {
  if (!byKey[key] || typeof value !== "string" || !value.trim() || value.length > 4000 || /[<>\u0000]/.test(value)) return false;
  const args = (text: string) => [...text.matchAll(/\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*(?:[,}])/g)].map(match => match[1]).sort();
  const expected = [...new Set(args(byKey[key].en))];
  if (JSON.stringify([...new Set(args(value))]) !== JSON.stringify(expected)) return false;
  let valid = true;
  const t = createTranslator({ locale: "zh-CN", messages: { value }, onError: () => { valid = false; } });
  t("value", Object.fromEntries(expected.map(name => [name, 2])));
  return valid;
}
