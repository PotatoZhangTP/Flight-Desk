# Global Airport Database — review gate

Branch: `feature/supabase-auth`. This phase adds a proposed migration and this
plan only. It does not execute Supabase SQL, import data, or replace the form.
Run the migration only after review, once as `postgres`. It is transactional;
future structure changes belong in new migrations, not a rerun of this initializer.

## Existing integration points

- `lib/airports.ts`: seven bundled records, all requiring IATA, ICAO and timezone.
- `components/flight-form.tsx`: shared by Add and Edit; uses IATA as identity,
  searches in the browser, restores airports by looking them up in that list,
  and offers only six timezones. A record outside the list cannot be saved.
- `app/flights/actions.ts`: both mutations currently require IATA. They preserve
  the legacy `flight_date`, `departure_airport`, `arrival_airport` columns and
  write the newer snapshots. The future global selector needs these validators
  adapted; adding the catalog alone does not make code-less records usable.
- `lib/flight-time.ts`: converts IANA local times through Luxon to UTC. Existing
  validation does not explicitly reject DST gaps or disambiguate overlaps;
  this must be addressed in the shared normalization layer before worldwide use.
- Existing flights RLS/user filters stay unchanged. No foreign keys or updates
  from the catalog into historical flight snapshots are proposed.

## Verified source snapshot

Official documentation: https://ourairports.com/data/
Official repository: https://github.com/davidmegginson/ourairports-data
Official published CSV: https://davidmegginson.github.io/ourairports-data/airports.csv

The documentation/published website hosts are not in this environment's startup
allowlist. Research used the official repository's allowed raw GitHub host,
not an unrelated mirror. Its README links back to the official data page and
states daily generation. Its LICENSE is the Unlicense/public-domain dedication,
with an explicit no-warranty disclaimer. We did not independently retrieve the
website data dictionary this phase.

Raw source inspected: `main/airports.csv`, fetched on 2026-10-15. This moving
branch is not a reproducible version identifier: the importer must pin a revision
or record the full CSV checksum, plus its retrieval timestamp.

Inspected CSV SHA-256:
`536d6de0dfeed92d4bbe8fd7411ba6bc14c43251c2161f34b9fbfd50ee3f4113`.

Observed CSV header:

```
id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,
iso_country,iso_region,municipality,scheduled_service,icao_code,iata_code,
gps_code,local_code,home_link,wikipedia_link,keywords
```

| Snapshot measurement | Count |
| --- | ---: |
| All records | 86,251 |
| Not marked closed | 72,677 |
| Not-closed records without IATA | 63,623 |
| Not-closed records without explicit ICAO | 62,123 |
| Not-closed records with scheduled service | 4,327 |
| Large airports | 1,176 |
| Medium airports | 4,104 |
| Small airports | 42,817 |
| Heliports | 23,244 |
| Seaplane bases | 1,273 |
| Balloonports | 63 |
| Closed records | 13,574 |

CSV size: 12,747,586 bytes (~12.2 MiB). No duplicate nonempty source IDs,
idents, IATA, ICAO or GPS codes were observed in this snapshot; that is not a
future uniqueness guarantee. Nonempty IATA/ICAO matched their expected formats.
ICAO comes **only** from `icao_code`, never guessed from `ident` or `gps_code`.
Names/cities/coordinates remain community-maintained and can be incomplete,
incorrect or duplicated. `scheduled_service` is a source flag, not a live schedule.
`listed` means "not marked closed", not independently verified operational status.

## Catalog and permissions

Migration: `20261015000400_create_airport_reference_catalog.sql`.

- Internal bigint identity; stable unique `(source, source_id)` for upserts.
- Optional, non-unique IATA/ICAO; distinct ident, GPS and local code.
- Name, municipality, country code/name (joined from `countries.csv`), region.
- Nullable coordinate pair and IANA timezone; no emoji and no default timezone.
- Type and scheduled-service flag; `listed`, `closed`, `source_missing` statuses.
- `source_version` records the pinned source revision/checksum; `imported_at`
  is synchronization time, not an invented source edit timestamp. `updated_at`
  tracks catalog writes. OurAirports CSV has no per-row last-modified field.
- `timezone_source` records the dataset/version/method or reviewed override.
  A trigger directly resolves each inserted/changed named zone with PostgreSQL's
  `timezone()` function, avoiding per-row enumeration of `pg_timezone_names`.
