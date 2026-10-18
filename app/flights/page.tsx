import { T, LocalizedDate, LocalizedDuration } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { DeleteFlightForm } from "@/components/delete-flight-form";
import { AllFlightsFilters } from "@/components/all-flights-filters";
import { airportFromRow, type Airport } from "@/lib/airports";
import { createClient } from "@/lib/supabase/server";
import { normalizeFlightNumber } from "@/lib/flight-number";

const sortable: Record<string, string> = {
  flight_date: "Date",
  flight_number: "Flight",
  route: "Route",
  aircraft_type: "Aircraft",
  duration_minutes: "Duration",
  status: "Status",
};
const hours = (value?: string) => {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};
const airportCode = (value?: string) => {
  const code = (value || "").trim().toUpperCase();
  return /^[A-Z0-9-]{2,10}$/.test(code) ? code : "";
};
const effectiveDuration = (flight: {
  actual_duration_minutes?: number | null;
  scheduled_duration_minutes?: number | null;
  duration_minutes?: number | null;
}) =>
  flight.actual_duration_minutes ??
  flight.scheduled_duration_minutes ??
  flight.duration_minutes;
const pageItems = (page: number, pages: number): (number | "ellipsis")[] => {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const items: (number | "ellipsis")[] = [1];
  if (page > 4) items.push("ellipsis");
  for (
    let value = Math.max(2, page - 1);
    value <= Math.min(pages - 1, page + 1);
    value++
  )
    items.push(value);
  if (page < pages - 3) items.push("ellipsis");
  items.push(pages);
  return items;
};
type FlightRow = {
  id: string;
  flight_date: string;
  flight_number: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  departure_airport_icao: string | null;
  arrival_airport_icao: string | null;
  departure_airport_iata: string | null;
  arrival_airport_iata: string | null;
  departure_country_code: string | null;
  arrival_country_code: string | null;
  aircraft_type: string | null;
  status: string | null;
  actual_duration_minutes: number | null;
  scheduled_duration_minutes: number | null;
  duration_minutes: number | null;
};
type AirportMatch = { icao: string | null; iata: string | null };
const normal = (value?: string | null) => value?.trim().toUpperCase() || "";

type AirportSnapshot = Pick<
  FlightRow,
  | "departure_airport"
  | "arrival_airport"
  | "departure_airport_icao"
  | "arrival_airport_icao"
  | "departure_airport_iata"
  | "arrival_airport_iata"
  | "actual_duration_minutes"
  | "scheduled_duration_minutes"
  | "duration_minutes"
