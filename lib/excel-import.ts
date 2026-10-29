export const excelFields = [
  ["departure_airport", "Departure Airport"],
  ["arrival_airport", "Arrival Airport"],
  ["departure_date", "Departure Date"],
  ["arrival_date", "Arrival Date"],
  ["flight_number", "Flight Number"],
  ["airline", "Airline"],
  ["aircraft_type", "Aircraft Type"],
  ["departure_time", "Departure Time"],
  ["arrival_time", "Arrival Time"],
  ["flight_duration", "Flight Duration"],
  ["status", "Flight Status"],
  ["registration", "Aircraft Registration"],
  ["notes", "Notes"],
  ["row_number", "Row Number"],
] as const;
export type ExcelField = typeof excelFields[number][0];
export type Confidence = "High" | "Medium" | "Low";
export type ExcelRow = { sourceRow: number; values: string[] };
export type SheetData = { name: string; rows: ExcelRow[]; rawRows: string[][]; headerRow: number | null; hasHeader: boolean };
export type NormalizationStatus = "Resolved" | "Needs Confirmation" | "Unresolved";
export type NormalizedValue = { original: string; normalized: string; status: NormalizationStatus };
export type ReviewStatus = "Ready" | "Needs Review" | "Incomplete" | "Duplicate" | "Skipped";
export type ImportReview = { status: ReviewStatus; reasons: string[] };

export function validateImportFields(fields: Record<string, NormalizedValue & { normalized?: string }>): ImportReview {
  const reasons: string[] = [];
  const required: [string, string][] = [
    ["departure_airport", "Departure airport is missing."],
    ["arrival_airport", "Arrival airport is missing."],
  ];
  for (const [field, message] of required) {
    const value = fields[field];
    if (!value?.normalized) reasons.push(message);
  }
  const departure = fields.departure_airport?.normalized?.toUpperCase();
  const arrival = fields.arrival_airport?.normalized?.toUpperCase();
  if (departure && arrival && departure === arrival) reasons.push("Departure and arrival airports cannot be the same.");
  for (const [field, label] of [["departure_airport", "Departure airport"], ["arrival_airport", "Arrival airport"], ["departure_date", "Departure date"], ["arrival_date", "Arrival date"], ["departure_time", "Departure time"], ["arrival_time", "Arrival time"]] as const) {
    if (fields[field]?.status === "Unresolved" && fields[field]?.original) reasons.push(`${label} is invalid.`);
    if (fields[field]?.status === "Needs Confirmation") reasons.push(`${label} requires confirmation.`);
  }
  const duration = fields.flight_duration;
  if (duration?.original && (duration.status === "Unresolved" || !/^\d+$/.test(duration.normalized))) reasons.push("Flight duration must be a non-negative number of minutes.");
  const labels: Record<string, string> = {
    departure_airport: "Departure airport", arrival_airport: "Arrival airport", departure_date: "Departure date", arrival_date: "Arrival date",
    departure_time: "Departure time", arrival_time: "Arrival time", flight_number: "Flight number", airline: "Airline", aircraft_type: "Aircraft type", flight_duration: "Flight duration",
  };
  for (const [field, label] of Object.entries(labels)) {
    const value = fields[field];
    if (value?.status === "Needs Confirmation" && !reasons.some(reason => reason.startsWith(`${label} requires`))) reasons.push(`${label} requires confirmation.`);
    if (value?.status === "Unresolved" && value.original && !reasons.some(reason => reason.startsWith(`${label} is invalid`)) && field !== "flight_duration") reasons.push(`${label} could not be resolved.`);
  }
  const departureTime = fields.departure_time?.normalized?.match(/^(\d{2}):(\d{2})/);
  const arrivalTime = fields.arrival_time?.normalized?.match(/^(\d{2}):(\d{2})/);
  if (departureTime && arrivalTime && !fields.arrival_time.normalized.includes("+1")) {
    const departureMinutes = Number(departureTime[1]) * 60 + Number(departureTime[2]);
    const arrivalMinutes = Number(arrivalTime[1]) * 60 + Number(arrivalTime[2]);
    if (arrivalMinutes < departureMinutes) reasons.push("Arrival time is earlier than departure time; confirm the date or overnight marker.");
  }
  const needsReview = Object.values(fields).some(value => value?.status === "Needs Confirmation");
  if (reasons.some(reason => /invalid|cannot be the same|must be/.test(reason))) return { status: "Incomplete", reasons };
  if (needsReview || reasons.length) return { status: "Needs Review", reasons };
  return { status: "Ready", reasons: [] };
}

