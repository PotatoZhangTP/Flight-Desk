import { getScheduledFlightTime, getScheduledDuration, type ClockChoice, type PlannedTime } from "@/lib/flight-time";

/** Shared by manual entry, server mutations and future import normalization. */
export function normalizeFlightInput(input: Record<string, unknown>): { data: Record<string, unknown>; error: null } | { data: null; error: string } {
  try {
    const text = (key: string, max = 200, required = false) => {
      const raw = input[key];
      if (raw != null && typeof raw !== "string") throw new Error(`Invalid ${key}.`);
      const value = (raw as string | null | undefined)?.trim() || null;
      if ((required && !value) || (value && value.length > max)) throw new Error(`Check ${key}.`);
      return value;
    };
    const data: Record<string, unknown> = {};
    const times: PlannedTime[] = [];
    for (const side of ["departure", "arrival"] as const) {
      const name = text(`${side}AirportName`, 500, true)!;
      const code = (suffix: string, pattern: RegExp) => {
        const value = text(`${side}${suffix}`, 80)?.toUpperCase() || null;
        if (value && !pattern.test(value)) throw new Error(`Check ${side} ${suffix}.`);
        return value;
      };
      const iata = code("AirportIata", /^[A-Z]{3}$/);
      const icao = code("AirportIcao", /^[A-Z]{4}$/);
      const ident = text(`${side}AirportIdent`, 80);
      const country = code("CountryCode", /^[A-Z]{2}$/);
      const choice = input[`${side}Disambiguation`];
      if (choice != null && choice !== "" && choice !== "earlier" && choice !== "later") throw new Error("Invalid clock-change choice.");
      const planned = {
        date: text(`${side}Date`, 10, true)!, time: text(`${side}Time`, 5, true)!,
        timezone: text(`${side}Timezone`, 100, true)!,
        disambiguation: (choice || undefined) as ClockChoice | undefined,
      };
      const utc = getScheduledFlightTime(planned.date, planned.time, planned.timezone, planned.disambiguation);
      if (utc.error || !utc.iso) throw new Error(`${side}: ${utc.error}`);
      times.push(planned);
      Object.assign(data, {
        [`${side}_airport`]: iata || icao || ident || name,
        [`${side}_airport_iata`]: iata, [`${side}_airport_icao`]: icao,
        [`${side}_airport_name`]: name, [`${side}_country_code`]: country,
        [`${side}_timezone`]: planned.timezone, [`${side}_local_date`]: planned.date,
        [`${side}_local_time`]: planned.time, [`${side}_scheduled_at_utc`]: utc.iso,
        [`${side}_terminal`]: text(`${side}Terminal`, 80), [`${side}_gate`]: text(`${side}Gate`, 80),
      });
    }
    const duration = getScheduledDuration(times[0], times[1]);
    if (duration.error || duration.minutes == null) throw new Error(duration.error || "Check planned times.");
    const actual = input.actualDurationMinutes;
    if (actual != null && (typeof actual !== "number" || !Number.isSafeInteger(actual) || actual < 0 || actual > 2147483647)) throw new Error("Actual duration must be a non-negative whole number of minutes.");
    Object.assign(data, {
      flight_date: times[0].date, scheduled_duration_minutes: duration.minutes,
      actual_duration_minutes: actual ?? null,
      airline: text("airline"), flight_number: text("flightNumber", 40),
      aircraft_type: text("aircraftType"), registration: text("registration", 80), notes: text("notes", 10000),
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Check the flight details." };
  }
}
