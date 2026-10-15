#!/usr/bin/env python3
"""Offline-first airport bundle builder. Never imports a database driver."""
import argparse
from collections import Counter
import csv
from datetime import datetime, timezone
import hashlib
from importlib import metadata
import json
import math
from pathlib import Path
import re
import shutil
import sys
import urllib.request
import zipfile
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

HERE = Path(__file__).resolve().parent
COLUMNS = (
    'source', 'source_id', 'source_version', 'ident', 'name', 'icao_code',
    'iata_code', 'gps_code', 'local_code', 'municipality', 'country_code',
    'country_name', 'region_code', 'timezone', 'timezone_source', 'latitude',
    'longitude', 'airport_type', 'scheduled_service', 'status',
)
TYPES = {'large_airport', 'medium_airport', 'small_airport', 'heliport',
         'seaplane_base', 'balloonport', 'closed'}
EXPECTED = {'PEK': ('ZBAA', 'CN', 'Asia/Shanghai'),
            'PKX': ('ZBAD', 'CN', 'Asia/Shanghai'),
            'JFK': ('KJFK', 'US', 'America/New_York'),
            'LHR': ('EGLL', 'GB', 'Europe/London'),
            'HND': ('RJTT', 'JP', 'Asia/Tokyo'),
            'LAX': ('KLAX', 'US', 'America/Los_Angeles'),
            'KTM': ('VNKT', 'NP', 'Asia/Kathmandu'),
            'ADL': ('YPAD', 'AU', 'Australia/Adelaide')}


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def write_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def write_jsonl(path, rows):
    with open(path, 'w', encoding='utf-8') as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False, allow_nan=False) + '\n')


def acquire(cache, lock, offline):
    cache.mkdir(parents=True, exist_ok=True)
    for filename, spec in lock['inputs'].items():
        path = cache / filename
        if not path.exists():
            if offline:
                raise ValueError(f'Missing offline input: {filename}')
            # Only version-pinned URLs from the checked-in lock; no credentials.
            if not spec['url'].startswith(('https://raw.githubusercontent.com/',
                                           'https://github.com/evansiroky/')):
                raise ValueError('Unapproved source host')
            partial = path.with_suffix(path.suffix + '.partial')
            request = urllib.request.Request(spec['url'], headers={'User-Agent': 'FlightDesk-AirportPrep/1'})
            with urllib.request.urlopen(request, timeout=180) as response, open(partial, 'wb') as f:
                shutil.copyfileobj(response, f)
            partial.replace(path)
        if sha256(path) != spec['sha256']:
            raise ValueError(f'Input checksum mismatch: {filename}; do not use this input')


def known_zone(name):
    if not name or '/' not in name or name.startswith(('posix/', 'right/', 'Etc/GMT')):
        return False
    try:
        ZoneInfo(name)
        return True
    except (ZoneInfoNotFoundError, ValueError):
        return False


class BoundaryLookup:
    def __init__(self, path):
        from shapely import prepare
        from shapely.geometry import shape
        from shapely.strtree import STRtree
        # Read a known member in place, never extract archive paths to disk.
        with zipfile.ZipFile(path) as z:
            entry = z.getinfo('combined.json')
            if entry.file_size > 512 * 1024 * 1024:
                raise ValueError('Unexpected boundary archive size')
            with z.open(entry) as f:
                data = json.load(f)
        self.zones, self.geometries = [], []
        for feature in data['features']:
            zone = feature['properties']['tzid']
            geometry = shape(feature['geometry'])
            if geometry.is_empty or not geometry.is_valid:
                raise ValueError('Invalid input boundary geometry')
            prepare(geometry)
            self.zones.append(zone)
            self.geometries.append(geometry)
        self.tree = STRtree(self.geometries)

    def lookup(self, longitude, latitude):
        from shapely.geometry import Point
        point = Point(longitude, latitude)
        hits, edge = set(), False
        for index in self.tree.query(point):
            geometry = self.geometries[index]
            if geometry.covers(point):
                hits.add(self.zones[index])
                edge |= not geometry.contains(point)
        if len(hits) != 1 or edge:
            return None, 'boundary_ambiguous' if hits else 'boundary_no_match'
        zone = next(iter(hits))
        return (zone, None) if known_zone(zone) else (None, 'unsupported_zone')


