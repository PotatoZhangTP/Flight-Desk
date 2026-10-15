# Airport search Preview integration

## Boundaries and data sources

- Add and Edit use the same async picker, snapshots, time normalization and server
  validation. No SQL migration or schema/RLS/Auth change is needed in this phase.
- `/api/airports?q=…` performs a bounded anonymous RPC read against the reference
  database only. Minimum 2 / maximum 80 characters, 12 results, 5s timeout,
  case-insensitive indexed search/ranking remains in `search_airports`.
- The browser never receives reference credentials, a database DSN, all airport
  rows or polygons. No write operation exists in the airport API.
- Vercel **Preview requires explicit reference configuration** and never silently
  falls back to the main catalog. An incomplete configuration gives a 503 and a
  visible error with manual-entry alternative. Non-Preview deployments can use
  the existing main public Supabase configuration when no override is present.
- Existing `NEXT_PUBLIC_SUPABASE_*` still controls Auth/profiles/flights/roadmap.
  **Do not replace these with the airport-only test project's credentials.**
  Creating/editing a flight still uses that existing account database. This
  implementation has not performed any live flight saves or catalog writes.

## Vercel configuration (manual, Preview only)

In Flight Desk → Settings → Environment Variables, add both variables with only
the **Preview** environment selected, preferably scoped to `feature/supabase-auth`:

| Name | Value |
| --- | --- |
| `AIRPORTS_SUPABASE_URL` | Flight Desk Test → Project URL (HTTPS project URL, NOT postgres connection string) |
| `AIRPORTS_SUPABASE_PUBLISHABLE_KEY` | Flight Desk Test → Publishable Key (or legacy anon key, never Secret/service_role) |

After saving environment changes, redeploy the feature Preview so they are
loaded. No Codex environment publication, DB password, pooler, CA certificate or
`AIRPORT_IMPORT_DATABASE_URL` is needed for application search. Never commit real
values. These are server-only reference settings; the source table's public
read policy provides isolation, not merely secrecy of a key.

The test database currently has **24 sample records**, not the global dataset.
Queries for airports outside that sample will legitimately have no results.
No global import is executed by builds/deployments. Production environment
variables and main branch remain unchanged.

## Validation and preserved data

- Results show name, frontend-derived flag, optional IATA/ICAO (or labeled ident),
  city/country and missing-zone prompt. Ident and GPS are never fabricated ICAO.
- 250ms debounce, cancellation/late-response guard, loading/error/empty states,
  keyboard arrows/Enter/Escape, focus tracking and whole-option selection.
- Manual entry accepts name and optional codes/country/ident; the chosen IANA
  timezone is required below. It does not add airports to the reference database.
- Old flight snapshots initialize directly, even if no matching airport exists
  in the current catalog. Choosing a new airport explicitly replaces the snapshot;
  a missing recommended timezone clears the old recommendation instead of guessing.
- The worldwide IANA input offers the browser's supported values and manual entry,
  retaining a saved zone not present in suggestions. No fixed six-zone limitation.
- Luxon rejects nonexistent DST wall times and requires an earlier/later choice
  for overlaps. Saved UTC restores that choice on edit. Server recomputes UTC and
  scheduled minutes rather than trusting client durations. Actual minutes remain
  independent, nullable and preserve zero. Runtime tzdb differences can still
  require validation; geographic recommendations are not guaranteed historically.
- Legacy `flight_date`, `departure_airport` and `arrival_airport` are populated.
  Code-less airports use explicit ident or name, never fake IATA/ICAO. User ID is
  from verified Auth only; updates filter both ID and owner and reject missing rows.
- Dashboard aggregation/schema is not redesigned. Existing legacy duration
  aggregate behavior is unchanged; actual/scheduled statistics reconciliation is
  a separate product task, not silently folded into this change.

## Licensing

Picker displays source attribution. See `scripts/airports/NOTICE.md`, versioned
sample fixture, lock and ingestion code for provenance. Before production global
data publication, complete the applicable ODbL derivative-database access/share-
alike obligations, including a publicly obtainable machine-readable derivative
or applicable alteration data. Attribution alone is not a claim of complete
license compliance; globally enriched files remain separately reviewed artifacts.

## Tests and Preview acceptance

Automated domain/route/action tests: `node --test tests/*.test.cjs`.
Browser tests use only a loopback Next build and the in-memory Supabase protocol
fixture. They do not query/save real users or send mail. Start the fixture with
`node tests/support/theme-api.cjs`; build/start with both Supabase URLs pointing
to `http://127.0.0.1:4410` and fake `sb_publishable_local_test` keys. HTTP loopback
is permitted only outside Vercel for isolated checks. Use `tests/airports-browser.cjs`
with an external Playwright installation and `/usr/bin/chromium`, not a production
site. No browser packages were added to website dependencies.

After the two Preview settings are active:

1. Without login, `/api/airports?q=PEK` returns the public reference only; no private
   profile or flight data. Add/Edit still require login.
2. Search PEK / ZBAA / Beijing / JFK / New York / 00AK. Search for 00IS excludes the
   closed sample. Results outside the 24-record sample are not simulated.
3. Choose both airports using keyboard and pointer; confirm flags/codes, automatic
   zones and editable worldwide zone input. Verify loading/no-result/failure states.
4. Test manual entry and a missing/changed catalog without losing saved snapshots.
5. Saving is a real user flight mutation in the existing account project: perform
   only with an explicitly designated test account and user approval. Verify no-IATA
   records, independent actual duration, edit/reopen, DST and date-line cases.
6. Check mobile, Light/Dark/System, Dashboard/Auth/Profile/Roadmap regression.

Vercel build success alone does not establish configured reference connectivity
or user acceptance. Report missing environment variables and actual deployment
status explicitly; do not claim Preview ready before verifying it.
