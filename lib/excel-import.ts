export const excelFields = [
  ["departure_airport", "Departure Airport"],
  ["arrival_airport", "Arrival Airport"],
  ["departure_date", "Departure Date"],
  ["flight_number", "Flight Number"],
  ["airline", "Airline"],
  ["aircraft_type", "Aircraft Type"],
  ["departure_time", "Departure Time"],
  ["arrival_time", "Arrival Time"],
  ["flight_duration", "Flight Duration"],
  ["status", "Flight Status"],
  ["registration", "Aircraft Registration"],
  ["notes", "Notes"],
] as const;
export type ExcelField = typeof excelFields[number][0];
export type Confidence = "High" | "Medium" | "Low";
export type ExcelRow = { sourceRow: number; values: string[] };
export type SheetData = { name: string; rows: ExcelRow[]; rawRows: string[][]; headerRow: number | null; hasHeader: boolean };
export type NormalizationStatus = "Resolved" | "Needs Confirmation" | "Unresolved";
export type NormalizedValue = { original: string; normalized: string; status: NormalizationStatus };

const aliases: Record<ExcelField, string[]> = {
  departure_airport: ["departure airport", "departure airport code", "from", "origin", "origin airport", "dep airport", "dep", "departure", "出发机场", "出发地", "起飞机场"],
  arrival_airport: ["arrival airport", "arrival airport code", "to", "destination", "destination airport", "arr airport", "arr", "arrival", "到达机场", "目的地", "降落机场"],
  departure_date: ["departure date", "flight date", "date", "dep date", "outbound date", "出发日期", "飞行日期"],
  flight_number: ["flight number", "flight no", "flight #", "flight", "flt no", "航班号", "航班编号"],
  airline: ["airline", "carrier", "airline code", "airline iata", "航司", "航空公司"],
  aircraft_type: ["aircraft type", "aircraft", "aircraft model", "equipment", "plane", "机型", "飞机型号"],
  departure_time: ["departure time", "dep time", "out time", "local departure", "出发时间", "起飞时间"],
  arrival_time: ["arrival time", "arr time", "in time", "local arrival", "到达时间", "降落时间"],
  flight_duration: ["flight duration", "duration", "actual duration", "flight time", "elapsed", "飞行时长", "飞行时间"],
  status: ["flight status", "status", "state", "状态", "航班状态"],
  registration: ["registration", "aircraft registration", "tail number", "tail", "机号", "注册号"],
  notes: ["notes", "note", "remarks", "comments", "备注", "说明"],
};

