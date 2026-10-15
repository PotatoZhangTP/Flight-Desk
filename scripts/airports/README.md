# Flight Desk airport ingestion (Python 3.12)

This is an **operator-only tool**, not a Next.js feature, public endpoint, Vercel
build step or browser importer. Preparation and review modes never connect to a
database and need no Supabase variables. No business table is a write target.

## Reproducible preparation

Create an isolated Python 3.12 virtual environment outside the checkout, then:

```sh
python3 -m venv /tmp/flightdesk-airport-tools
/tmp/flightdesk-airport-tools/bin/pip install -r scripts/airports/requirements.txt
/tmp/flightdesk-airport-tools/bin/python scripts/airports/prepare.py \
  --output .airport-data/run-YYYYMMDD
```

The default cache is `.airport-data/cache`. Use a new output directory each run;
existing output is never overwritten. `--cache PATH --offline` requires all
inputs to be present and correctly hashed and performs no download. Default
online preparation downloads only missing inputs; mismatched files are refused,
not silently refreshed. Retain inherited proxy and CA settings. Source lock
updates must be deliberate reviewable edits, never an automatic "latest" fetch.

Pinned inputs:

- OurAirports revision `81d442d8361677cc3134bb18120409b1898c18ba`, including countries.
- timezone-boundary-builder `2026e`, **comprehensive land** `timezones.geojson.zip`.
- Python `tzdata==2026.5`, IANA `2026e`. Host OS zoneinfo is deliberately bypassed.

The source lock records SHA-256 of files obtained over TLS from official sources;
these are recorded artifact checksums, not a claim of publisher-signed hashes.
The initial website download hosts are not allowed in this environment; use the
official repository's immutable raw GitHub CSV URLs in `sources.lock.json`.

Outputs (ignored by Git):

| File | Purpose |
| --- | --- |
| `airports.jsonl` | Typed global import input, including separately flagged closed rows |
| `airports.csv` | Human/machine-readable review and future licensed distribution |
| `sample.jsonl` | 24 real records, including eight major reference airports and no-IATA facilities |
| `issues.jsonl` | Missing/ambiguous boundaries, invalid codes/coordinates or quarantined rows |
| `report.json` | Counts, coverage, duplicates and reference checks |
| `manifest.json` | Input versions/hashes, generated-file hashes, tool/tzdb versions |
| `NOTICE.md` | Data attribution and licensing |

No polygons or GeoJSON are included in import records or sent to PostgreSQL.
Country flags remain a frontend responsibility. Names, ident, GPS, ICAO and IATA
are distinct; only explicit source `icao_code` supplies ICAO. Small airports do
not need codes. CSV blanks are only for review; use the typed JSONL importer,
not an ad-hoc browser CSV import that may change NULL/boolean semantics.

## Download a reviewed CSV from GitHub Actions

The `Download Global Airport CSV` workflow generates the same pinned snapshot
without database credentials or database access. Its initial workflow-file push
on `feature/supabase-auth` starts a run automatically. Open the repository's
**Actions → Download Global Airport CSV → successful run → Artifacts →
flightdesk-global-airports** to download a ZIP (GitHub sign-in required).
Artifacts expire after 14 days. Use **Re-run all jobs** to regenerate them.
`workflow_dispatch` is also supported for the feature branch, but GitHub may not
show the manual Run workflow button until the workflow is registered on the
default branch; do not merge main merely to enable that button.

The job verifies all generated data hashes against the committed reviewed
manifest before uploading. A new generation timestamp/Python patch version may
change the manifest hash; the data-file hashes must remain identical. The ZIP
contains the complete typed JSONL, CSV, sample, exception report, review report,
manifest and licensing notice, never the timezone polygons or repository files.
No Supabase secrets, migrations, import commands or deployments are configured
in this workflow. Normal repository Vercel Preview integration may still run on
the feature-branch push.

