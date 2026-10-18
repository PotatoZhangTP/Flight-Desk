import type { Challenge } from "@/components/daily-challenge";

export type CompletedFlightRoute = {
  departure_airport_icao?: string | null;
  arrival_airport_icao?: string | null;
  departure_airport_iata?: string | null;
  arrival_airport_iata?: string | null;
};

const code = (value?: string | null) => value?.trim().toUpperCase() || "";

function sameAirport(flightIcao: string | null | undefined, flightIata: string | null | undefined, challengeIcao: string, challengeIata: string) {
  const recordedIcao = code(flightIcao);
  const expectedIcao = code(challengeIcao);
  if (recordedIcao && expectedIcao) return recordedIcao === expectedIcao;
  return Boolean(code(flightIata) && code(challengeIata) && code(flightIata) === code(challengeIata));
}

export function flownChallengeCategories(challenges: Challenge[], flights: CompletedFlightRoute[]) {
  return challenges.filter(challenge => flights.some(flight =>
    sameAirport(flight.departure_airport_icao, flight.departure_airport_iata, challenge.departure_icao, challenge.departure_iata)
    && sameAirport(flight.arrival_airport_icao, flight.arrival_airport_iata, challenge.arrival_icao, challenge.arrival_iata),
  )).map(challenge => challenge.category);
}
