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
  const flightNumber = textAt(payload, [["general", "flight_number"], ["atc", "flight_number"], ["general", "callsign"], ["atc", "callsign"]]);
  const airline = textAt(payload, [["general", "airline"], ["general", "airline_name"], ["general", "airline_code"], ["atc", "callsign"]]);
  const departureIcao = textAt(payload, [["origin", "icao_code"], ["origin", "icao"], ["general", "icao_airport_origin"]]).toUpperCase();
  const arrivalIcao = textAt(payload, [["destination", "icao_code"], ["destination", "icao"], ["general", "icao_airport_destination"]]).toUpperCase();
  const aircraftCode = textAt(payload, [["aircraft", "icaocode"], ["aircraft", "icao_code"], ["general", "aircraft"], ["general", "aircraft_type"]]).toUpperCase();
  const registration = textAt(payload, [["aircraft", "reg"], ["aircraft", "registration"], ["general", "registration"]]);
  return {
    requestId,
    flightNumber,
    airline: airline === flightNumber ? "" : airline,
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
