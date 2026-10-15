const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Test the actual domain functions and Server Actions with isolated dependencies.
// No network calls, real user credentials or database writes are made.
function loadModule(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  const execute = vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file });
  execute(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}
const model = loadModule('lib/roadmap/model.ts');
function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({title:'Flight map', description:'Routes', category:'Maps', status:'planned', publication_status:'draft', priority:'', target_date:'', completed_date:'', ...overrides})) data.set(key, value);
  return data;
}
function setup(user, isAdmin, dbFailure = false) {
  const calls = []; const invalidated = [];
  const query = {
    insert(input) { calls.push(['insert', input]); return this; },
    update(input) { calls.push(['update', input]); return this; },
    delete() { calls.push(['delete']); return this; },
    eq(field, value) { calls.push(['eq', field, value]); return this; },
    select() { return this; },
    async single() { return dbFailure ? {data:null,error:{code:'42501'}} : {data:{id:'33333333-3333-4333-8333-333333333333'},error:null}; },
  };
  const actions = loadModule('app/admin/roadmap/actions.ts', {
    'next/cache': { revalidatePath: value => invalidated.push(value) },
    '@/lib/roadmap/model': model,
    '@/lib/roadmap/server': { roadmapAccess: async () => ({user,isAdmin,supabase:{from: () => query}}) },
  });
  return { actions, calls, invalidated };
}

test('reject malformed status, visibility, priority and dates', () => {
  for (const invalid of [{title:' '},{category:''},{status:'ready'},{publication_status:'public'},{priority:'critical'},{target_date:'2026-02-30'},{completed_date:'garbage'}]) assert.throws(() => model.parseRoadmapForm(form(invalid)));
});
test('optional dates and priority clear to null; legacy order is not written', () => {
  const data = model.parseRoadmapForm(form({sort_order:'999'}));
  assert.equal('sort_order' in data,false); assert.equal(data.target_date,null); assert.equal(data.completed_date,null); assert.equal(data.priority,null);
});
test('only accepted fields reach persistence; extra privilege inputs ignored', () => {
  const data = model.parseRoadmapForm(form({user_id:'attacker',isAdmin:'true',seed_key:'accounts',updated_at:'forged'}));
  for (const key of ['user_id','isAdmin','seed_key','updated_at']) assert.equal(key in data,false);
});
test('anonymous and ordinary users cannot invoke any mutation', async () => {
  for (const user of [null,{id:'ordinary-user'}]) {
    const env=setup(user,false);
    assert.match((await env.actions.saveRoadmap(form())).error,/Access denied/);
    assert.match((await env.actions.deleteRoadmap('33333333-3333-4333-8333-333333333333')).error,/Access denied/);
    assert.equal(env.calls.length,0); assert.equal(env.invalidated.length,0);
  }
});
test('administrator can create draft, edit and publish, delete; all three pages invalidated', async () => {
  const env=setup({id:'admin'},true);
  assert.match((await env.actions.saveRoadmap(form())).success,/Draft saved/);
  assert.equal(env.calls[0][0],'insert');
  assert.deepEqual(env.invalidated,['/','/roadmap','/admin/roadmap']);
  const id='33333333-3333-4333-8333-333333333333';
  assert.match((await env.actions.saveRoadmap(form({id,publication_status:'published'}))).success,/Published/);
  assert.ok(env.calls.some(call=>call[0]==='update'));
  assert.ok(env.calls.some(call=>call[0]==='eq'&&call[1]==='id'&&call[2]===id));
  assert.match((await env.actions.deleteRoadmap(id)).success,/deleted/);
});
test('database denial fails closed without success or revalidation', async () => {
  const env=setup({id:'admin'},true,true);
  assert.ok((await env.actions.saveRoadmap(form())).error);
  assert.ok((await env.actions.deleteRoadmap('33333333-3333-4333-8333-333333333333')).error);
  assert.equal(env.invalidated.length,0);
});
test('invalid IDs cannot produce updates or deletes', async () => {
  const env=setup({id:'admin'},true);
  assert.ok((await env.actions.saveRoadmap(form({id:'invalid'}))).error);
  assert.ok((await env.actions.deleteRoadmap('invalid')).error);
  assert.equal(env.calls.length,0);
});
test('statistics count provided published records by status', () => {
  assert.deepEqual(model.roadmapCounts([{status:'planned'},{status:'completed'},{status:'planned'}]), {planned:2,in_progress:0,completed:1,on_hold:0});
});

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const cards = loadModule('components/roadmap-cards.tsx', {
  'react/jsx-runtime': require('react/jsx-runtime'),
  'next/link': require('next/link'),
  '@/lib/roadmap/model': model,
});
const record = (title, status, publication_status = 'published') => ({
  id: title, title, status, publication_status, category:'Platform', description:'A real published milestone',
  target_date:null, completed_date:null, priority:null, updated_at:'2026-10-15T00:00:00Z',
});
const renderSummary = (items, failed = false) => renderToStaticMarkup(React.createElement(cards.RoadmapSummary, {items, failed}));
test('homepage empty state has no misleading progress counts, columns or drafts', () => {
  for (const items of [[], [record('Unreviewed private draft','completed','draft')]]) {
    const html = renderSummary(items);
    assert.match(html,/Our public flight plan is taking shape/);
    assert.doesNotMatch(html,/role="progressbar"|home-roadmap-completed|Unreviewed private draft/);
    assert.match(html,/href="\/roadmap"/);
  }
});
test('homepage shows four published statuses without progress panel or private items', () => {
  const html=renderSummary([
    record('Completed feature','completed'),record('Work underway','in_progress'),
    record('Future feature','planned'),record('Paused feature','on_hold'),record('Secret feature','completed','draft'),
  ]);
  for (const title of ['Completed feature','Work underway','Future feature','Paused feature']) assert.ok(html.includes(title));
  assert.doesNotMatch(html,/Published milestones|progressbar|1 of 4 completed|25%|Open to everyone/);
  assert.doesNotMatch(html,/Secret feature/);
  assert.doesNotMatch(html,/A real published milestone|Platform|Last updated|Updated|Sort Order/);
  assert.match(html,/TBD/);
});
test('homepage selects six published items by closest target, with undated items last', () => {
  const today = model.roadmapToday();
  const items = Array.from({length:7},(_,i)=>({...record(`Feature ${i}`,'planned'), target_date:i===6 ? today : null}));
  const html = renderSummary([...items,{...record('Private closest','planned','draft'),target_date:today}]);
  assert.equal((html.match(/<article /g)||[]).length,6);
  assert.ok(html.indexOf('Feature 6') < html.indexOf('Feature 0'));
  assert.doesNotMatch(html,/>Feature 5<|Private closest/);
  assert.match(html,/href="\/roadmap"/);
});
test('request failures remain distinct from empty roadmap data', () => {
  const html = renderSummary([],true);
  assert.match(html,/role="alert"/);assert.match(html,/temporarily unavailable/);
  assert.doesNotMatch(html,/Our public flight plan is taking shape/);
});

