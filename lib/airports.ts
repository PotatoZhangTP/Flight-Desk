export type Airport = { iata: string; icao: string; name: string; countryCode: string; flag: string; timezone: string };

// Small verified starter dataset. Keep this module replaceable with a larger airport service later.
export const airports: Airport[] = [
  { iata: "PEK", icao: "ZBAA", name: "Beijing Capital International Airport", countryCode: "CN", flag: "🇨🇳", timezone: "Asia/Shanghai" },
  { iata: "SHA", icao: "ZSSS", name: "Shanghai Hongqiao International Airport", countryCode: "CN", flag: "🇨🇳", timezone: "Asia/Shanghai" },
  { iata: "LHR", icao: "EGLL", name: "London Heathrow Airport", countryCode: "GB", flag: "🇬🇧", timezone: "Europe/London" },
  { iata: "CDG", icao: "LFPG", name: "Paris Charles de Gaulle Airport", countryCode: "FR", flag: "🇫🇷", timezone: "Europe/Paris" },
  { iata: "HND", icao: "RJTT", name: "Tokyo Haneda Airport", countryCode: "JP", flag: "🇯🇵", timezone: "Asia/Tokyo" },
  { iata: "SFO", icao: "KSFO", name: "San Francisco International Airport", countryCode: "US", flag: "🇺🇸", timezone: "America/Los_Angeles" },
  { iata: "JFK", icao: "KJFK", name: "John F. Kennedy International Airport", countryCode: "US", flag: "🇺🇸", timezone: "America/New_York" },
];

export function searchAirports(query: string) { const value = query.trim().toLowerCase(); if (!value) return airports; return airports.filter((airport) => [airport.iata, airport.icao, airport.name].some((field) => field.toLowerCase().includes(value))); }
