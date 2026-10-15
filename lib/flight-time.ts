import { DateTime, IANAZone } from "luxon";

export type ClockChoice = "earlier" | "later";
export type PlannedTime = { date: string; time: string; timezone: string; disambiguation?: ClockChoice };

export function getScheduledFlightTime(date: string, time: string, timezone: string, choice?: ClockChoice) {
  const fail = (error: string) => ({ iso: null, error, ambiguous: false, choices: [] as { value: ClockChoice; label: string }[] });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) ||
      !(timezone === "UTC" || (timezone.includes("/") && !/^(posix|right)\//.test(timezone))) || !IANAZone.isValidZone(timezone)) {
    return fail("Enter a valid date, local time, and IANA timezone.");
  }
  const wallTime = date + "T" + time;
  const value = DateTime.fromISO(wallTime, { zone: timezone });
  if (!value.isValid || value.toFormat("yyyy-MM-dd'T'HH:mm") !== wallTime) {
    return fail("This local time does not exist in the selected timezone. Check the clock change.");
  }
  const possibilities = value.getPossibleOffsets().sort((a, b) => a.toMillis() - b.toMillis());
  const ambiguous = possibilities.length > 1;
  const choices: { value: ClockChoice; label: string }[] = ambiguous ? [
    { value: "earlier", label: "Earlier occurrence (UTC" + possibilities[0].toFormat("ZZ") + ")" },
    { value: "later", label: "Later occurrence (UTC" + possibilities.at(-1)!.toFormat("ZZ") + ")" },
  ] : [];
  if (ambiguous && choice !== "earlier" && choice !== "later") {
    return { iso: null, error: "This local time occurs twice. Choose the earlier or later occurrence.", ambiguous, choices };
  }
  const selected = ambiguous && choice === "later" ? possibilities.at(-1)! : possibilities[0];
  return { iso: selected.toUTC().toISO(), error: null, ambiguous, choices };
}

export function snapshotClockChoice(date: string, time: string, timezone: string, utc: string | null): ClockChoice | undefined {
  if (!utc || !getScheduledFlightTime(date, time, timezone).ambiguous) return undefined;
  const saved = DateTime.fromISO(utc).toMillis();
  for (const choice of ["earlier", "later"] as const) {
    const result = getScheduledFlightTime(date, time, timezone, choice);
    if (result.iso && DateTime.fromISO(result.iso).toMillis() === saved) return choice;
  }
  return undefined;
}

export function getScheduledDuration(departure: PlannedTime, arrival: PlannedTime) {
  const start = getScheduledFlightTime(departure.date, departure.time, departure.timezone, departure.disambiguation);
  const end = getScheduledFlightTime(arrival.date, arrival.time, arrival.timezone, arrival.disambiguation);
  if (start.error || end.error || !start.iso || !end.iso) return { minutes: null, error: start.error || end.error || "Enter both planned local date/times." };
  const minutes = Math.round((DateTime.fromISO(end.iso).toMillis() - DateTime.fromISO(start.iso).toMillis()) / 60000);
  if (!Number.isSafeInteger(minutes) || minutes < 0 || minutes > 2147483647) return { minutes: null, error: "Arrival must not precede departure; check the dates and timezones." };
  return { minutes, error: null };
}