For the separately reviewed manual Dashboard route, upload the unmodified CSV
only to the operator-only `public.airports_import_staging` raw-text table, never
directly to `public.airports`. This is staging, not a completed airport import:
validate rows and NULL/boolean semantics before a separately approved typed,
transactional merge. Do not relax staging permissions if Dashboard upload fails.

## Timezone quality

Longitude/latitude points are queried against a Shapely STRtree of the pinned
comprehensive land polygons. Exactly one interior zone must match and be supported
by pinned IANA rules. No match, multiple zones, exact boundary edges, missing
coordinates or unsupported zones remain NULL and enter the exception report.
No nearest-point, ocean fixed-offset or country fallback is used. Source/boundary
errors can still produce an incorrect unique zone; match coverage is **not an
accuracy guarantee**. Historical rule changes come from IANA; present geographic
boundaries cannot reconstruct every historical political boundary.

Reference checks include PEK/PKX/JFK/LHR/HND/LAX, plus KTM (UTC+05:45) and ADL
(half-hour zone with DST). The sample includes 00AA/00AK/00AL small airports,
heliports, no-IATA medium airports, seaplane bases, balloonports and a closed row.
Closed rows are stored as reference but excluded by the existing search RPC.

Refreshes preserve existing timezone/provenance pairs marked `reviewed:` unless
the incoming reviewed bundle explicitly supplies a new `reviewed:` value. This
phase does not automatically resolve the exception report or assign overrides.
Review boundary/source corrections separately before changing any airport zone.

## Review without any DB access

Read `report.json`, `issues.jsonl`, source notices and the selected records. Compute
the manifest hash with `sha256sum BUNDLE/manifest.json` and retain it as the approval
fingerprint. Example (placeholders below are not credentials):

```sh
/tmp/flightdesk-airport-tools/bin/python scripts/airports/import_bundle.py \
  --bundle .airport-data/run-YYYYMMDD --scope sample \
  --approve-manifest-sha256 REVIEWED_HASH --ack-reviewed-issues
```

Without `--apply`, this only verifies bundle hashes, typed records, reference
airports, duplicate IDs, selected scope and matching tzdata version. It imports
no DB driver and does not read the DSN. `--ack-reviewed-issues` is a separate
explicit acknowledgement for unresolved zones, code warnings, quarantine or
duplicate-code reports; it does not fill missing values or remove constraints.

## Small controlled import — WAIT FOR USER CONFIRMATION

Suggested first scope: the 24-record sample, preferably in a separate Supabase
test project with the already reviewed migration. If the user chooses the
existing project instead, explicitly confirm its project reference and airport
table state; do not assume it is safe simply because other imports worked.

Before any write, verify network access, CA trust, DB version, current schema,
capacity, source manifest, attribution plan and NULL-zone policy. API publishing
is separate: no Add/Edit form or public search wiring changes in this phase.

Only the later authorized write mode needs these **server/operator-only** variables:

| Variable | Value / safe handling |
| --- | --- |
| `AIRPORT_IMPORT_DATABASE_URL` | Supabase postgres direct/session-pooler DSN, including DB password; secret |
| `AIRPORT_IMPORT_EXPECTED_PROJECT_REF` | Expected project reference, not a secret |
| `AIRPORT_IMPORT_SSLROOTCERT` | Filesystem path to the authentic CA bundle for verifying the chosen DB endpoint |

Use Codex Environment Settings **only if it supports a usable raw process secret
for the database DSN**, or a trusted local/CI secret store. A proxy-only HTTPS
secret placeholder cannot authenticate libpq/TCP. Do not send the DSN/password
in chat, commit it, pass it as a CLI argument, print it, or add `NEXT_PUBLIC_`.
Do not run this in Vercel frontend builds. Raw TCP host/port access and libpq CA
trust have not been verified in this phase; request the required supported network
access later. Never fall back to disabling TLS or a high-privilege public API.
Use only the direct DB host or Supabase session pooler shown in its Connect panel;
avoid transaction-pool mode for this staging/COPY workflow.