- Anonymous/authenticated users have SELECT only. No client write policy.
  Even website administrators do not gain catalog write access from membership.
  The initial design uses an explicitly authorized direct `postgres` import
  connection, not a browser service key; `service_role` has no grants here.
- Search is SECURITY INVOKER with empty search_path; no RLS bypass/definer API.
- Public direct reads can include closed reference rows. The discovery RPC
  intentionally excludes closed/source-missing records.
- Explicit RLS and grants support automatic-RLS projects with automatic table
  exposure disabled, provided the existing public API schema remains exposed.
  The migration does not change global API/schema exposure configuration.

## Timezone enrichment

Use a pinned **comprehensive** timezone-boundary-builder land polygon release,
with a controlled offline point-in-polygon importer. Do not use its `now`
variant: zones merged only by today's rules can lose historical distinctions.
An appropriate pinned polygon library can perform matching outside PostgreSQL;
neither PostGIS nor the large polygon files belong in the app/browser/database.

Source: https://github.com/evansiroky/timezone-boundary-builder
Its code is MIT; its output data is **ODbL**, derived substantially from OSM.
This license differs from OurAirports. Before import, record attribution and
the applicable derivative-database/share-alike/source-distribution obligations;
do not label the combined enriched catalog wholly public domain.

The boundaries are approximate and not authoritative. Require exactly one
supported land zone; missing coordinates, no match, multiple matches, suspected
boundary errors, offshore-only fixed zones, or unsupported tzdb names become
`timezone = NULL` and a review report, never a country-based guess. Check the
zone in the importer, PostgreSQL and the deployed Node/browser Intl runtime.
The SQL guard checks PostgreSQL support, not geographic correctness. Reviewed
overrides must be persisted in an importer-side manifest and reapplied on refresh.

After selection, recommend that zone but allow manual correction. A NULL
recommendation requires an explicit user selection before saving. Restore an
existing flight's saved zone unchanged until the user explicitly changes it.
Worldwide choices must replace the six-item list (including the saved legacy
zone if not in the current recommended list).

UTC/duration handling stays in shared client/server normalization: compare the
requested wall clock with the resolved wall clock to reject DST gaps; use Luxon
`getPossibleOffsets()` for overlaps and require an explicit earlier/later choice.
The server must recompute/validate UTC and scheduled minutes, not trust browser
UTC/duration values. Actual duration remains independent and nullable. Historical
timezone rules and political changes are limited by the pinned/runtime tzdb;
geographic lookup cannot guarantee every airport's historical local practice.

## Server search and future UI

Proposed `search_airports(search_query, result_limit)` uses native PostgreSQL:
partial B-tree code-prefix indexes and weighted GIN full-text word-prefix search.
No extension dependency, full catalog browser download, or unindexed `%term%`
substring scan is required. This is prefix/token matching, not typo-tolerant fuzzy
search or guaranteed arbitrary mid-word matching.

- Input 2–80 characters; punctuation-only/empty queries return no results.
- Limit defaults to 12 and clamps to 1–20.
- Exact IATA/ICAO first, then weighted name/city/country relevance. Scheduled
  service multiplies text rank by 1.15; large/medium airports multiply it by
  1.10/1.05 respectively. Exact ident/GPS and service break remaining ties,
  followed by deterministic name/ID. No airport type or missing code is excluded.
- All non-closed airport types remain eligible, including no-code facilities.
- Every result retains stable ID, optional codes and distinct source ident.
  Display only existing codes; label GPS/ident as such, never as ICAO.
- A future server Route Handler uses the existing publishable-key Supabase
  client/RPC with explicit selected fields, validated query length/limit,
  short request timeout and short public reference-data cache. Deployment-level
  rate limiting is recommended; bounded results do not by themselves prevent abuse.
- Shared async accessible combobox: ~250ms debounce, AbortController/request
  sequence protection, loading/error/empty states, arrows/Enter/Escape, proper
  listbox/combobox labels and focus. Reuse CountryFlag and current theme tokens.
- Manual fallback: airport name, optional codes/country and required user-chosen
  zone; use the same normalization/save path as catalog selection and later Excel.

Add/Edit must hold an airport **snapshot object**, not use IATA as identity.
Opening an old flight uses its saved name/codes/country/zone even if the catalog
record is unavailable. Only an explicit new selection replaces that snapshot.
Save into current flights snapshot fields. Continue filling `flight_date` and
legacy airport text fields using IATA, otherwise verified ICAO, source ident,
otherwise the explicit manual name. Never invent an IATA/ICAO to satisfy NOT NULL.
No flights schema change is required for this fallback.

