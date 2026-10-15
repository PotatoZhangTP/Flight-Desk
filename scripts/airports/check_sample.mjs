// Optional isolated PostgreSQL/WASM integration test. No network or Supabase.
// Engine is an explicitly supplied local @electric-sql/pglite module path.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [enginePath, bundlePath, pythonPath] = process.argv.slice(2);
if (!enginePath || !bundlePath || !pythonPath) throw new Error('Usage: node check_sample.mjs ENGINE_MODULE BUNDLE PYTHON');
const { PGlite } = await import(pathToFileURL(resolve(enginePath)).href);
const db = new PGlite();
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec("create table public.flights(sentinel text); insert into public.flights values('untouched');");
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261015000400_create_airport_reference_catalog.sql', import.meta.url), 'utf8'));
  const records = readFileSync(resolve(bundlePath, 'sample.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const code = 'import sys; sys.path.insert(0,"scripts/airports"); from import_bundle import upsert_sql; print(upsert_sql())';
  const upsert = execFileSync(pythonPath, ['-c', code], { encoding: 'utf8' });
  const columns = Object.keys(records[0]);
  await db.exec(`create temporary table airport_import_stage as select ${columns.join(',')} from public.airports with no data`);
  for (const row of records) {
    await db.query(`insert into airport_import_stage (${columns.join(',')}) values (${columns.map((_, i) => '$' + (i + 1)).join(',')})`, columns.map(c => row[c]));
  }
  const first = await db.query(upsert);
  assert.equal(first.affectedRows, records.length);
  const identities = (await db.query('select id,source_id from public.airports order by source_id')).rows;
  const repeat = await db.query(upsert);
  assert.equal(repeat.affectedRows, 0, 'unchanged repeat import must perform no row updates');
  assert.deepEqual((await db.query('select id,source_id from public.airports order by source_id')).rows, identities);
  await db.exec("update public.airports set timezone_source='reviewed:local-test' where iata_code='JFK'");
  assert.equal((await db.query(upsert)).affectedRows, 0, 'routine refresh must preserve reviewed timezone provenance');
  assert.equal((await db.query("select timezone_source from public.airports where iata_code='JFK'")).rows[0].timezone_source, 'reviewed:local-test');
  await db.exec("update airport_import_stage set name='Reviewed revised name' where iata_code='PEK'");
  assert.equal((await db.query(upsert)).affectedRows, 1);
  assert.deepEqual((await db.query('select id,source_id from public.airports order by source_id')).rows, identities);
  await db.exec("update airport_import_stage set name='Invalid staged row',timezone='INVALID/ZONE' where iata_code='PEK'");
  await db.exec('begin');
  await assert.rejects(db.exec(upsert));
  await db.exec('rollback');
  assert.equal((await db.query("select name from public.airports where iata_code='PEK'")).rows[0].name, 'Reviewed revised name');
  const timings = {};
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    for (const code of ['PEK','PKX','JFK','LHR','HND','LAX','KTM','ADL']) {
      const start = performance.now();
      const result = await db.query('select * from public.search_airports($1,12)', [code]);
      assert.equal(result.rows[0].iata_code, code);
      timings[`${role}:${code}`] = +(performance.now() - start).toFixed(2);
    }
    const noIata = records.find(r => r.airport_type === 'small_airport' && !r.iata_code);
    const found = await db.query('select * from public.search_airports($1,20)', [noIata.ident]);
    assert(found.rows.some(r => r.ident === noIata.ident));
    for (const row of records.filter(r => r.status === 'closed')) {
      assert(!(await db.query('select * from public.search_airports($1,20)', [row.ident])).rows.some(r => r.ident === row.ident));
    }
    await assert.rejects(db.exec("update public.airports set name='denied'"));
    await assert.rejects(db.exec('delete from public.airports'));
    await assert.rejects(db.exec("insert into public.airports(source_id,ident,name,airport_type) values(999999,'X','X','small_airport')"));
    await db.exec('reset role');
  }
  assert.deepEqual((await db.query('select * from public.flights')).rows, [{ sentinel: 'untouched' }]);
  console.log(JSON.stringify({ status:'passed', engine:'isolated PGlite', rows:records.length,
    checks:['repeat upsert','stable identities','reviewed timezone preservation','one-row update','invalid batch rollback','exact-code ranking','no-IATA search','closed exclusion','public read/write denials','business sentinel unchanged'],
    sampleQueryMs:timings }, null, 2));
} finally { await db.close(); }
