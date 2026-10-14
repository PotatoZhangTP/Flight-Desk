import { DateTime } from "luxon";

export function getScheduledFlightTime(date: string, time: string, timezone: string) {
  if (!date || !time || !timezone) return { iso: null, error: "Enter a date, time, and timezone." };
  const value = DateTime.fromISO(`${date}T${time}`, { zone: timezone });
  if (!value.isValid) return { iso: null, error: "This local date/time is invalid for the selected timezone." };
  return { iso: value.toUTC().toISO(), error: null };
}

export function getScheduledDuration(departure: { date: string; time: string; timezone: string }, arrival: { date: string; time: string; timezone: string }) {
  const start = getScheduledFlightTime(departure.date, departure.time, departure.timezone);
  const end = getScheduledFlightTime(arrival.date, arrival.time, arrival.timezone);
  if (start.error || end.error || !start.iso || !end.iso) return { minutes: null, error: start.error || end.error || "Enter both planned local date/times." };
  const minutes = Math.round((DateTime.fromISO(end.iso).toMillis() - DateTime.fromISO(start.iso).toMillis()) / 60000);
  if (minutes < 0) return { minutes: null, error: "Arrival must be after departure." };
  return { minutes, error: null };
}
