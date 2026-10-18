/** Comparison-only normalization; stored flight numbers retain their original formatting. */
export function normalizeFlightNumber(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, "").toUpperCase();
}
