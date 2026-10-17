const aliases: Record<string, string> = {
  USA: "US", GBR: "GB", CHN: "CN", TUR: "TR", MEX: "MX", CHL: "CL",
  MYS: "MY", VNM: "VN", ZAF: "ZA", THA: "TH", KOR: "KR", JPN: "JP",
};

export function normalizeCountryCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase() || "";
  return aliases[normalized] ?? normalized;
}

export function isIsoAlpha2(value: string) {
  return /^[A-Z]{2}$/.test(value);
}