def clean(raw, countries, revision):
    issues = []
    source_id = int(raw['id'])
    if source_id <= 0 or not raw['ident'].strip() or not raw['name'].strip():
        raise ValueError('missing_identity_or_name')
    airport_type = raw['type'].strip()
    if airport_type not in TYPES:
        raise ValueError('unknown_airport_type')
    country = raw['iso_country'].strip().upper()
    if not re.fullmatch('[A-Z]{2}', country) or country not in countries:
        raise ValueError('unknown_country')
    service = raw['scheduled_service'].strip()
    if service not in ('yes', 'no'):
        raise ValueError('invalid_scheduled_service')
    def code(field, pattern):
        value = raw.get(field, '').strip().upper() or None
        if value and not re.fullmatch(pattern, value):
            issues.append({'reason': 'invalid_' + field, 'value': value})
            return None
        return value
    try:
        lat, lon = float(raw['latitude_deg']), float(raw['longitude_deg'])
        if not math.isfinite(lat) or not math.isfinite(lon) or not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError()
    except (ValueError, TypeError):
        lat = lon = None
        issues.append({'reason': 'invalid_coordinates'})
    row = dict(source='ourairports', source_id=source_id, source_version=revision,
               ident=raw['ident'].strip(), name=raw['name'].strip(),
               icao_code=code('icao_code', '[A-Z]{4}'),
               iata_code=code('iata_code', '[A-Z]{3}'),
               gps_code=raw.get('gps_code', '').strip() or None,
               local_code=raw.get('local_code', '').strip() or None,
               municipality=raw.get('municipality', '').strip() or None,
               country_code=country, country_name=countries[country],
               region_code=raw.get('iso_region', '').strip() or None,
               timezone=None, timezone_source=None, latitude=lat, longitude=lon,
               airport_type=airport_type, scheduled_service=service == 'yes',
               status='closed' if airport_type == 'closed' else 'listed')
    return row, issues


def validate_record(row):
    if set(row) != set(COLUMNS) or row['source'] != 'ourairports':
        raise ValueError('Unexpected record schema/source')
    if type(row['source_id']) is not int or row['source_id'] <= 0:
        raise ValueError('Invalid source_id')
    if not isinstance(row['source_version'], str) or not re.fullmatch('[0-9a-f]{40}', row['source_version']):
        raise ValueError('Invalid pinned source revision')
    for field in COLUMNS:
        if field not in ('source_id', 'latitude', 'longitude', 'scheduled_service'):
            if row[field] is not None and (not isinstance(row[field], str) or len(row[field]) > 10000):
                raise ValueError('Invalid text field')
    if not row['ident'] or not row['name'] or row['airport_type'] not in TYPES:
        raise ValueError('Invalid airport identity/type')
    for field, pattern in [('icao_code', '[A-Z]{4}'), ('iata_code', '[A-Z]{3}'), ('country_code', '[A-Z]{2}')]:
        if row[field] is not None and not re.fullmatch(pattern, row[field]):
            raise ValueError('Invalid code')
    if type(row['scheduled_service']) is not bool:
        raise ValueError('Invalid service flag')
    if row['status'] != ('closed' if row['airport_type'] == 'closed' else 'listed'):
        raise ValueError('Invalid source status')
    lat, lon = row['latitude'], row['longitude']
    if (lat is None) != (lon is None):
        raise ValueError('Incomplete coordinates')
    if lat is not None and (type(lat) not in (float, int) or type(lon) not in (float, int)
                            or not math.isfinite(lat) or not math.isfinite(lon)
                            or not (-90 <= lat <= 90 and -180 <= lon <= 180)):
        raise ValueError('Invalid coordinates')
    if row['timezone'] is not None and (not known_zone(row['timezone']) or not row['timezone_source']):
        raise ValueError('Invalid timezone/provenance')


def sample_rows(rows, size=24):
    selected = [r for r in rows if r['iata_code'] in EXPECTED and r['status'] == 'listed']
    if len(selected) != len(EXPECTED):
        raise ValueError('Missing or duplicate required sample airport')
    for r in selected:
        icao, country, zone = EXPECTED[r['iata_code']]
        if (r['icao_code'], r['country_code'], r['timezone']) != (icao, country, zone):
            raise ValueError('Required sample airport failed reference checks')
    ids = {r['source_id'] for r in selected}
    for kind in ('small_airport', 'heliport', 'medium_airport', 'seaplane_base', 'balloonport', 'closed'):
        candidates = [r for r in rows if r['airport_type'] == kind
                      and not r['iata_code'] and r['source_id'] not in ids]
        for r in candidates[:3]:
            selected.append(r)
            ids.add(r['source_id'])
    if not any(r['airport_type'] == 'small_airport' and not r['iata_code'] for r in selected):
        raise ValueError('No code-less small airport in sample')
    return selected[:size]