export function normalizeHeader(value: string) { return value.trim().toLowerCase().replace(/[\u3000\s_./#-]+/g, " ").replace(/[^a-z0-9\u4e00-\u9fff ]/g, "").trim(); }
function samples(values: string[]) { return values.map(value => value.trim()).filter(Boolean).slice(0, 12); }
function contentScore(field: ExcelField, values: string[]) {
  const sample = samples(values);
  if (!sample.length) return 0;
  const matches = sample.filter(value => {
    const upper = value.toUpperCase();
    if (field === "departure_airport" || field === "arrival_airport") return /^[A-Z]{3,4}$/.test(upper);
    if (field === "flight_number") return /^[A-Z0-9]{2,4}\s?\d{1,5}$/.test(upper);
    if (field === "aircraft_type") return /^(A|B|E|CRJ|ERJ|AT|DH|MD|F)[A-Z0-9-]{2,8}$/i.test(value);
    if (field === "departure_date") return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(value) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(value) || !Number.isNaN(Date.parse(value));
    if (field === "departure_time" || field === "arrival_time") return /^\d{1,2}:\d{2}(?::\d{2})?\s*(AM|PM)?$/i.test(value);
    if (field === "flight_duration") return /^\d{1,3}\s*(h|hr|hours?)?(\s*\d{1,2}\s*(m|min|minutes?))?$/i.test(value) || /^\d{1,3}:\d{2}$/.test(value);
    if (field === "status") return /^(planned|completed|complete|scheduled|done|flown|已完成|计划中)$/i.test(value);
    return false;
  }).length;
  return matches / sample.length;
}

export function matchColumn(header: string, values: string[]): { field: ExcelField | null; confidence: Confidence; score: number } {
  const normalized = normalizeHeader(header);
  if (normalized) {
    for (const [field, names] of Object.entries(aliases) as [ExcelField, string[]][]) {
      const normalizedNames = names.map(normalizeHeader);
      if (normalizedNames.includes(normalized)) return { field, confidence: "High", score: 1 };
    }
    for (const [field, names] of Object.entries(aliases) as [ExcelField, string[]][]) {
      if (names.map(normalizeHeader).some(name => normalized.includes(name) || name.includes(normalized))) return { field, confidence: "Medium", score: .8 };
    }
  }
  const ranked = (Object.keys(aliases) as ExcelField[]).map(field => ({ field, score: contentScore(field, values) })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < .6 || (best.score === ranked[1]?.score && best.score < 1)) return { field: null, confidence: "Low", score: best?.score || 0 };
  return { field: best.field, confidence: best.score >= .8 ? "Medium" : "Low", score: best.score };
}

export function autoMatch(headers: string[], rows: string[][], locked: Set<number> = new Set()) {
  const result: Record<number, ExcelField | "ignore"> = {};
  const confidence: Record<number, Confidence> = {};
  const used = new Set<ExcelField>();
  headers.forEach((header, index) => { if (locked.has(index)) return; const match = matchColumn(header, rows.map(row => row[index] || "")); if (match.field && !used.has(match.field)) { result[index] = match.field; used.add(match.field); } else result[index] = "ignore"; confidence[index] = match.confidence; });
  return { result, confidence };
}

export function detectHeaderRow(rows: string[][]) {
  let best = { index: -1, score: 0 };
  rows.slice(0, 30).forEach((row, index) => { const score = row.reduce((total, cell) => total + (matchColumn(String(cell || ""), []).score >= .8 ? 1 : 0), 0); if (score > best.score) best = { index, score }; });
  return best.score ? best.index : -1;
}

export function normalizeFlightNumber(value: string, airline = ""): NormalizedValue {
  const original = value.trim();
  const compact = original.toUpperCase().replace(/[\s-]+/g, "");
  const match = compact.match(/^([A-Z0-9]{2,4})(\d{1,5})$/);
  if (!match) return { original, normalized: original, status: original ? "Needs Confirmation" : "Unresolved" };
  const airlineCode = airline.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (airlineCode && /^[A-Z0-9]{2,4}$/.test(airlineCode) && match[1] !== airlineCode) return { original, normalized: compact, status: "Needs Confirmation" };
  return { original, normalized: compact, status: "Resolved" };
}

export function normalizeAirlineValue(value: string): NormalizedValue {
  const original = value.trim();
  const key = original.toUpperCase().replace(/[\s._-]+/g, "");
  const known: Record<string, string> = { AIRCHINA: "CA", GUOHANG: "CA", 国航: "CA", CHINAEASTERN: "MU", CHINASOUTHERN: "CZ", DELTA: "DL", UNITED: "UA", AMERICAN: "AA", BRITISHAIRWAYS: "BA", LUFTHANSA: "LH", AIRFRANCE: "AF", QANTAS: "QF", CATHAYPACIFIC: "CX", SINGAPOREAIRLINES: "SQ" };
  if (/^[A-Z0-9]{2,3}$/.test(key)) return { original, normalized: key, status: "Resolved" };
  if (known[key]) return { original, normalized: known[key], status: "Resolved" };
  return { original, normalized: original, status: original ? "Needs Confirmation" : "Unresolved" };
}

export function normalizeFlightPair(airline: string, flightNumber: string) {
  if (!flightNumber.trim()) {
    const combined = airline.trim().match(/^(.+?)\s*(\d{1,5})$/);
    if (combined) {
      const combinedAirline = normalizeAirlineValue(combined[1]);
      if (combinedAirline.status === "Resolved") return { airline: combinedAirline, flightNumber: { original: combined[2], normalized: `${combinedAirline.normalized}${combined[2].padStart(3, "0")}`, status: "Resolved" as NormalizationStatus } };
    }
  }
  const airlineValue = normalizeAirlineValue(airline);
  const rawNumber = flightNumber.trim();
  const numeric = rawNumber.match(/^\d{1,5}$/);
  const flightValue = numeric && airlineValue.normalized && airlineValue.status === "Resolved"
    ? { original: rawNumber, normalized: `${airlineValue.normalized}${rawNumber.padStart(3, "0")}`, status: "Resolved" as NormalizationStatus }
    : normalizeFlightNumber(rawNumber, airlineValue.normalized);
  return { airline: airlineValue, flightNumber: flightValue };
}

export function normalizeAircraftValue(value: string): NormalizedValue {
  const original = value.trim();
  if (!original) return { original, normalized: "", status: "Unresolved" };
  const compact = original.toUpperCase().replace(/\s+/g, "").replace(/BOEINGB/, "B").replace(/AIRBUSA/, "A").replace(/[^A-Z0-9-]/g, "");
  if (/^[AB][0-9]{3}$/.test(compact)) return { original, normalized: compact, status: "Resolved" };
  if (/BOEING\s*737[- ]?800|波音\s*737[- ]?800/i.test(original)) return { original, normalized: "B738", status: "Resolved" };
  if (/AIRBUS\s*A350[- ]?900|空客\s*A?350[- ]?900/i.test(original)) return { original, normalized: "A359", status: "Resolved" };
  if (/AIRBUS\s*A320|空客\s*A320/i.test(original)) return { original, normalized: "A320", status: "Resolved" };
  if (/^(737|738|739)$/.test(compact)) return { original, normalized: `B${compact}`, status: "Needs Confirmation" };
  if (/^359$/.test(compact)) return { original, normalized: "A359", status: "Needs Confirmation" };
  return { original, normalized: original, status: "Needs Confirmation" };
}

export function normalizeDateValue(value: string, format: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" = "MM/DD/YYYY"): NormalizedValue {
  const original = value.trim();
  if (!original) return { original, normalized: "", status: "Unresolved" };
  const iso = original.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  const slash = original.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  let year = "", month = "", day = "", status: NormalizationStatus = "Resolved";
  if (iso) [, year, month, day] = iso;
  else if (slash) { const a = Number(slash[1]), b = Number(slash[2]); year = slash[3].length === 2 ? `20${slash[3]}` : slash[3]; if (format === "DD/MM/YYYY") [day, month] = [slash[1], slash[2]]; else [month, day] = [slash[1], slash[2]]; if (a <= 12 && b <= 12) status = "Needs Confirmation"; }
  else { const parsed = new Date(original); if (Number.isNaN(parsed.getTime())) return { original, normalized: original, status: "Unresolved" }; year = String(parsed.getFullYear()); month = String(parsed.getMonth() + 1); day = String(parsed.getDate()); }
  const valid = Number(year) >= 1900 && Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31;
  return { original, normalized: valid ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : original, status: valid ? status : "Unresolved" };
}

export function normalizeTimeValue(value: string): NormalizedValue {
  const original = value.trim();
  if (!original) return { original, normalized: "", status: "Unresolved" };
  const match = original.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?(?:\s*\+1)?$/i);
  if (!match) return { original, normalized: original, status: "Unresolved" };
  let hour = Number(match[1]); const minute = Number(match[2]);
  if (match[3]) { if (hour < 1 || hour > 12 || minute > 59) return { original, normalized: original, status: "Unresolved" }; if (match[3].toUpperCase() === "PM" && hour < 12) hour += 12; if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0; }
  if (hour > 23 || minute > 59) return { original, normalized: original, status: "Unresolved" };
  return { original, normalized: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}${original.includes("+1") ? " +1" : ""}`, status: "Resolved" };
}

export function normalizeDurationValue(value: string): NormalizedValue {
  const original = value.trim();
  if (!original) return { original, normalized: "", status: "Unresolved" };
  const hm = original.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hours?)\s*(?:(\d+)\s*(?:m|min|minutes?))?$/i);
  const clock = original.match(/^(\d{1,3}):(\d{2})$/);
  const minutes = hm ? Math.round(Number(hm[1]) * 60 + Number(hm[2] || 0)) : clock ? Number(clock[1]) * 60 + Number(clock[2]) : /^\d+(?:\.\d+)?\s*(?:m|min|minutes?)$/i.test(original) ? Math.round(Number.parseFloat(original)) : NaN;
  return Number.isFinite(minutes) && minutes >= 0 ? { original, normalized: String(minutes), status: "Resolved" } : { original, normalized: original, status: "Unresolved" };
}
