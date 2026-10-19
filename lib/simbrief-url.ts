export function simbriefUrl(route: { departure_icao: string; arrival_icao: string; suggested_aircraft?: string | null }) {
  const params = new URLSearchParams({ orig: route.departure_icao, dest: route.arrival_icao });
  if (route.suggested_aircraft) params.set("type", route.suggested_aircraft);
  return `https://dispatch.simbrief.com/options/custom?${params}`;
}