>;
function airportMatchesText(airport: Airport, query: string) {
  const search = query.trim().toLocaleLowerCase();
  return (
    !search ||
    [
      airport.iata,
      airport.icao,
      airport.ident,
      airport.name,
      airport.municipality,
      airport.countryName,
    ].some((value) => value?.toLocaleLowerCase().includes(search))
  );
}
function buildAirportCandidates(
  rows: AirportSnapshot[],
  side: "departure" | "arrival",
  catalog: Map<string, Airport>,
) {
  const candidates = new Map<string, Airport>();
  for (const row of rows) {
    const icao = normal(row[`${side}_airport_icao`]);
    const iata = normal(row[`${side}_airport_iata`]);
    const legacy = normal(row[`${side}_airport`]);
    const mapped =
      catalog.get(icao) || catalog.get(iata) || catalog.get(legacy);
    const airport: Airport = mapped || {
      id: null,
      origin: "snapshot",
      ident: legacy || null,
      iata: iata || null,
      icao: icao || null,
      name: row[`${side}_airport`] || iata || icao || legacy,
      countryCode: null,
      countryName: null,
      municipality: null,
      timezone: null,
      latitude: null,
      longitude: null,
    };
    const key = airport.icao || airport.iata || airport.ident || airport.name;
    if (key) candidates.set(key, airport);
  }
  return [...candidates.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}
function mergeAirportCandidates(...groups: Airport[][]) {
  const candidates = new Map<string, Airport>();
  groups
    .flat()
    .forEach((airport) =>
      candidates.set(
        airport.icao || airport.iata || airport.ident || airport.name,
        airport,
      ),
    );
  return [...candidates.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}
function flightMatchesCountry(flight: FlightRow, country: string, catalog: Map<string, Airport>) {
  if (!country) return true;
  return (["departure", "arrival"] as const).some((side) => {
    const codes = [flight[`${side}_airport_icao`], flight[`${side}_airport_iata`], flight[`${side}_airport`]].map(normal);
    return codes.some((code) => normal(catalog.get(code)?.countryCode) === country) || normal(flight[`${side}_country_code`]) === country;
  });
}

function parseExact(value?: string) {
  const [icao, iata] = (value || "").split("|");
  return { icao: airportCode(icao), iata: airportCode(iata) };
}
function airportMatches(
  flight: FlightRow,
  side: "departure" | "arrival",
  exact: { icao: string; iata: string },
  matches: AirportMatch[],
  fuzzy: string,
) {
  const icao = normal(flight[`${side}_airport_icao`]);
  const iata = normal(flight[`${side}_airport_iata`]);
  const legacy = normal(flight[`${side}_airport`]);
  if (exact.icao || exact.iata)
    return Boolean(
      (exact.icao && (icao === exact.icao || legacy === exact.icao)) ||
        (exact.iata && (iata === exact.iata || legacy === exact.iata)),
    );
  if (matches.length)
    return matches.some(
      (match) =>
        (match.icao && (icao === match.icao || legacy === match.icao)) ||
        (match.iata && (iata === match.iata || legacy === match.iata)),
    );
  const query = fuzzy.trim().toLowerCase();
  return (
    !query ||
    [
      flight[`${side}_airport`],
      flight[`${side}_airport_iata`],
      flight[`${side}_airport_icao`],
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(query),
    )
  );
}

export default async function AllFlightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const page = Math.max(1, Number(p.page) || 1);
  const size = 20;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/flights");
  const hrefFor = (extra: Record<string, string>) => {
    const params = new URLSearchParams(
      Object.entries(p).filter(([, value]) => value) as [string, string][],
    );
    Object.entries(extra).forEach(([key, value]) =>
      value ? params.set(key, value) : params.delete(key),
    );
    const value = params.toString();
    return `/flights${value ? `?${value}` : ""}`;
  };
  const { data: countryRows } = await supabase
    .from("airports")
    .select("country_code,country_name")
    .not("country_code", "is", null)
    .not("country_name", "is", null);
  const countryOptions = [
    ...new Map(
      (countryRows || []).map((row) => [
        String(row.country_code).toUpperCase(),
        String(row.country_name),
      ]),
    ).entries(),
  ]
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const userAirportRows: AirportSnapshot[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: batch } = await supabase
      .from("flights")
      .select(
        "departure_airport,arrival_airport,departure_airport_icao,arrival_airport_icao,departure_airport_iata,arrival_airport_iata,actual_duration_minutes,scheduled_duration_minutes,duration_minutes",
      )
      .eq("user_id", user.id)
      .range(offset, offset + 999);
    userAirportRows.push(...((batch || []) as AirportSnapshot[]));
    if (!batch || batch.length < 1000) break;
  }
  const usedCodes = [
    ...new Set(
      (userAirportRows || []).flatMap((row) =>
        [
          row.departure_airport,
          row.arrival_airport,
          row.departure_airport_icao,
          row.arrival_airport_icao,
          row.departure_airport_iata,
          row.arrival_airport_iata,
        ]
          .map(normal)
          .filter(Boolean),
      ),
    ),
  ];
  const [icaoRows, iataRows, identRows] = usedCodes.length
    ? await Promise.all([
        supabase
          .from("airports")
          .select(
            "id,ident,name,iata_code,icao_code,country_code,country_name,municipality,timezone,latitude,longitude",
          )
          .in("icao_code", usedCodes),
        supabase
          .from("airports")
          .select(
            "id,ident,name,iata_code,icao_code,country_code,country_name,municipality,timezone,latitude,longitude",
          )
          .in("iata_code", usedCodes),
        supabase
          .from("airports")
          .select(
            "id,ident,name,iata_code,icao_code,country_code,country_name,municipality,timezone,latitude,longitude",
          )
          .in("ident", usedCodes),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const catalog = new Map<string, Airport>();
  [
    ...(icaoRows.data || []),
    ...(iataRows.data || []),
    ...(identRows.data || []),
  ].forEach((row) => {
    const airport = airportFromRow(row);
    [airport.icao, airport.iata, airport.ident]
      .filter(Boolean)
      .forEach((code) => catalog.set(normal(code), airport));
  });
  const departureAirports = buildAirportCandidates(
    userAirportRows,
    "departure",
    catalog,
  );
  const arrivalAirports = buildAirportCandidates(
    userAirportRows,
    "arrival",
    catalog,
  );
  const airports = mergeAirportCandidates(departureAirports, arrivalAirports);
  const maximumDurationHours = Math.max(
    48,
    Math.ceil(
      Math.max(
        0,
        ...(userAirportRows.map(
          (flight) => ((effectiveDuration(flight) || 0) / 60) * 2,
        )),
      ) / 2,
    ),
  );
  const min = hours(p.minDuration);
  const max = hours(p.maxDuration);
  const airport = airportCode(p.airport);
  const destinationCountry = /^[A-Z]{2}$/.test(
    (p.destinationCountry || "").toUpperCase(),
  )
    ? (p.destinationCountry || "").toUpperCase()
    : "";
  const invalid = Boolean(
    (p.minDuration && min == null) ||
      (p.maxDuration && max == null) ||
      (min != null && max != null && max < min),
  );
  const departureText = (p.departure || "").trim();
  const arrivalText = (p.arrival || "").trim();
  const airportFilterText = (p.airportFilter || "").trim();
  let query = supabase
    .from("flights")
    .select(
      "id,flight_date,flight_number,departure_airport,arrival_airport,departure_airport_icao,arrival_airport_icao,departure_airport_iata,arrival_airport_iata,departure_country_code,arrival_country_code,aircraft_type,status,actual_duration_minutes,scheduled_duration_minutes,duration_minutes",
      { count: "exact" },
    )
    .eq("user_id", user.id);
  if (airport)
    query = query
      .eq("status", "completed")
      .or(
        `departure_airport_icao.eq.${airport},arrival_airport_icao.eq.${airport},departure_airport_iata.eq.${airport},arrival_airport_iata.eq.${airport},departure_airport.eq.${airport},arrival_airport.eq.${airport}`,
      );
  const search = (p.q || "").trim();
  if (p.from) query = query.gte("flight_date", p.from);
  if (p.to) query = query.lte("flight_date", p.to);
  if (p.aircraft) query = query.ilike("aircraft_type", `%${p.aircraft}%`);
  if (p.status === "planned" || p.status === "completed")
    query = query.eq("status", p.status);
  const sort = sortable[p.sort || ""] ? p.sort! : "flight_date";
  const ascending = p.dir === "asc";
  const result = invalid
    ? { data: [], error: null, count: 0 }
    : await query.order(sort === "duration_minutes" ? "flight_date" : sort, {
        ascending,
      });
  const toAirportMatches = (rows: Airport[]) =>
    rows.map((row) => ({
      icao: normal(row.icao) || null,
      iata: normal(row.iata) || null,
    }));
  const departures =
    departureText && !p.departureExact
      ? toAirportMatches(
          departureAirports.filter((item) =>
            airportMatchesText(item, departureText),
          ),
        )
      : [];
  const arrivals =
    arrivalText && !p.arrivalExact
      ? toAirportMatches(
          arrivalAirports.filter((item) =>
            airportMatchesText(item, arrivalText),
          ),
        )
      : [];
  const airportMatchesAny =
    airportFilterText && !p.airportFilterExact
      ? toAirportMatches(
          airports.filter((item) =>
            airportMatchesText(item, airportFilterText),
          ),
        )
      : [];
  const departureExact = parseExact(p.departureExact);
  const arrivalExact = parseExact(p.arrivalExact);
  const airportExact = parseExact(p.airportFilterExact);
  const flightNumberFiltered = search
    ? (result.data || []).filter((flight: FlightRow) => normalizeFlightNumber(flight.flight_number).includes(normalizeFlightNumber(search)))
    : result.data || [];
  const airportFiltered = flightNumberFiltered.filter(
    (flight: FlightRow) =>
      airportMatches(
        flight,
        "departure",
        departureExact,
        departures,
        p.departureExact ? "" : departureText,
      ) &&
      airportMatches(
        flight,
        "arrival",
        arrivalExact,
        arrivals,
        p.arrivalExact ? "" : arrivalText,
      ) &&
      ((!airportFilterText && !p.airportFilterExact) ||
        airportMatches(
          flight,
          "departure",
          airportExact,
          airportMatchesAny,
          p.airportFilterExact ? "" : airportFilterText,
        ) ||
        airportMatches(
          flight,
          "arrival",
          airportExact,
          airportMatchesAny,
          p.airportFilterExact ? "" : airportFilterText,
        )),
  );
  const countryFiltered = airportFiltered.filter((flight) => flightMatchesCountry(flight, destinationCountry, catalog));
  const durationFiltered =
    min != null || max != null
      ? countryFiltered.filter((flight) => {
          const duration = effectiveDuration(flight);
          return (
            typeof duration === "number" &&
            (min == null || duration >= Math.round(min * 60)) &&
            (max == null || duration <= Math.round(max * 60))
          );
        })
      : countryFiltered;
  const ordered =
    sort === "duration_minutes"
      ? [...durationFiltered].sort((left, right) => {
          const leftDuration = effectiveDuration(left);
          const rightDuration = effectiveDuration(right);
          if (leftDuration == null && rightDuration == null) return 0;
          if (leftDuration == null) return 1;
          if (rightDuration == null) return -1;
          return (leftDuration - rightDuration) * (ascending ? 1 : -1);
        })
      : durationFiltered;
  const total = ordered.length;
  const pages = Math.ceil(total / size);
  const currentPage = Math.min(page, Math.max(1, pages || 1));
  const data = ordered.slice((currentPage - 1) * size, currentPage * size);
  const url = hrefFor;
  const from = total ? (currentPage - 1) * size + 1 : 0;
  const to = Math.min(currentPage * size, total);
  const selectedStatus =
    p.status === "planned" || p.status === "completed" ? p.status : "";
  return (
    <div className="min-h-screen bg-page">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-5 lg:px-12">
        <Brand />
        <UserMenu
          email={user.email ?? ""}
          initials={(user.email ?? "P").slice(0, 2).toUpperCase()}
        />
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-12">
        <Link href="/dashboard" className="text-sm font-semibold text-brand">
          <T id="common.backDashboard" />
        </Link>
        <div className="mt-8">
          <h1 className="text-4xl font-bold tracking-tight text-brand">
            <T id="dashboard.allFlights" />
          </h1>
          <p className="mt-2 text-muted">
            <T id="dashboard.allFlightsHelp" />
          </p>
        </div>
        <nav
          className="mt-5 inline-flex rounded-full border border-line bg-brand-soft/50 p-1"
          aria-label="Flight status"
        >
          <Link
            href={hrefFor({ status: "", page: "1" })}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!selectedStatus ? "bg-brand text-on-brand" : "text-muted hover:bg-surface hover:text-brand"}`}
          >
            All
          </Link>
          <Link
            href={hrefFor({ status: "planned", page: "1" })}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedStatus === "planned" ? "bg-brand text-on-brand" : "text-muted hover:bg-surface hover:text-brand"}`}
          >
            Planned
          </Link>
          <Link
            href={hrefFor({ status: "completed", page: "1" })}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedStatus === "completed" ? "bg-brand text-on-brand" : "text-muted hover:bg-surface hover:text-brand"}`}
          >
            Completed
          </Link>
        </nav>
        <AllFlightsFilters
          values={p}
          countries={countryOptions}
          departureAirports={departureAirports}
          arrivalAirports={arrivalAirports}
          maximumDurationHours={maximumDurationHours}
        />
        {invalid && (
          <p role="alert" className="mt-3 text-sm text-danger-fg">
            <T id="dashboard.durationFilterError" />
          </p>
        )}
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-surface p-5">
          <table className="w-full min-w-[1000px] text-center text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th className="w-16 pb-3 pr-5">#</th>
                {Object.entries(sortable).map(([key, label]) => {
                  const active = p.sort === key;
                  const nextDirection = active
                    ? p.dir === "asc"
                      ? "desc"
                      : "asc"
                    : key === "duration_minutes"
                      ? "asc"
                      : "desc";
                  return (
                    <th key={key} className="pb-3">
                      <Link
                        href={url({ sort: key, dir: nextDirection, page: "1" })}
                        className="hover:text-brand"
                      >
                        {label}
                        {active && (
                          <span
                            className="ml-1"
                            aria-label={
                              p.dir === "asc" ? "ascending" : "descending"
                            }
                          >
                            {p.dir === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </Link>
                    </th>
                  );
                })}
                <th className="pb-3">
                  <T id="common.viewEdit" />
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((flight, index) => (
                <tr key={flight.id} className="border-b border-surface-muted">
                  <td className="py-4 pr-5">
                    {(currentPage - 1) * size + index + 1}
                  </td>
                  <td>
                    <LocalizedDate value={flight.flight_date} />
                  </td>
                  <td>{flight.flight_number || "—"}</td>
                  <td>
                    {flight.departure_airport_iata || flight.departure_airport}{" "}
                    → {flight.arrival_airport_iata || flight.arrival_airport}
                  </td>
                  <td>{flight.aircraft_type || "—"}</td>
                  <td>
                    {effectiveDuration(flight) == null ? (
                      "—"
                    ) : (
                      <LocalizedDuration minutes={effectiveDuration(flight)!} />
                    )}
                  </td>
                  <td>
                    <T
                      id={
                        flight.status === "planned"
                          ? "dashboard.planned"
                          : "dashboard.completed"
                      }
                    />
                  </td>
                  <td>
                    <div className="flex justify-center gap-2">
                      <Link
                        href={`/flights/${flight.id}/edit`}
                        className="font-bold text-brand"
                      >
                        <T id="common.viewEdit" />
                      </Link>
                      <DeleteFlightForm id={flight.id} returnTo="/flights" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted">
              <T id="dashboard.showingFlights" values={{ from, to, total }} />
            </span>
            {pages > 1 && (
              <nav
                className="flex flex-wrap items-center justify-center gap-1.5"
                aria-label="Pagination"
              >
                <Link
                  href={
                    currentPage > 1
                      ? url({ page: String(currentPage - 1) })
                      : "#"
                  }
                  aria-disabled={currentPage === 1}
                  className={`rounded-full border px-3 py-1.5 font-bold ${currentPage > 1 ? "border-brand text-brand hover:bg-brand-soft" : "pointer-events-none border-line text-subtle"}`}
                >
                  <T id="common.previousPage" />
                </Link>
                {pageItems(currentPage, pages).map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-1.5 text-subtle"
                    >
                      …
                    </span>
                  ) : (
                    <Link
                      key={item}
                      href={url({ page: String(item) })}
                      aria-current={item === currentPage ? "page" : undefined}
                      className={`rounded-full px-3 py-1.5 font-bold ${item === currentPage ? "bg-brand text-on-brand" : "text-brand hover:bg-brand-soft"}`}
                    >
                      {item}
                    </Link>
                  ),
                )}
                <Link
                  href={
                    currentPage < pages
                      ? url({ page: String(currentPage + 1) })
                      : "#"
                  }
                  aria-disabled={currentPage === pages}
                  className={`rounded-full border px-3 py-1.5 font-bold ${currentPage < pages ? "border-brand text-brand hover:bg-brand-soft" : "pointer-events-none border-line text-subtle"}`}
                >
                  <T id="common.nextPage" />
                </Link>
              </nav>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
