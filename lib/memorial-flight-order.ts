type MemorialFlightOrderFields = {
  id: string;
  event_key?: string | null;
  event_date?: string | null;
  event_year?: number | null;
  event_month?: number | null;
  event_day?: number | null;
};

/** Returns the stored historical event date without applying a local timezone. */
export function memorialEventDateKey(event: MemorialFlightOrderFields) {
  if (event.event_date) return event.event_date;
  if (event.event_year && event.event_month && event.event_day) {
    return `${String(event.event_year).padStart(4, "0")}-${String(event.event_month).padStart(2, "0")}-${String(event.event_day).padStart(2, "0")}`;
  }
  return "";
}

/** Newest historical event first; event key/id makes equal dates deterministic. */
export function sortMemorialFlights<T extends MemorialFlightOrderFields>(events: T[]) {
  return [...events].sort((left, right) => {
    const dateOrder = memorialEventDateKey(right).localeCompare(memorialEventDateKey(left));
    if (dateOrder !== 0) return dateOrder;
    return String(left.event_key || left.id).localeCompare(String(right.event_key || right.id));
  });
}

/** Admin order: calendar month/day ascending, then newer historical year first. */
export function sortMemorialFlightsForAdmin<T extends MemorialFlightOrderFields>(events: T[]) {
  return [...events].sort((left, right) => {
    const leftDate = memorialEventDateKey(left);
    const rightDate = memorialEventDateKey(right);
    const monthDayOrder = (leftDate.slice(5) || "99-99").localeCompare(rightDate.slice(5) || "99-99");
    if (monthDayOrder !== 0) return monthDayOrder;
    const yearOrder = rightDate.localeCompare(leftDate);
    if (yearOrder !== 0) return yearOrder;
    return String(left.event_key || left.id).localeCompare(String(right.event_key || right.id));
  });
}
