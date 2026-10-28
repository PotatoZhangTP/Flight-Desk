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
