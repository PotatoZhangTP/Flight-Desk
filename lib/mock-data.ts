import type { Flight, FlightStats } from "./types";
export const mockStats: FlightStats = { totalFlights: 48, totalHours: 126, airports: 32, countries: 14 };
export const mockFlights: Flight[] = [
  { id: "FL-048", date: "18 Sep 2025", route: "LHR → HND", from: "London Heathrow", to: "Tokyo Haneda", aircraft: "Boeing 787-9", registration: "G-ABCD", duration: "11h 40m", status: "Completed" },
  { id: "FL-047", date: "02 Sep 2025", route: "SFO → LHR", from: "San Francisco", to: "London Heathrow", aircraft: "Airbus A350-900", registration: "N-XYZA", duration: "10h 25m", status: "Completed" },
  { id: "FL-046", date: "22 Aug 2025", route: "JFK → SFO", from: "New York JFK", to: "San Francisco", aircraft: "Boeing 777-300ER", registration: "N-7890", duration: "6h 12m", status: "Completed" },
  { id: "FL-045", date: "11 Aug 2025", route: "CDG → JFK", from: "Paris Charles de Gaulle", to: "New York JFK", aircraft: "Airbus A330-300", registration: "F-ABCD", duration: "8h 14m", status: "Completed" }
];
