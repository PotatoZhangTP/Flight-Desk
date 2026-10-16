const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const intl = require('next-intl');
function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const module = {exports: {}};
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})')(name => { assert(name in deps, 'Unexpected dependency ' + name); return deps[name]; }, module, module.exports);
  return module.exports;
}
const catalog = load('lib/i18n/catalog.ts');
const validation = load('lib/i18n/validation.ts', {'next-intl': intl, './catalog': catalog});
test('base catalogs have unique semantic keys and valid English/Chinese messages', () => {
  assert.equal(new Set(catalog.catalog.map(row => row.key)).size, catalog.catalog.length);
  assert(catalog.catalog.length > 300);
  for (const locale of ['en', 'zh-CN']) {
    const messages = catalog.baseMessages(locale);
    const t = intl.createTranslator({locale, messages, onError: error => { throw error; }});
    for (const row of catalog.catalog) {
      const args = Object.fromEntries([...row.en.matchAll(/\{(\w+)\}/g)].map(match => [match[1], 2]));
      assert.equal(typeof t(row.key.replaceAll('.', '__'), args), 'string', row.key);
    }
  }
  assert.equal(catalog.normalizeLocale('zh-CN'), 'zh-CN');
  assert.equal(catalog.normalizeLocale('unsupported'), 'en');
});
test('custom messages reject unknown keys, HTML, blank/oversized and malformed ICU text', () => {
  assert(validation.validTranslation('common.save', '保存更改'));
  for (const value of ['', ' ', '<script>alert(1)</script>', '{broken', '{newArgument}', 'x'.repeat(4001), null]) assert.equal(validation.validTranslation('common.save', value), false, String(value));
  assert.equal(validation.validTranslation('unknown.key', '测试'), false);
  assert.equal(validation.validTranslation('__proto__', '测试'), false);
  assert.equal(validation.validTranslation('constructor', '测试'), false);
});
test('translation actions fail closed before any writes for non-administrators or invalid messages', async () => {
  let writes = 0;
  let admin = false;
  const actions = load('app/admin/translations/actions.ts', {
    'node:crypto': require('node:crypto'), '@/lib/i18n/catalog': catalog, '@/lib/i18n/validation': validation,
    '@/lib/admin/server': {siteAdminAccess: async () => ({user: {id: 'fixture'}, isAdmin: admin, supabase: {from: () => {writes++; throw Error('Unexpected write');}}})},
  });
  assert.equal((await actions.changeTranslation({key: 'common.save', text: '保存', version: null, updatedAt: null, reset: false})).error, 'admin.denied');
  admin = true;
  assert.equal((await actions.changeTranslation({key: 'common.save', text: '<b>保存</b>', version: null, updatedAt: null, reset: false})).error, 'translations.invalid');
  assert.equal(writes, 0);
});
test('review migrations are isolated and retain existing permissions', () => {
  const sql = fs.readFileSync('supabase/migrations/20261016000100_create_translation_overrides.sql', 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /public\.is_site_admin\(\)/);
  assert.match(sql, /primary key \(locale, translation_key\)/);
  assert.doesNotMatch(sql, /service_role|alter table public\.(flights|airports|profiles|site_content|roadmap_items)/i);
  const preference = fs.readFileSync('supabase/migrations/20261016000200_add_profile_preferred_locale.sql', 'utf8');
  assert.match(preference, /add column preferred_locale/);
  assert.doesNotMatch(preference, /create policy|grant |update public|alter.*auth\.users/i);
});

test('missing Chinese defaults fall back to English rather than translation keys', () => {
  const entry = catalog.catalog.find(row => row.key === 'common.save');
  const previous = entry.zh;
  try { entry.zh = ''; assert.equal(catalog.baseMessages('zh-CN').common__save, entry.en); }
  finally { entry.zh = previous; }
});

test('admin mutation scopes writes, handles duplicate/stale rows, and resets only one key', async () => {
  const writes = [], filters = [];
  let affected = [{translation_key: 'common.save'}], insertError = null;
  const query = {eq: (key, value) => {filters.push([key, value]); return query;}, select: async () => ({data: affected, error: null})};
  const actions = load('app/admin/translations/actions.ts', {
    'node:crypto': require('node:crypto'), '@/lib/i18n/catalog': catalog, '@/lib/i18n/validation': validation,
    '@/lib/admin/server': {siteAdminAccess: async () => ({user: {id: 'fixture'}, isAdmin: true, supabase: {from: table => {
      assert.equal(table, 'translation_overrides');
      return {
        insert: row => {writes.push(['insert', row]); return {select: () => ({single: async () => ({error: insertError})})};},
        update: row => {writes.push(['update', row]); return query;},
        delete: () => {writes.push(['delete']); return query;},
      };
    }}})},
  });
  const input = {key: 'common.save', text: '保存更改', reset: false, version: null, updatedAt: null};
  assert.equal((await actions.changeTranslation(input)).error, null);
  assert.equal(writes[0][1].locale, 'zh-CN');
  assert.match(writes[0][1].source_hash, /^[a-f0-9]{64}$/);
  insertError = {code: '23505'};
  assert.equal((await actions.changeTranslation(input)).error, 'translations.conflict');
  input.version = 2; input.updatedAt = '2026-10-16T00:00:00Z';
  assert.equal((await actions.changeTranslation(input)).error, null);
  assert.deepEqual(filters.slice(-4), [['locale', 'zh-CN'], ['translation_key', 'common.save'], ['version', 2], ['updated_at', input.updatedAt]]);
  affected = [];
  assert.equal((await actions.changeTranslation(input)).error, 'translations.conflict');
  affected = [{translation_key: 'common.save'}]; input.reset = true;
  assert.equal((await actions.changeTranslation(input)).error, null);
  assert.equal(writes.at(-1)[0], 'delete');
});
