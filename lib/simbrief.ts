import { DateTime } from "luxon";

export type SimBriefRawPreview = {
  requestId: string | null;
  flightNumber: string;
  airline: string;
  departureIcao: string;
  arrivalIcao: string;
  aircraftCode: string;
  registration: string;
  departureTimestamp: string | null;
  arrivalTimestamp: string | null;
};

function objectAt(value: unknown, path: string[]) {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function textAt(value: unknown, paths: string[][]) {
  for (const path of paths) {
    const item = objectAt(value, path);
    if (typeof item === "string" || typeof item === "number") {
      const text = String(item).trim();
      if (text) return text;
    }
  }
  return "";
}

// Only explicit, well-known ICAO/IATA pairs are converted. Unknown three-letter
// codes stay unresolved instead of being guessed from a prefix.
const airlineIataByIcao: Record<string, string> = {
  AAL: "AA", ACA: "AC", AFR: "AF", ASA: "AS", BAW: "BA", CAL: "CI",
  CCA: "CA", CES: "MU", CPA: "CX", CSN: "CZ", DAL: "DL", EIN: "EI",
  EVA: "BR", FIN: "AY", GIA: "GA", JAL: "JL", KAL: "KE", KLM: "KL",
  LAN: "LA", MAS: "MH", QFA: "QF", QTR: "QR", RYR: "FR", SIA: "SQ",
  SKW: "OO", SWA: "WN", TAP: "TP", THY: "TK", UAE: "EK", UAL: "UA",
  VIR: "VS", WJA: "WS",
};

function cleanCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function splitCombinedFlight(value: string) {
  const clean = value.trim().toUpperCase().replace(/[\s-]+/g, "");
  const match = /^([A-Z0-9]{2,3})(\d{1,5}[A-Z]?)$/.exec(clean);
  return match ? { prefix: match[1], number: match[2] } : { prefix: "", number: clean.match(/\d{1,5}[A-Z]?$/)?.[0] || "" };
}

function airlineCodeFrom(value: string) {
  const clean = cleanCode(value);
  if (/^[A-Z0-9]{2}$/.test(clean)) return clean;
  return airlineIataByIcao[clean] || "";
}

function parseAirlineAndNumber(payload: unknown) {
  const rawNumber = textAt(payload, [["general", "flight_number"], ["atc", "flight_number"]]);
  const rawAirlineIata = textAt(payload, [["general", "airline_iata"], ["airline", "iata"], ["airline", "iata_code"], ["atc", "airline_iata"]]);
  const rawAirlineIcao = textAt(payload, [["general", "airline_icao"], ["airline", "icao"], ["airline", "icao_code"], ["atc", "airline_icao"]]);
  const rawAirlineCode = textAt(payload, [["general", "airline_code"]]);
  const combined = [rawNumber, textAt(payload, [["general", "airline"], ["atc", "callsign"]])].find(value => /\d/.test(value)) || "";
  const split = splitCombinedFlight(combined);
  const number = split.number || rawNumber.replace(/^[A-Za-z0-9]{2,3}(?=\d)/, "");
  const airline = airlineCodeFrom(rawAirlineIata) || airlineCodeFrom(rawAirlineIcao) || airlineCodeFrom(rawAirlineCode) || airlineCodeFrom(split.prefix);
  return { airline, number };
}

function timestampAt(value: unknown, paths: string[]) {
  for (const path of paths) {
    const item = objectAt(value, path.split("."));
    if (typeof item === "number" || (typeof item === "string" && item.trim())) {
      const raw = String(item).trim();
      if (/^\d+(?:\.\d+)?$/.test(raw)) {
        const seconds = Number(raw);
        const date = DateTime.fromMillis(seconds > 100_000_000_000 ? seconds : seconds * 1000, { zone: "utc" });
        if (date.isValid) return date.toUTC().toISO();
      }
      const date = DateTime.fromISO(raw, { zone: "utc" });
      if (date.isValid) return date.toUTC().toISO();
    }
  }
  return null;
}

export function parseSimBriefPayload(payload: unknown): SimBriefRawPreview {
  const requestId = textAt(payload, [["params", "request_id"], ["params", "ofp_id"], ["general", "request_id"], ["general", "ofp_id"], ["ofp_id"]]) || null;
  const flight = parseAirlineAndNumber(payload);
  const departureIcao = textAt(payload, [["origin", "icao_code"], ["origin", "icao"], ["general", "icao_airport_origin"]]).toUpperCase();
  const arrivalIcao = textAt(payload, [["destination", "icao_code"], ["destination", "icao"], ["general", "icao_airport_destination"]]).toUpperCase();
  const aircraftCode = textAt(payload, [["aircraft", "icaocode"], ["aircraft", "icao_code"], ["general", "aircraft"], ["general", "aircraft_type"]]).toUpperCase();
  const registration = textAt(payload, [["aircraft", "reg"], ["aircraft", "registration"], ["general", "registration"]]);
  return {
    requestId,
    flightNumber: flight.number,
    airline: flight.airline,
    departureIcao,
    arrivalIcao,
    aircraftCode,
    registration,
    departureTimestamp: timestampAt(payload, ["times.sched_off", "times.est_off", "times.sched_out", "times.est_out"]),
    arrivalTimestamp: timestampAt(payload, ["times.sched_on", "times.est_on", "times.sched_in", "times.est_in"]),
  };
}

export function localFieldsFromTimestamp(iso: string | null, timezone: string | null) {
  if (!iso) return { date: "", time: "" };
  const value = DateTime.fromISO(iso, { zone: timezone || "UTC" });
  return value.isValid ? { date: value.toFormat("yyyy-MM-dd"), time: value.toFormat("HH:mm") } : { date: "", time: "" };
}

export function simbriefIdentifier(kind: "alias" | "pilot", value: string) {
  const clean = value.trim();
  if (kind === "alias") return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(clean) ? clean : null;
  return /^\d{1,20}$/.test(clean) ? clean : null;
}
