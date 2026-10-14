export type Flight = { id: string; date: string; route: string; from: string; to: string; aircraft: string; registration: string; duration: string; status: "Completed" | "Planned" };
export type FlightStats = { totalFlights: number; totalHours: number; airports: number; countries: number };