export type ExistingFlightForDuplicate = { id: string; flight_date?: string | null; flight_number?: string | null; airline?: string | null; departure_airport_iata?: string | null; arrival_airport_iata?: string | null; departure_airport_icao?: string | null; arrival_airport_icao?: string | null };

function sameCode(left?: string | null, right?: string) {
  if (!left || !right) return false;
  const values = left.split(/[·,\s]+/).map(value => value.trim().toUpperCase()).filter(Boolean);
  return values.includes(right.trim().toUpperCase());
}

export function detectImportDuplicate(fields: Record<string, NormalizedValue>, existing: ExistingFlightForDuplicate[]) {
  const date = fields.departure_date?.normalized;
  const flightNumber = fields.flight_number?.normalized?.replace(/\s+/g, "").toUpperCase();
  const airline = fields.airline?.normalized?.toUpperCase();
  const departure = fields.departure_airport?.normalized;
  const arrival = fields.arrival_airport?.normalized;
  if (!date || !departure || !arrival) return { kind: "none" as const, reason: "" };
  const routeMatches = (flight: ExistingFlightForDuplicate) =>
    [flight.departure_airport_iata, flight.departure_airport_icao].some(code => sameCode(code, departure)) &&
    [flight.arrival_airport_iata, flight.arrival_airport_icao].some(code => sameCode(code, arrival));
  const exact = existing.find(flight => flight.flight_date === date && routeMatches(flight) && Boolean(flightNumber) && sameCode(flight.flight_number, flightNumber));
  if (exact) return { kind: "exact" as const, reason: "Exact duplicate flight found." };
  const possible = existing.find(flight => flight.flight_date === date && routeMatches(flight) || (flight.flight_date === date && Boolean(flightNumber) && (sameCode(flight.flight_number, flightNumber) || sameCode(flight.airline, airline))));
  return possible ? { kind: "possible" as const, reason: "Possible duplicate flight." } : { kind: "none" as const, reason: "" };
}

const aliases: Record<ExcelField, string[]> = {
  departure_airport: ["departure airport", "departure airport code", "departure icao", "dep icao", "from", "origin", "origin airport", "dep airport", "dep", "departure", "出发机场", "出发机场icao", "出发icao", "起飞机场", "出发地"],
  arrival_airport: ["arrival airport", "arrival airport code", "arrival icao", "arr icao", "to", "destination", "destination airport", "arr airport", "arr", "arrival", "到达机场", "到达机场icao", "到达icao", "降落机场", "目的地"],
  departure_date: ["departure date", "flight date", "date", "dep date", "outbound date", "出发日期", "飞行日期"],
  arrival_date: ["arrival date", "arr date", "inbound date", "到达日期", "降落日期"],
  flight_number: ["flight number", "flight no", "flight #", "flight", "flt no", "航班号", "航班编号"],
  airline: ["airline", "carrier", "airline code", "airline iata", "航司", "航空公司"],
  aircraft_type: ["aircraft type", "aircraft", "aircraft model", "equipment", "plane", "机型", "飞机型号"],
  departure_time: ["departure time", "dep time", "out time", "local departure", "出发时间", "起飞时间"],
  arrival_time: ["arrival time", "arr time", "in time", "local arrival", "到达时间", "降落时间"],
  flight_duration: ["flight duration", "duration", "actual duration", "flight time", "elapsed", "飞行时长", "飞行时间"],
  status: ["flight status", "status", "state", "状态", "航班状态"],
  registration: ["registration", "aircraft registration", "tail number", "tail", "机号", "注册号"],
  notes: ["notes", "note", "remarks", "comments", "备注", "说明"],
  row_number: ["row number", "source row", "row", "序号", "编号"],
};