test('detailed cards keep full description, category and date information', () => {
  const item = {...record('Detailed feature','completed'),target_date:'2026-10-20',completed_date:'2026-10-14'};
  const html=renderToStaticMarkup(React.createElement(cards.RoadmapCard,{item}));
  for(const text of ['Detailed feature','A real published milestone','Platform','Target date','Completed date','Last updated']) assert.ok(html.includes(text));
  assert.doesNotMatch(html,/line-clamp/);
});
const dated = (id,target,updated='2026-10-15T00:00:00Z') => ({...record(id,'planned'),target_date:target,updated_at:updated});
test('target sorting uses absolute calendar distance, includes overdue, and always puts undated last', () => {
  const items=[dated('far','2026-12-01'),dated('none',null),dated('future','2026-10-17'),dated('past','2026-10-14'),dated('today','2026-10-15')];
  assert.deepEqual(model.sortRoadmapItems(items,'target_closest','2026-10-15').map(i=>i.id),['today','past','future','far','none']);
  assert.deepEqual(model.sortRoadmapItems(items,'target_farthest','2026-10-15').map(i=>i.id),['far','future','past','today','none']);
  assert.equal(items[0].id,'far');
});
test('updated sorting works in both directions regardless of target dates', () => {
  const items=[dated('older','2027-01-01','2026-10-01T00:00:00Z'),dated('newer',null,'2026-10-10T00:00:00Z')];
  assert.deepEqual(model.sortRoadmapItems(items,'updated_newest').map(i=>i.id),['newer','older']);
  assert.deepEqual(model.sortRoadmapItems(items,'updated_oldest').map(i=>i.id),['older','newer']);
});
test('equal distances and missing dates have deterministic ties without legacy sort order', () => {
  const items=[dated('future','2026-10-16'),dated('past','2026-10-14'),dated('z',null),dated('a',null)];
  assert.deepEqual(model.sortRoadmapItems(items,'target_closest','2026-10-15').map(i=>i.id),['past','future','a','z']);
});
test('filter supports all development and publication states without changing the source', () => {
  const items=[record('a','planned','draft'),record('b','completed'),record('c','on_hold'),record('d','in_progress')];
  assert.equal(model.filterRoadmapItems(items,'all').length,4);
  for(const status of model.statuses) assert.equal(model.filterRoadmapItems(items,status).length,1);
  assert.equal(model.filterRoadmapItems(items,'draft').length,1);assert.equal(model.filterRoadmapItems(items,'published').length,3);
});
test('server reference day is consistent around the project timezone midnight', () => {
  assert.equal(model.roadmapToday(new Date('2026-10-14T15:59:00Z')),'2026-10-14');
  assert.equal(model.roadmapToday(new Date('2026-10-14T16:00:00Z')),'2026-10-15');
});
