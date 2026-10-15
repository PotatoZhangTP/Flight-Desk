# Airport ingestion review — 2026-10-15

**Approval gate: no Supabase connection or write was attempted.** No push,
deployment, application UI change, new migration or business-table mutation is
part of this phase. Previous uncommitted architecture/migration files remain.

## Global dry run

| Metric | Result |
| --- | ---: |
| Official source records | 86,251 |
| Passed structural cleaning | 86,251 |
| Quarantined | 0 |
| Not marked closed | 72,677 |
| Closed (kept separately, excluded from discovery) | 13,574 |
| All records without IATA / explicit ICAO | 77,197 / 75,697 |
| Not-closed records without IATA / explicit ICAO | 63,623 / 62,123 |
| Unique geographic timezone matches, all records | 85,894 (99.5861%) |
| Unique geographic timezone matches, not closed | 72,362 (99.5666%) |
| Unresolved zones, all / not closed | 357 / 315 |
| No land polygon match / ambiguous or edge match | 257 / 100 |
| Duplicate nonempty IATA / ICAO / GPS / ident | 0 / 0 / 0 / 0 |

These are source/structural and matching-coverage measurements, not independent
certification of operations or global geographic accuracy. All unresolved zones
remain NULL; no guessed ICAO, country-derived zone, nearest-zone or ocean offset.

Data source revision: `81d442d8361677cc3134bb18120409b1898c18ba`.
Boundaries: timezone-boundary-builder comprehensive land `2026e`.
Timezone rules: Python tzdata `2026.5`, IANA `2026e`.
Approval manifest SHA-256:
`3b4cf36d36123af09869bbcfaf8b38b2ac6b4cabf74144a05215d8c0300aad5c`.

The raw source/boundaries are checksum-verified against `sources.lock.json`.
Full generated bundle is currently `.airport-data/dry-run-reviewed/`, ignored by
Git. It contains typed `airports.jsonl` (~49 MiB), review CSV (~22 MiB), 24-record
sample, exceptions, report, notices and manifest. Preserve the bundle outside an
ephemeral environment before any live import. New preparations have new manifest
timestamps/fingerprints and require fresh review. Do not treat the smaller copy
of the sample in Git as a standalone approved global bundle.

## Reference airports

| IATA | Explicit ICAO | Country | Geographic IANA zone |
| --- | --- | --- | --- |
| PEK | ZBAA | CN | Asia/Shanghai |
| PKX | ZBAD | CN | Asia/Shanghai |
| JFK | KJFK | US | America/New_York |
| LHR | EGLL | GB | Europe/London |
| HND | RJTT | JP | Asia/Tokyo |
| LAX | KLAX | US | America/Los_Angeles |
| KTM | VNKT | NP | Asia/Kathmandu |
| ADL | YPAD | AU | Australia/Adelaide |

The 24-record sample also includes no-IATA 00AA/00AK/00AL small airfields,
heliports, medium airports, seaplane bases, balloonports and one closed airport.
Country codes, coordinate bounds, types and all eight reference zones passed.

## Tests completed without Supabase

- 16 Python tests: cleaning, distinct code semantics, boundaries/overlap/edges,
  invalid coordinates, checksum/hash gates, DST/fractional zone rules, approved
  target/TLS guards, zero-connection review mode and mocked operator transaction/
  recovery control flow.
- Isolated local PostgreSQL/PGlite with 24 real sample rows: repeat upsert performs
  zero redundant updates, stable IDs, one-row changes, reviewed timezone retention,
  invalid batch rollback, exact-code/no-IATA searches, closed exclusion,
  anonymous/authenticated reads and write denials, unchanged business sentinel.
- Existing website tests: 46 passed. `npm run build`: passed.

Actual Supabase/libpq TLS/COPY, API access, full-volume index behavior, size and
latency are **not yet tested**. Tiny local sample query timings are not a Supabase
performance prediction. `scripts/airports/verify.sql` provides post-import
read-only counts, matching rates, capacity, privileges and query-plan checks.

## Proposed next authorization

1. User approves **24 sample rows only** and the target project (prefer a test
   project). This is separate from global import approval.
2. Configure the operator-only DSN, expected project reference and trusted CA path
   securely; verify database network access without exposing values in chat/Git.
3. Recheck bundle hash, table state, RLS, expected project and storage. Review mode
   remains the default. Actual apply requires explicit flags and private durable
   before-image/receipt storage.
4. One transaction stages and upserts only `public.airports`; eight code searches
   and row counts must pass before commit. Check the receipt, read-only SQL and
   public/API permissions before acceptance.
5. Only after sample acceptance, separately approve the global scope and the
   policy of preserving unresolved timezone values as NULL. Full import remains
   atomic, change-aware and source-ID based, with no automatic deletion or
   missing-source marking. Website global search integration comes later.

Statement failures roll back; a network failure around commit has unknown outcome
until inspected. Before-images/new source keys support a separately reviewed
recovery, not automatic destructive cleanup. No business data is a recovery target.

See `scripts/airports/README.md` for setup, commands, secret handling and recovery;
`scripts/airports/NOTICE.md` for public-domain source and ODbL enrichment obligations.