export function normalizeHeader(value: string) { return value.trim().toLowerCase().replace(/[\u3000\s_./#-]+/g, " ").replace(/[^a-z0-9\u4e00-\u9fff ]/g, "").trim(); }

/**
 * Finds the airport code that belongs to one side of a row. Some exports use
 * `Departure ICAO` / `Arrival ICAO`, while others contain two identically
 * named `ICAO` columns next to the two airport columns. In the latter case the
 * spreadsheet order is the only reliable relationship: first ICAO column is
 * departure, second is arrival. Never guess when only one unlabeled column is
 * present.
 */
export function airportCodeFromColumns(field: "departure_airport" | "arrival_airport", headers: string[], values: string[]) {
  const columns = headers.map((header, index) => ({ header: normalizeHeader(header), index }))
    .filter(item => item.header.includes("icao"));
  const codeAt = (index: number) => (values[index] || "").toUpperCase().match(/[A-Z]{4}/g) || [];
  const explicit = columns.find(item => {
    const departure = item.header.includes("departure") || item.header.includes("dep") || item.header.includes("出发") || item.header.includes("起飞");
    const arrival = item.header.includes("arrival") || item.header.includes("arr") || item.header.includes("到达") || item.header.includes("降落");
    return field === "departure_airport" ? departure : arrival;
  });
  if (explicit) {
    const codes = codeAt(explicit.index);
    return codes.length === 1 ? codes[0] : field === "departure_airport" ? codes[0] || "" : codes[codes.length - 1] || "";
  }
  const unlabeled = columns.filter(item => !/(?:departure|dep|arrival|arr|出发|起飞|到达|降落)/.test(item.header));
  if (unlabeled.length >= 2) {
    const codes = codeAt(unlabeled[field === "departure_airport" ? 0 : unlabeled.length - 1].index);
    return codes.length === 1 ? codes[0] : field === "departure_airport" ? codes[0] || "" : codes[codes.length - 1] || "";
  }
  return "";
}
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
  if (header.trim() === "#") return { field: "row_number", confidence: "High", score: 1 };
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
  // Flight numbers are kept as editable source data, but a syntactically
  // usable value should not block an import with a second confirmation step.
  return { airline: airlineValue, flightNumber: flightValue.status === "Needs Confirmation" ? { ...flightValue, status: "Resolved" as NormalizationStatus } : flightValue };
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
  // A row number such as "1" or "2" must never be interpreted by the
  // JavaScript Date parser as a real date. Keep plausible Excel serial dates
  // supported, but reject small bare numbers that are almost always row IDs.
  if (/^\d+(?:\.\d+)?$/.test(original)) {
    const serial = Number(original);
    if (!Number.isFinite(serial) || serial < 10000 || serial > 100000) return { original, normalized: original, status: "Unresolved" };
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
    const year = date.getUTCFullYear(); const month = date.getUTCMonth() + 1; const day = date.getUTCDate();
    return { original, normalized: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, status: "Resolved" };
  }
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
  const hm = original.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hours?|小时)\s*(?:(\d+)\s*(?:m|min|minutes?|分钟))?$/i);
  const clock = original.match(/^(\d{1,3}):(\d{2})$/);
  const minutes = hm ? Math.round(Number(hm[1]) * 60 + Number(hm[2] || 0)) : clock ? Number(clock[1]) * 60 + Number(clock[2]) : /^\d+(?:\.\d+)?\s*(?:m|min|minutes?|分钟)$/i.test(original) ? Math.round(Number.parseFloat(original)) : NaN;
  return Number.isFinite(minutes) && minutes >= 0 ? { original, normalized: String(minutes), status: "Resolved" } : { original, normalized: original, status: "Unresolved" };
}