def build(cache, output, lock, offline=False):
    if output.exists():
        raise ValueError('Output directory already exists; use a new run directory')
    acquire(cache, lock, offline)
    print('Loading verified comprehensive land boundaries…', flush=True)
    lookup = BoundaryLookup(cache / 'timezones.geojson.zip')
    with open(cache / 'countries.csv', newline='', encoding='utf-8-sig') as f:
        countries = {r['code']: r['name'] for r in csv.DictReader(f)}
    rows, issues, seen, total = [], [], set(), 0
    with open(cache / 'airports.csv', newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        required = {'id', 'ident', 'name', 'icao_code', 'iata_code', 'gps_code', 'type',
                    'latitude_deg', 'longitude_deg', 'iso_country', 'scheduled_service'}
        if not required <= set(reader.fieldnames or []):
            raise ValueError('Source CSV header changed')
        for raw in reader:
            total += 1
            try:
                row, notes = clean(raw, countries, lock['ourairports_revision'])
                if row['source_id'] in seen:
                    raise ValueError('Duplicate stable source_id; abort entire snapshot')
                seen.add(row['source_id'])
            except (ValueError, KeyError) as e:
                if 'Duplicate' in str(e):
                    raise
                issues.append({'source_id': raw.get('id'), 'severity': 'quarantine', 'reason': str(e)})
                continue
            for note in notes:
                issues.append({'source_id': row['source_id'], 'severity': 'warning', **note})
            if row['latitude'] is not None:
                zone, reason = lookup.lookup(row['longitude'], row['latitude'])
                if zone:
                    row['timezone'] = zone
                    row['timezone_source'] = 'timezone-boundary-builder:' + lock['boundary_release'] + ':comprehensive-land:point-in-polygon'
                else:
                    issues.append({'source_id': row['source_id'], 'severity': 'warning', 'reason': reason})
            validate_record(row)
            rows.append(row)
    duplicate_codes = {}
    for field in ('iata_code', 'icao_code', 'gps_code', 'ident'):
        counts = Counter(r[field] for r in rows if r[field])
        duplicate_codes[field] = {k: v for k, v in counts.items() if v > 1}
    active = [r for r in rows if r['status'] == 'listed']
    def stats(group):
        matched = sum(r['timezone'] is not None for r in group)
        return {'records': len(group), 'missing_iata': sum(r['iata_code'] is None for r in group),
                'missing_icao': sum(r['icao_code'] is None for r in group),
                'timezone_matched': matched, 'timezone_unresolved': len(group) - matched,
                'timezone_match_percent': round(100 * matched / len(group), 4) if group else 0}
    sample = sample_rows(rows)
    import tzdata
    report = {'mode': 'dry-run', 'database_connections': 0, 'database_writes': 0,
              'source_total': total, 'valid': stats(rows), 'listed': stats(active),
              'closed': len(rows) - len(active), 'quarantined': total - len(rows),
              'airport_types': dict(Counter(r['airport_type'] for r in rows)),
              'issue_counts': dict(Counter(i['reason'] for i in issues)),
              'duplicate_codes': duplicate_codes, 'sample_count': len(sample),
              'reference_checks': {r['iata_code']: {'ident': r['ident'], 'timezone': r['timezone'],
                                   'latitude': r['latitude'], 'longitude': r['longitude']}
                                   for r in sample if r['iata_code'] in EXPECTED}}
    output.mkdir(parents=True)
    write_jsonl(output / 'airports.jsonl', rows)
    write_jsonl(output / 'sample.jsonl', sample)
    write_jsonl(output / 'issues.jsonl', issues)
    with open(output / 'airports.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    write_json(output / 'report.json', report)
    shutil.copyfile(HERE / 'NOTICE.md', output / 'NOTICE.md')
    manifest = {'format_version': 1, 'created_at': datetime.now(timezone.utc).isoformat(),
                'scope': 'complete-source-snapshot', 'sources': lock,
                'python': sys.version.split()[0],
                'packages': {p: metadata.version(p) for p in ('shapely', 'numpy', 'tzdata')},
                'iana_version': tzdata.IANA_VERSION,
                'script_sha256': sha256(Path(__file__)),
                'files': {n: sha256(output / n) for n in ('airports.jsonl', 'sample.jsonl',
                          'airports.csv', 'issues.jsonl', 'report.json', 'NOTICE.md')}}
    write_json(output / 'manifest.json', manifest)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print('Manifest SHA-256:', sha256(output / 'manifest.json'))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=Path('.airport-data/cache'))
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    # Force the pinned tzdata package, not the host OS timezone rule version.
    from zoneinfo import reset_tzpath
    reset_tzpath(())
    ZoneInfo.clear_cache()
    lock = json.loads((HERE / 'sources.lock.json').read_text())
    build(args.cache, args.output, lock, args.offline)


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        # Source errors contain no DB credentials; do not dump request headers.
        print('Preparation failed:', type(exc).__name__, str(exc), file=sys.stderr)
        sys.exit(1)