## Import/update plan — not implemented or executed yet

After user approval and manual migration:

1. Build a controlled importer with dry-run default, pinned/checksummed CSV and
   countries CSV, pinned timezone data, parser/version manifest and attribution.
2. Validate unique source IDs, required fields, coordinate bounds, country join,
   optional codes and named zones. Log counts/reasons for quarantined rows, not
   database credentials. No coercion of invalid coordinates/codes into fake values.
3. Keep rows without IATA/ICAO; report duplicates for review without merging by
   names or codes. Explicit `closed` rows get status closed; other types listed.
4. Enrich offline; retain unresolved zones as NULL with an exception report.
5. Only after explicit authorization, stage validated rows and transactionally
   batch-upsert on `(source, source_id)` using a secured admin connection. Never
   update or delete flights. Preserve IDs and reviewed timezone overrides.
6. Only a successfully validated COMPLETE snapshot may mark previously seen but
   now absent rows `source_missing`. Partial downloads/import failures cannot
   trigger missing marking. Do not delete missing reference rows automatically.
7. Repeated imports must not duplicate rows. Record source hash, counts, retrieval
   time and timezone provenance; use those artifacts to reproduce or roll back
   catalog updates. Protect DSNs outside Git/chat and never run the importer in
   Vercel builds or a normal browser. Monthly/weekly refresh can follow later.

## Capacity and verification

Preliminary capacity budget for ~86k rows: approximately **60–140 MiB** for heap,
generated search vector, primary/source/code indexes and GIN, depending on real
text lengths/index sizes. This is an estimate, not a Supabase measurement.
Assuming the project's Free allowance is 500 MB, catalog storage alone is likely
feasible, but existing usage, WAL, temporary import space and update bloat matter.
Check the actual project plan/usage before importing; stage compact batches and
reserve headroom. Do not load global timezone polygons into Supabase.

After import, measure `pg_total_relation_size('public.airports')` and its heap/index
breakdown, ANALYZE, then run EXPLAIN (ANALYZE, BUFFERS) for common/rare name,
country, exact-code and short-prefix queries. Latency/index use at production
scale is not yet verified and must be measured before wiring the live selector.

The proposed migration was executed only in isolated local PostgreSQL WASM
(PGlite), with synthetic records and Supabase role stubs: schema/function syntax,
anonymous/authenticated search, empty/punctuation queries, result limits, no-code
heliports, closed/missing exclusion, privilege denials including service_role,
invalid timezone/code rejection and source-ID upsert were checked. This is not
a live Supabase permission/API or real-volume performance test.

Final local review used PostgreSQL 18.6 (PGlite 0.5.10). Inserting 86,251
**synthetic**, not OurAirports, rows with four named zones, indexes and the revised
trigger took about 3.77 seconds. A deliberately broad word-prefix search over
all those rows took about 556ms and returned 20 rows; synthetic catalog size was
44,277,760 bytes. WASM timings and uniform synthetic strings do not establish
Supabase performance, production space requirements or a latency guarantee.
Actual project PostgreSQL version has not been queried. The migration uses
standard features available since PostgreSQL 12, not PostgreSQL-18-only features.

Before full import, use an explicitly authorized test project or transactionally
rolled-back sample of 100–500 source rows: include major/small/heliport/no-code,
closed/missing, both hemispheres, half/quarter-hour zones, boundary exceptions,
duplicates and malformed fields. Verify known zone recommendations, DST gap and
overlap handling separately from catalog validation, exact-code priority and
public read/write-denial. Only after ANALYZE should indexed query plans and
repeated server-side timings be recorded. A short sample may legitimately use
a sequential scan; repeat with representative scale before judging index use.
Any failed batch must roll back; quarantine invalid source rows and fix/retry
using stable-source upsert. Never mark missing rows from a sample or incomplete
run. Preserve the source manifest and before-images for reverting a committed
catalog refresh; do not touch flights or delete unrelated rows for cleanup.

Deployment order: review SQL → user runs SQL → build/review dry-run importer →
explicitly authorize catalog import → inspect data/permissions/performance →
develop shared search/normalizer → test Add/Edit/DST/manual/legacy records →
build and push feature Preview. Current application requires none of the new
objects, so it remains compatible while the database is prepared.
