#!/usr/bin/env python3
"""Review an airport bundle; writes require --apply plus explicit project/hash approval."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
import time

from prepare import COLUMNS, EXPECTED, sha256, validate_record, write_json


def load_bundle(bundle, scope, approved_hash, allow_issues=False):
    manifest_path = bundle / 'manifest.json'
    if not approved_hash or sha256(manifest_path) != approved_hash:
        raise ValueError('Manifest approval hash mismatch')
    manifest = json.loads(manifest_path.read_text())
    if manifest['format_version'] != 1 or manifest['scope'] != 'complete-source-snapshot':
        raise ValueError('Unrecognized bundle format')
    from importlib.metadata import version
    if manifest['packages']['tzdata'] != version('tzdata'):
        raise ValueError('Timezone rule package differs from the reviewed bundle')
    for name in ('airports.jsonl', 'sample.jsonl', 'issues.jsonl', 'report.json', 'NOTICE.md', 'airports.csv'):
        if sha256(bundle / name) != manifest['files'][name]:
            raise ValueError('Bundle checksum mismatch: ' + name)
    report = json.loads((bundle / 'report.json').read_text())
    if report['quarantined'] or report['issue_counts'] or any(report['duplicate_codes'].values()):
        if not allow_issues:
            raise ValueError('Review issues.jsonl and duplicate codes, then explicitly --ack-reviewed-issues')
    filename = 'sample.jsonl' if scope == 'sample' else 'airports.jsonl'
    rows = [json.loads(line) for line in (bundle / filename).read_text().splitlines() if line]
    if not rows or (scope == 'sample' and len(rows) > 50):
        raise ValueError('Empty dataset or excessive sample size')
    if len(rows) != (report['sample_count'] if scope == 'sample' else report['valid']['records']):
        raise ValueError('Bundle row count mismatch')
    seen = set()
    for row in rows:
        validate_record(row)
        if row['source_version'] != manifest['sources']['ourairports_revision']:
            raise ValueError('Source revision mismatch')
        key = (row['source'], row['source_id'])
        if key in seen:
            raise ValueError('Duplicate source identity')
        seen.add(key)
    for code, (icao, country, zone) in EXPECTED.items():
        hits = [r for r in rows if r['iata_code'] == code and r['status'] == 'listed']
        if len(hits) != 1 or (hits[0]['icao_code'], hits[0]['country_code'], hits[0]['timezone']) != (icao, country, zone):
            raise ValueError('Reference airport verification failed')
    return rows, manifest


def check_target(info, expected, confirmed):
    if not re.fullmatch('[a-z0-9]{10,40}', expected or '') or expected != confirmed:
        raise ValueError('Explicit expected project reference and confirmation required')
    # Direct and Supabase session-pooler DSNs only. Never accept a public key as a DSN.
    host, user = info.get('host', ''), info.get('user', '')
    direct = host == f'db.{expected}.supabase.co' and user == 'postgres'
    pooler = host.endswith('.pooler.supabase.com') and user == f'postgres.{expected}'
    if not (direct or pooler) or ',' in host or info.get('hostaddr'):
        raise ValueError('Database connection does not identify the approved Supabase project')
    if info.get('dbname', 'postgres') != 'postgres':
        raise ValueError('Unexpected database name')
    if info.get('service') or info.get('options') or info.get('sslmode', 'verify-full') != 'verify-full':
        raise ValueError('Unsafe database connection options')


def upsert_sql():
    # Hardcoded identifiers only. No table, column or predicate can come from a bundle.
    columns = ', '.join(COLUMNS)
    mutable = [c for c in COLUMNS if c not in ('source', 'source_id')]
    def incoming(c):
        if c in ('timezone', 'timezone_source'):
            return f"case when target.timezone_source like 'reviewed:%' and coalesce(excluded.timezone_source, '') not like 'reviewed:%' then target.{c} else excluded.{c} end"
        return f'excluded.{c}'
    assignments = ', '.join(f'{c} = {incoming(c)}' for c in mutable)
    old = ', '.join(f'target.{c}' for c in mutable)
    new = ', '.join(incoming(c) for c in mutable)
    return f'''insert into public.airports as target ({columns})
        select {columns} from airport_import_stage
        on conflict (source, source_id) do update set {assignments}, imported_at = now()
        where row({old}) is distinct from row({new})'''


def apply_bundle(rows, project_ref, confirmed, receipt_dir, manifest_hash):
    # This function is unreachable from preparation and from the default review mode.
    import psycopg
    from psycopg.conninfo import conninfo_to_dict
    from psycopg.rows import dict_row
    dsn = os.environ.get('AIRPORT_IMPORT_DATABASE_URL', '')
    if not dsn:
        raise ValueError('AIRPORT_IMPORT_DATABASE_URL is absent')
    check_target(conninfo_to_dict(dsn), project_ref, confirmed)
    cert = Path(os.environ.get('AIRPORT_IMPORT_SSLROOTCERT', ''))
    if not cert.is_file():
        raise ValueError('AIRPORT_IMPORT_SSLROOTCERT must identify the trusted CA certificate file')
    receipt_dir.mkdir(parents=True, exist_ok=False, mode=0o700)
    started = time.perf_counter()
    with psycopg.connect(dsn, sslmode='verify-full', sslrootcert=str(cert),
                         connect_timeout=10, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("set local statement_timeout = '120s'")
            cur.execute("set local lock_timeout = '5s'")
            cur.execute('select pg_try_advisory_xact_lock(864210315) as acquired')
            if not cur.fetchone()['acquired']:
                raise ValueError('Another importer is active')
            cur.execute('select current_user as role')
            if cur.fetchone()['role'] != 'postgres':
                raise ValueError('Import requires the explicitly authorized postgres role')
            cur.execute("select relrowsecurity from pg_class where oid = 'public.airports'::regclass")
            if not cur.fetchone()['relrowsecurity']:
                raise ValueError('Expected airports RLS is not enabled')
            cur.execute("select count(*) as n from pg_trigger where tgrelid = 'public.airports'::regclass and tgname = 'airports_validate_and_timestamp' and tgenabled <> 'D'")
            if cur.fetchone()['n'] != 1:
                raise ValueError('Expected airport validation trigger is not enabled')
            # Empty temporary staging table; no schema changes in public.
            columns = ', '.join(COLUMNS)
            cur.execute(f'create temporary table airport_import_stage on commit drop as select {columns} from public.airports with no data')
            with cur.copy(f'copy airport_import_stage ({columns}) from stdin') as copy:
                for row in rows:
                    copy.write_row([row[c] for c in COLUMNS])
            cur.execute('''select row_to_json(a) as previous from public.airports a
                           join airport_import_stage s using(source, source_id)''')
            previous = [r['previous'] for r in cur.fetchall()]
            old_keys = {(r['source'], r['source_id']) for r in previous}
            recovery = {'project_ref': project_ref, 'manifest_sha256': manifest_hash,
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'previous_rows': previous,
                        'new_keys': [[r['source'], r['source_id']] for r in rows
                                     if (r['source'], r['source_id']) not in old_keys]}
            # Durable before-images BEFORE catalog changes. Contains no DSN/password.
            backup = receipt_dir / 'before-images.json'
            with open(backup, 'x', encoding='utf-8') as f:
                os.chmod(backup, 0o600)
                json.dump(recovery, f, ensure_ascii=False)
                f.flush()
                os.fsync(f.fileno())
            cur.execute(upsert_sql())
            changed = cur.rowcount
            # Search smoke checks are inside the same transaction: failures roll back.
            for code in EXPECTED:
                cur.execute('select * from public.search_airports(%s, 12)', (code,))
                hits = cur.fetchall()
                if not hits or hits[0]['iata_code'] != code:
                    raise ValueError('Post-import exact-code search verification failed')
            cur.execute('''select count(*) as n from public.airports a
                           join airport_import_stage s using(source, source_id)''')
            if cur.fetchone()['n'] != len(rows):
                raise ValueError('Post-import source identity count mismatch')
        # One atomic commit for the entire selected scope, not partial batch commits.
    receipt = {'status': 'committed', 'project_ref': project_ref,
               'manifest_sha256': manifest_hash, 'selected_rows': len(rows),
               'changed_rows': changed, 'elapsed_seconds': round(time.perf_counter() - started, 3)}
    write_json(receipt_dir / 'receipt.json', receipt)
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', required=True, type=Path)
    parser.add_argument('--scope', required=True, choices=['sample', 'global'])
    parser.add_argument('--approve-manifest-sha256', required=True)
    parser.add_argument('--ack-reviewed-issues', action='store_true')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--confirm-project-ref')
    parser.add_argument('--receipt-dir', type=Path)
    args = parser.parse_args()
    from zoneinfo import reset_tzpath, ZoneInfo
    reset_tzpath(())
    ZoneInfo.clear_cache()
    rows, _ = load_bundle(args.bundle, args.scope, args.approve_manifest_sha256,
                          args.ack_reviewed_issues)
    if not args.apply:
        print(json.dumps({'mode': 'review-only', 'database_connections': 0,
                          'selected_rows': len(rows), 'scope': args.scope}))
        return
    if not args.receipt_dir:
        raise ValueError('Explicit new receipt directory required')
    result = apply_bundle(rows, os.environ.get('AIRPORT_IMPORT_EXPECTED_PROJECT_REF'),
                          args.confirm_project_ref, args.receipt_dir,
                          args.approve_manifest_sha256)
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        # Never print psycopg exception text, traceback or connection parameters.
        print(json.dumps({'status': 'not_confirmed', 'error_type': type(exc).__name__,
                          'sqlstate': getattr(exc, 'sqlstate', None),
                          'message': 'Stopped. Check local validation/receipt; no automatic retry. Credentials are not logged.'}),
              file=sys.stderr)
        sys.exit(1)
