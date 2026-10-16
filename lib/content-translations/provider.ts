import { validContentText } from "./model";

export class TranslationFailure extends Error {
  constructor(public code: string, public retryable: boolean) { super(code); }
}
export interface TranslationProvider {
  translate(text: string, targetCode: string): Promise<string>;
}

/** Markers fail closed if a provider drops, duplicates or changes a protected token. */
export function protectTerms(text: string) {
  if (text.includes("__FDKEEP_")) throw new TranslationFailure("reserved_marker", false);
  const tokens: string[] = [];
  const keep = (token: string) => { const marker = `__FDKEEP_${tokens.length}__`; tokens.push(token); return marker; };
  let balanced = "", start = 0;
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== "{") continue;
    let depth = 1, end = index + 1;
    while (end < text.length && depth) { if (text[end] === "{") depth++; if (text[end] === "}") depth--; end++; }
    if (!depth) { balanced += text.slice(start, index) + keep(text.slice(index, end)); start = end; index = end - 1; }
  }
  balanced += text.slice(start);
  const pattern = /https?:\/\/[^\s<>]+|Flight Desk|\b(?:Boeing|Airbus|Cessna|Embraer|Bombardier|ATR)\s+(?:[A-Z]{0,3}-?)?\d{2,4}(?:-\d{1,4})?(?:neo|ceo|MAX|XLR|ER|LR)?\b|\b(?:[ABCE]\d{3}(?:-\d{2,4})?(?:neo|ceo|MAX|XLR|ER|LR)?|[A-Z]{2,3}\d{1,4}|\d{3}-\d{2,4})\b|\b(?:Africa|America|Asia|Europe|Australia|Pacific|Atlantic|Indian|Etc)\/[A-Za-z_+\/-]+|\b[A-Z]{2,4}\b|%\d*\$?[sdif]|[\r\n\t]+/g;
  const protectedText = balanced.replace(pattern, keep);
  return {
    text: protectedText,
    restore(output: string) {
      for (let index = 0; index < tokens.length; index++) {
        const marker = `__FDKEEP_${index}__`;
        if (output.split(marker).length !== protectedText.split(marker).length) throw new TranslationFailure("protected_token_changed", false);
      }
      // A URL can contain an already-protected placeholder. Tokens form a DAG:
      // later tokens may include earlier ones, so expand in reverse order.
      let restored = output;
      for (let index = tokens.length - 1; index >= 0; index--) restored = restored.split(`__FDKEEP_${index}__`).join(tokens[index]);
      if (restored.includes("__FDKEEP_") || !restored.trim() || !validContentText(restored)) throw new TranslationFailure("invalid_response", false);
      return restored;
    },
  };
}

export function createDeepLProvider(options: { key: string; plan: "free" | "pro"; glossaryId?: string; fetcher?: typeof fetch }): TranslationProvider {
  const fetcher = options.fetcher ?? fetch;
  const endpoint = options.plan === "pro" ? "https://api.deepl.com/v2/translate" : "https://api-free.deepl.com/v2/translate";
  return { async translate(text, targetCode) {
    if (!text.trim() || text.length > 5000 || !validContentText(text, 5000) || !/^[A-Z]{2,3}(?:-[A-Z]{2,4})?$/.test(targetCode)) throw new TranslationFailure("invalid_source", false);
    const protectedTerms = protectTerms(text);
    let response: Response;
    try {
      response = await fetcher(endpoint, {
        method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000),
        headers: { Authorization: `DeepL-Auth-Key ${options.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: [protectedTerms.text], source_lang: "EN", target_lang: targetCode, preserve_formatting: true, ...(options.glossaryId ? { glossary_id: options.glossaryId } : {}) }),
      });
    } catch { throw new TranslationFailure("network_or_timeout", true); }
    if (!response.ok) throw new TranslationFailure(response.status === 429 ? "provider_rate_limit" : `provider_${response.status}`, response.status === 429 || response.status === 408 || response.status >= 500);
    // Bound response consumption, including a malicious/unexpected upstream body.
    const reader = response.body?.getReader();
    if (!reader) throw new TranslationFailure("invalid_response", false);
    let bytes = 0; const chunks: Uint8Array[] = [];
    try {
      while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 100000) { await reader.cancel().catch(() => {}); throw new TranslationFailure("response_too_large", false); } chunks.push(chunk.value); }
      const raw = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.length; }
      const body = JSON.parse(new TextDecoder().decode(raw));
      if (!Array.isArray(body.translations) || body.translations.length !== 1 || typeof body.translations[0]?.text !== "string") throw new TranslationFailure("invalid_response", false);
      return protectedTerms.restore(body.translations[0].text);
    } catch (error) { if (error instanceof TranslationFailure) throw error; throw new TranslationFailure(error instanceof SyntaxError ? "invalid_response" : "network_or_timeout", !(error instanceof SyntaxError)); }
  } };
}
