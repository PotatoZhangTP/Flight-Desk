import ast
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

import prepare
import import_bundle


def raw_row():
    return dict(id='42', ident='US-0042', name='Test Airfield', type='small_airport',
                latitude_deg='40', longitude_deg='-73', iso_country='US',
                scheduled_service='no', icao_code='', iata_code='', gps_code='KXYZ',
                local_code='42', municipality='Test', iso_region='US-NY')


class PipelineTests(unittest.TestCase):
    def clean(self, raw=None):
        return prepare.clean(raw or raw_row(), {'US': 'United States'}, 'a' * 40)

    def test_no_iata_or_icao_is_valid_and_ident_gps_are_not_icao(self):
        r, _ = self.clean()
        self.assertIsNone(r['iata_code'])
        self.assertIsNone(r['icao_code'])
        self.assertEqual(r['gps_code'], 'KXYZ')
        self.assertEqual(r['ident'], 'US-0042')
        prepare.validate_record(r)

    def test_explicit_icao_is_used_independently(self):
        raw = raw_row()
        raw.update(ident='NOT-ICAO', gps_code='OTHER', icao_code='ZBAA', iata_code='pek')
        r, _ = self.clean(raw)
        self.assertEqual((r['icao_code'], r['iata_code']), ('ZBAA', 'PEK'))

    def test_bad_codes_become_null_with_report_not_fake_codes(self):
        raw = raw_row()
        raw.update(iata_code='A1', icao_code='1234')
        r, notes = self.clean(raw)
        self.assertEqual(len(notes), 2)
        self.assertIsNone(r['iata_code'])
        self.assertIsNone(r['icao_code'])

    def test_closed_records_are_retained_separately(self):
        raw = raw_row()
        raw['type'] = 'closed'
        self.assertEqual(self.clean(raw)[0]['status'], 'closed')

    def test_invalid_coords_are_null_and_never_timezone_guessed(self):
        for value in ('NaN', 'Infinity', '91', ''):
            raw = raw_row()
            raw['latitude_deg'] = value
            r, issues = self.clean(raw)
            self.assertIsNone(r['latitude'])
            self.assertIsNone(r['longitude'])
            self.assertIsNone(r['timezone'])
            self.assertEqual(issues[0]['reason'], 'invalid_coordinates')

    def test_invalid_country_type_identity_and_service_fail(self):
        for key, value in [('iso_country', 'XX'), ('type', 'invented'), ('name', ''),
                           ('id', '-1'), ('scheduled_service', 'perhaps')]:
            raw = raw_row()
            raw[key] = value
            with self.assertRaises(ValueError):
                self.clean(raw)

    def test_record_validation_rejects_extra_fields_invalid_coordinates_and_zones(self):
        base, _ = self.clean()
        for patch in ({'user_id': 'x'}, {'latitude': True}, {'latitude': 999},
                      {'scheduled_service': 'yes'}, {'source_id': True},
                      {'timezone': 'UTC+8', 'timezone_source': 'test'},
                      {'timezone': 'Asia/Shanghai'}, {'status': 'closed'}):
            record = {**base, **patch}
            with self.assertRaises(ValueError):
                prepare.validate_record(record)

    def test_named_zones_include_fractional_offsets_and_rules(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        self.assertEqual(datetime(2026, 1, 1, tzinfo=ZoneInfo('Asia/Kathmandu')).utcoffset().total_seconds(), 20700)
        self.assertEqual(datetime(2026, 1, 1, tzinfo=ZoneInfo('Australia/Adelaide')).utcoffset().total_seconds(), 37800)
        self.assertNotEqual(datetime(2026, 1, 1, tzinfo=ZoneInfo('America/New_York')).utcoffset(),
                            datetime(2026, 7, 1, tzinfo=ZoneInfo('America/New_York')).utcoffset())
        self.assertFalse(prepare.known_zone('Etc/GMT+8'))

    def test_geometry_lookup_rejects_water_edges_and_overlap(self):
        def feature(zone, x1, x2):
            return {'type': 'Feature', 'properties': {'tzid': zone}, 'geometry':
                    {'type': 'Polygon', 'coordinates': [[[x1, 0], [x2, 0], [x2, 2], [x1, 2], [x1, 0]]]}}
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'boundaries.zip'
            with zipfile.ZipFile(path, 'w') as z:
                z.writestr('combined.json', json.dumps({'features': [feature('Asia/Shanghai', 0, 2),
                                                                     feature('Asia/Tokyo', 1, 3)]}))
            lookup = prepare.BoundaryLookup(path)
            self.assertEqual(lookup.lookup(.5, 1), ('Asia/Shanghai', None))
            self.assertEqual(lookup.lookup(1.5, 1), (None, 'boundary_ambiguous'))
            self.assertEqual(lookup.lookup(0, 1), (None, 'boundary_ambiguous'))
            self.assertEqual(lookup.lookup(-1, 1), (None, 'boundary_no_match'))

    def test_input_checksum_mismatch_and_missing_offline_file_fail_closed(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)
            lock = {'inputs': {'airports.csv': {'sha256': '0' * 64}}}
            with self.assertRaises(ValueError):
                prepare.acquire(path, lock, True)
            (path / 'airports.csv').write_text('corrupt')
            with self.assertRaises(ValueError):
                prepare.acquire(path, lock, True)

    def test_target_guard_accepts_only_approved_project_and_verified_tls(self):
        ref = 'abcdefghijklmnopqrst'
        valid = {'host': f'db.{ref}.supabase.co', 'user': 'postgres', 'dbname': 'postgres'}
        import_bundle.check_target(valid, ref, ref)
        import_bundle.check_target({'host': 'aws-0-region.pooler.supabase.com',
                                    'user': 'postgres.' + ref}, ref, ref)
        for info, confirmed in [({**valid, 'host': 'evil.example'}, ref),
                                ({**valid, 'hostaddr': '1.2.3.4'}, ref),
                                ({**valid, 'sslmode': 'disable'}, ref),
                                ({**valid, 'options': '-c search_path=x'}, ref),
                                ({**valid, 'user': 'authenticated'}, ref),
                                (valid, 'different')]:
            with self.assertRaises(ValueError):
                import_bundle.check_target(info, ref, confirmed)

    def test_default_import_review_never_calls_database_function(self):
        argv = ['import_bundle.py', '--bundle', 'unused', '--scope', 'sample',
                '--approve-manifest-sha256', 'hash']
        with patch('sys.argv', argv), patch.object(import_bundle, 'load_bundle', return_value=([{}], {})), \
             patch.object(import_bundle, 'apply_bundle', side_effect=AssertionError('DB called')):
            import_bundle.main()

    def test_preparation_has_no_db_driver_or_importer_dependency(self):
        tree = ast.parse(Path(prepare.__file__).read_text())
        names = [node.module for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)]
        names += [alias.name for node in ast.walk(tree) if isinstance(node, ast.Import) for alias in node.names]
        self.assertFalse(any(n and ('psycopg' in n or 'import_bundle' in n) for n in names))

    def test_bundle_hash_gate_prevents_any_connection_on_tampering(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / 'manifest.json').write_text('{}')
            with self.assertRaises(ValueError):
                import_bundle.load_bundle(Path(d), 'sample', '0' * 64)

    def test_upsert_is_restricted_to_airports_and_is_change_aware(self):
        sql = import_bundle.upsert_sql()
        self.assertIn('on conflict (source, source_id)', sql)
        self.assertIn('is distinct from', sql)
        for forbidden in ('flights', 'profiles', 'roadmap_items', 'site_content', 'delete', 'truncate'):
            self.assertNotIn(forbidden, sql.lower())

    def test_operator_transaction_flow_and_failed_upsert_recovery_without_network(self):
        # Exercise Python operator control flow using a fake driver connection only.
        # Real SQL/constraints/rollback are covered by the separate PGlite test.
        from unittest.mock import MagicMock
        ref = 'abcdefghijklmnopqrst'
        row, _ = self.clean()
        for fail in (False, True):
            with self.subTest(failed_upsert=fail), tempfile.TemporaryDirectory() as d:
                root = Path(d)
                cert = root / 'test-ca'
                cert.write_text('mocked only; never used for TLS')
                executed = []
                conn, cursor, copy = MagicMock(), MagicMock(), MagicMock()
                conn.__enter__.return_value = conn
                conn.cursor.return_value.__enter__.return_value = cursor
                cursor.copy.return_value.__enter__.return_value = copy
                def execute(sql, params=None):
                    executed.append(sql)
                    if sql.startswith('select pg_try_advisory'):
                        cursor.fetchone.return_value = {'acquired': True}
                    elif sql.startswith('select current_user'):
                        cursor.fetchone.return_value = {'role': 'postgres'}
                    elif sql.startswith('select relrowsecurity'):
                        cursor.fetchone.return_value = {'relrowsecurity': True}
                    elif sql.startswith('select count(*)'):
                        cursor.fetchone.return_value = {'n': 1}
                    elif sql.startswith('select row_to_json'):
                        cursor.fetchall.return_value = []
                    elif sql.startswith('select * from public.search_airports'):
                        cursor.fetchall.return_value = [{'iata_code': params[0]}]
                    elif sql.startswith('insert into public.airports') and fail:
                        raise RuntimeError('simulated SQL failure')
                cursor.execute.side_effect = execute
                cursor.rowcount = 1
                env = {'AIRPORT_IMPORT_DATABASE_URL': f'host=db.{ref}.supabase.co user=postgres dbname=postgres',
                       'AIRPORT_IMPORT_SSLROOTCERT': str(cert)}
                receipts = root / 'receipt'
                with patch.dict('os.environ', env), patch('psycopg.connect', return_value=conn) as connect:
                    if fail:
                        with self.assertRaises(RuntimeError):
                            import_bundle.apply_bundle([row], ref, ref, receipts, 'approved-hash')
                        self.assertFalse((receipts / 'receipt.json').exists())
                        self.assertIsNotNone(conn.__exit__.call_args.args[0])
                    else:
                        result = import_bundle.apply_bundle([row], ref, ref, receipts, 'approved-hash')
                        self.assertEqual(result['status'], 'committed')
                        self.assertIsNone(conn.__exit__.call_args.args[0])
                    self.assertEqual(connect.call_args.kwargs['sslmode'], 'verify-full')
                self.assertTrue((receipts / 'before-images.json').exists())
                self.assertEqual((receipts / 'before-images.json').stat().st_mode & 0o777, 0o600)
                copy.write_row.assert_called_once()
                self.assertEqual(sum(sql.startswith('insert into public.airports') for sql in executed), 1)
                self.assertFalse(any('delete ' in sql.lower() or 'truncate ' in sql.lower() for sql in executed))


if __name__ == '__main__':
    unittest.main()