Once separately authorized, the command adds these flags to the review command:

```
--apply --confirm-project-ref APPROVED_PROJECT_REF \
--receipt-dir .airport-data/receipts/NEW_UNIQUE_DIRECTORY
```

The script validates the approved hash and project target, enforces TLS
`verify-full`, postgres role, expected RLS/trigger, takes a transaction advisory
lock, stages with COPY, fsyncs before-images, and performs a single atomic upsert
on `(source, source_id)`. Unchanged records are not updated; existing IDs remain
stable. In-transaction reference search/count checks must pass before commit.
Only `public.airports` and a private temporary staging table are mutation targets.
No migration, TRUNCATE, DELETE, disabled trigger, RLS bypass grant, missing-source
marking or business-table mutation is issued.

Afterwards review the receipt and run `verify.sql`, including no-IATA lookup,
closed exclusion and anonymous/authenticated API checks. A small sample may
legitimately use sequential scans. Real network/RLS API checks and deployed
PostgreSQL timezone compatibility remain pending until this authorized step.

## Global import — separate second approval

After sample acceptance, inspect all 357 NULL-zone exceptions and accept a policy
of retaining them for manual flight timezone selection, or review corrections.
Check global row counts, license obligations, project storage/quota and backup.
Repeat review with `--scope global`; write mode still requires all explicit
approval flags and a fresh receipt directory. The full selected scope uses one
transaction (COPY plus upsert), so it cannot partially commit by batch. The current
statement timeout is 120s and lock timeout 5s; benchmark first and review any
required timeout change rather than disabling protections. Do not force a large
run through resource/quota failures.

After commit, an operator can separately authorize `ANALYZE public.airports` and
run the read-only `verify.sql` to obtain actual counts, matching rate, DB/table/
index sizes and timings/plans. Measurements are not claimed before this step.
Refreshes use reviewed new pinned input versions and the same upsert; absent rows
are **not** automatically marked/deleted, because a partial source must never
remove valid reference data. Such retirement handling requires a later reviewed
complete-source comparison.

## Failure and recovery

- Preparation failure: no DB connection exists. Fix inputs/dependencies, use a
  new output directory, and rerun. Do not edit an approved bundle in place.
- Validation/statement failure before commit: the transaction context attempts
  rollback. Fix/quarantine the source issue and regenerate/reapprove the bundle.
- Network loss around COMMIT or receipt-write failure: treat outcome as **unknown**,
  not "zero rows changed". Inspect the catalog/receipt/before-images first. An
  approved retry uses the same stable keys and is idempotent, not a blind duplicate
  insert. Never automatically retry an unknown commit.
- Before-images and new source keys are saved to a private local receipt folder
  before writes. A successful refresh rollback requires a separately reviewed
  restoration plan: compare current rows to detect later edits, restore prior
  snapshots and remove only proven newly inserted keys if explicitly authorized.
  No destructive automatic recovery is supplied. Keep these artifacts in durable,
  access-controlled storage outside an ephemeral Codex workspace before a live run.
- No recovery step should touch flights or other business data.

## Tests (no Supabase)

```sh
/tmp/flightdesk-airport-tools/bin/python -m unittest discover \
  -s scripts/airports -p 'test_*.py' -v
```

Optional isolated PostgreSQL/WASM integration test requires separately installed
`@electric-sql/pglite@0.5.10` outside the app; it is not a website dependency:

```sh
node scripts/airports/check_sample.mjs \
  /ABSOLUTE/PATH/TO/pglite/dist/index.js \
  .airport-data/run-YYYYMMDD /tmp/flightdesk-airport-tools/bin/python
```

It checks the real sample/upsert SQL, repeat imports, stable identity, reviewed
timezone retention, rollback, search ranking/no-code/closed behavior, public
write denials and an untouched business-table sentinel in an ephemeral database.
It does **not** exercise psycopg TLS/COPY against a live Supabase instance.
