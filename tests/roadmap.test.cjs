const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Test the actual domain functions and Server Actions with isolated dependencies.
// No network calls, real user credentials or database writes are made.
function loadModule(file, dependencies = {}) {
  dependencies = { './roadmap-content': {RoadmapContentScope: ({children}) => children, RoadmapContentText: ({item, field}) => item[field]}, '@/lib/content-translations/read.server': {attachContentTranslations: async (_, items) => items}, ...dependencies };
  dependencies = { '@/components/i18n': require('./support/i18n-mock.cjs'), './i18n': require('./support/i18n-mock.cjs'), './language-selector': {LanguageSelector: () => null}, ...dependencies };
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
const readModel = loadModule('lib/roadmap/read-model.server.ts', {'server-only':{}});
const contentModel = loadModule('lib/content/model.ts');
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
  assert.deepEqual(model.roadmapCounts([{status:'planned'},{status:'completed'},{status:'planned'}]), {planned:2,completed:1,on_hold:0});
});

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const upcoming = loadModule('components/upcoming-button.tsx', {'react/jsx-runtime':require('react/jsx-runtime')});
const logbookLink = loadModule('components/logbook-link.tsx', {
  'react/jsx-runtime': require('react/jsx-runtime'), '@/components/navigation-link': require('next/link'),
});
const cards = loadModule('components/roadmap-cards.tsx', {
  './logbook-link': logbookLink,
  'react/jsx-runtime': require('react/jsx-runtime'),
  '@/components/navigation-link': require('next/link'),
  '@/lib/roadmap/model': model,
  '@/lib/content/model': contentModel,
});
const record = (title, status, publication_status = 'published') => ({
  id: title, title, status, publication_status, category:'Platform', description:'A real published milestone',
  target_date:null, completed_date:null, priority:null, updated_at:'2026-10-15T00:00:00Z',
});
const renderSummary = (items, failed = false) => renderToStaticMarkup(React.createElement(cards.RoadmapSummary, {items, failed}));
test('legacy items retain identity, publication, dates and content while moving into planned', () => {
  const legacy={...record('Legacy feature','in_progress'),target_date:'2026-10-20',completed_date:null};
  const normalized=readModel.readRoadmapItems([legacy]);
  assert.deepEqual(normalized,[{...legacy,status:'planned'}]);
  assert.equal(legacy.status,'in_progress');
  assert.deepEqual(model.statuses,['planned','completed','on_hold']);
  assert.throws(()=>model.parseRoadmapForm(form({status:'in_progress'})),/valid development status/);
  assert.deepEqual(readModel.readRoadmapItems(normalized),normalized);
  const html=renderToStaticMarkup(React.createElement(cards.RoadmapBoard,{items:normalized}));
  assert.match(html,/Legacy feature/);assert.doesNotMatch(html,/In Progress|status-in_progress/);
});
test('public Supabase loader normalizes legacy status without changing the publication filter', async () => {
  const calls=[];const legacy=record('Published legacy item','in_progress');
  const query={select(){return this;},eq(...args){calls.push(args);return this;},order(){return this;},abortSignal:async()=>({data:[legacy],error:null})};
  const server=loadModule('lib/roadmap/server.ts',{'server-only':{},'./read-model.server':readModel,
    '@/lib/supabase/server':{createClient:async()=>({from:table=>{assert.equal(table,'roadmap_items');return query;}})}});
  const result=await server.publishedRoadmap();
  assert.deepEqual(calls,[['publication_status','published']]);
  assert.equal(result.items[0].status,'planned');assert.equal(result.failed,false);
});
test('frontend roadmap model and components contain no retired status or compatibility types', () => {
  for(const file of ['lib/roadmap/model.ts','components/roadmap-cards.tsx','components/roadmap-manager.tsx','components/roadmap-controls.tsx','components/roadmap-explorer.tsx','app/roadmap/page.tsx','app/globals.css']) {
    const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    assert.doesNotMatch(source,/in_progress|In Progress|LegacyRoadmap|progress-bg|progress-fg/,file);
  }
  for(const status of ['planned','completed','on_hold']) assert.equal(model.parseRoadmapForm(form({status})).status,status);
});
test('landing uses a vertical product narrative with the exact hero copy and preserved navigation', async () => {
  const journey=loadModule('components/journey-demo.tsx',{'react/jsx-runtime':require('react/jsx-runtime')});
  const home=loadModule('app/page.tsx',{
    'react/jsx-runtime':require('react/jsx-runtime'),'@/components/navigation-link':require('next/link'),
    'next/image':require('next/image'),'@/components/localized-image':require('next/image'),'@/components/upcoming-button':upcoming,
    '@/components/site-header':{SiteHeader:()=>React.createElement('header')},
    '@/components/site-footer':{SiteFooter:()=>React.createElement('footer')},
    '@/components/journey-demo':journey,'@/components/roadmap-cards':cards,
    '@/components/logbook-link':logbookLink,
    '@/lib/roadmap/server':{publishedRoadmap:async()=>({items:[record('Public milestone','planned')],failed:false})},
    '@/lib/content/server':{publishedLandingCopy:async()=>({...contentModel.landingDefaults})},
  });
  const html=renderToStaticMarkup(await home.default());
  assert.match(html.replace(/<[^>]*>/g,'').replace(/\s+/g,' '),/Every Flight Tells a Story/);
  assert.doesNotMatch(html,/Your own account\. Your own records\. Room to grow\.|grid-paper|bg-panel|background-image/);
  assert.ok(html.indexOf('id="hero-title"') < html.indexOf('A journey, captured'));
  assert.ok(html.indexOf('A journey, captured') < html.indexOf('id="features"'));
  assert.doesNotMatch(html,/>Product demo</);
  assert.match(html,/>CA981</);
  assert.doesNotMatch(html,/Example flight/);
  assert.ok(html.indexOf('href="/dashboard"') < html.indexOf('A journey, captured'));
  assert.ok(html.indexOf('A journey, captured') < html.indexOf('href="#features"'));
  assert.ok(html.indexOf('id="features"') < html.indexOf('id="product-preview"'));
  assert.ok(html.indexOf('id="product-preview"') < html.indexOf('id="roadmap"'));
  // Four top-level sections; the homepage Roadmap has two nested status sections.
  assert.equal((html.match(/<section /g)||[]).length,6);
  for(const text of ['Built Around Your Journeys','Flight Logging','Flight History','Flight Statistics','Your Flights. All in One Place']) assert.ok(html.includes(text));
  assert.doesNotMatch(html,/Story\.<|Journeys\.<|Place\.<|Our flight plan/);
  const features=html.slice(html.indexOf('id="features"'),html.indexOf('id="product-preview"'));
  assert.equal((features.match(/<article /g)||[]).length,6);
  for(const label of ['Excel Import','Flight Map','Flight Checklist']) assert.ok(features.includes(`aria-label="${label}"`));
  assert.match(features,/href="\/flights\/new"/);
  assert.match(html,/>Beijing<|>Beijing<!--/);
  assert.match(html,/>New York<|>New York<!--/);
  assert.doesNotMatch(html,/Beijing Capital|New York JFK/);
  assert.doesNotMatch(html,/>PEK|>JFK/);
  assert.match(html,/>ZBAA</);assert.match(html,/>KJFK</);
  assert.doesNotMatch(html,/id="how-it-works"|Why Flight Desk|For Aviation Lovers|For Every Traveler/);
  const preview=html.slice(html.indexOf('id="product-preview"'),html.indexOf('id="roadmap"'));
  assert.match(preview,/data-product-preview/);
  assert.match(preview,/<img/);assert.match(preview,/add-flight-preview/);
  assert.match(html,/href="\/dashboard"/);assert.match(html,/href="\/roadmap\?item=/);
});
test('public navigation reserves unfinished pages without fake links; footer uses the new brand copy', async () => {
  const deps = {'react/jsx-runtime':require('react/jsx-runtime'),'@/components/navigation-link':require('next/link'),
    './brand':{Brand:()=>React.createElement('span',null,'Flight Desk')},'./logbook-link':logbookLink,'./upcoming-button':upcoming};
  const header=loadModule('components/site-header.tsx', {...deps,
    './theme-controls':{ThemeMenu:()=>null},
    './account-controls':{AccountControls:()=>null},
    '@/lib/admin/server':{siteAdminAccess:async()=>({user:null,isAdmin:false})}});
  const html=renderToStaticMarkup(await header.SiteHeader());
  for(const label of ['Blog','Community','Pricing']) assert.ok(html.includes(`>${label}</button>`));
  assert.doesNotMatch(html,/Coming soon|disabled/);
  assert.match(html,/href="\/#features"/);assert.match(html,/href="\/dashboard"/);
  const footer=loadModule('components/site-footer.tsx',{...deps,'@/lib/content/model':contentModel});
  const foot=renderToStaticMarkup(React.createElement(footer.SiteFooter));
  assert.match(foot,/FOR EVERYONE WHO LOVES THE SKY/);
  assert.doesNotMatch(foot,/Product roadmap|href="\/roadmap"|href="#"/);
  assert.doesNotMatch(foot,/Coming soon|disabled/);
  for(const label of ['About','Contact','Support','Privacy Policy','Terms of Service']) assert.ok(foot.includes(`>${label}</button>`));
  assert.match(foot,/© 2026 Flight Desk. All rights reserved./);
});
test('unfinished entries show the requested message instead of navigating', () => {
  const previous = global.window;
  let message;
  global.window = {alert:value=>{message=value;}};
  try {
    const button=upcoming.UpcomingButton({children:'Blog'});
    assert.equal(button.type,'button');assert.equal(button.props.type,'button');
    button.props.onClick();assert.equal(message,'This feature is coming soon. Stay tuned.');
  } finally {global.window=previous;}
});
test('homepage keeps two lightweight empty groups without fake cards or draft data', () => {
  for (const items of [[], [record('Unreviewed private draft','completed','draft')]]) {
    const html = renderSummary(items);
    assert.doesNotMatch(html,/No published on hold items yet/);
    assert.match(html,/No published planned items yet/);
    assert.match(html,/No published completed items yet/);
    assert.doesNotMatch(html,/role="progressbar"|<article|Unreviewed private draft/);
    assert.match(html,/href="\/roadmap"/);
  }
});
test('homepage shows only planned and completed while full roadmap retains on hold', () => {
  const html=renderSummary([
    record('Completed feature','completed'),record('Future work','planned'),
    record('Future feature','planned'),record('Paused feature','on_hold'),record('Secret feature','completed','draft'),
  ]);
  for (const title of ['Completed feature','Future work','Future feature']) assert.ok(html.includes(title));
  assert.doesNotMatch(html,/Paused feature|home-roadmap-on_hold/);
  assert.doesNotMatch(html,/In Progress|home-roadmap-in_progress/);
  assert.ok(html.indexOf('home-roadmap-planned') < html.indexOf('home-roadmap-completed'));
  const full=renderToStaticMarkup(React.createElement(cards.RoadmapBoard,{items:[record('Paused feature','on_hold')]}));
  assert.match(full,/Paused feature|On Hold/);
  assert.match(full,/status-on_hold/);
  assert.doesNotMatch(html,/Published milestones|progressbar|1 of 4 completed|25%|Open to everyone/);
  assert.doesNotMatch(html,/Secret feature/);
  assert.doesNotMatch(html,/A real published milestone|Last updated|Updated|Sort Order/);
  assert.match(html,/Platform/);
  assert.match(html,/TBD/);
});
test('homepage caps each group at four, sorts dates first and preserves all items on full board', () => {
  const today = model.roadmapToday();
  const items = Array.from({length:7},(_,i)=>({...record(`Feature ${i}`,'planned'), target_date:i===6 ? today : null}));
  const html = renderSummary([...items,{...record('Private closest','planned','draft'),target_date:today}]);
  assert.equal((html.match(/<article /g)||[]).length,4);
  assert.ok(html.indexOf('Feature 6') < html.indexOf('Feature 0'));
  assert.doesNotMatch(html,/>Feature [345]<|Private closest/);
  assert.match(html,/href="\/roadmap"/);
  const full=renderToStaticMarkup(React.createElement(cards.RoadmapBoard,{items}));
  assert.equal((full.match(/<article /g)||[]).length,7);
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
test('landing navigation uses the stable item ID and detailed cards provide a focusable destination', () => {
  const item={...record('Navigation feature','planned'),id:'33333333-3333-4333-8333-333333333333'};
  const preview=renderToStaticMarkup(React.createElement(cards.RoadmapCard,{item,mode:'compact'}));
  assert.match(preview,/href="\/roadmap\?item=33333333-3333-4333-8333-333333333333"/);
  assert.equal((preview.match(/<a /g)||[]).length,1);
  const detail=renderToStaticMarkup(React.createElement(cards.RoadmapCard,{item}));
  assert.ok(detail.includes(`id="${model.roadmapItemAnchor(item.id)}"`));
  assert.match(detail,/tabindex="-1"/);
  assert.equal(model.roadmapItemHref('id&item=other'),'/roadmap?item=id%26item%3Dother');
});
test('landing cards show inline completion dates, honest fallbacks and no decorative artwork', () => {
  const render = item => renderToStaticMarkup(React.createElement(cards.RoadmapCard,{item,mode:'compact'}));
  const completed=render({...record('Finished','completed'),completed_date:'2026-10-15',target_date:'2026-10-16'});
  assert.match(completed,/Completed date: /);assert.match(completed,/15 Oct 2026/);assert.doesNotMatch(completed,/16 Oct 2026|<svg|border-dashed|aria-hidden/);
  const planned=render({...record('Upcoming','planned'),target_date:'2026-10-16'});
  assert.match(planned,/Target date: /);assert.match(planned,/16 Oct 2026/);
  assert.match(render(record('Undated','planned')),/Target date: TBD/);
  assert.match(render({...record('Undated completion','completed'),target_date:'2026-10-16'}),/Completed date: TBD/);
});
test('landing caps each of its two published groups at four and excludes on hold', () => {
  const items=[];
  for(const status of ['planned','completed','on_hold']) {
    for(let i=0;i<6;i++) items.push({...record(`${status}-${i}`,status),target_date:`2026-10-${String(15+i).padStart(2,'0')}`,completed_date:i===0?null:`2026-10-${String(20-i).padStart(2,'0')}`});
  }
  items.push({...record('secret','completed','draft'),completed_date:'2026-10-15'});
  const groups=model.landingRoadmapGroups(items,'2026-10-15');
  assert.deepEqual(groups.map(g=>g.status),['planned','completed']);
  assert.deepEqual(groups.map(g=>g.items.length),[4,4]);
  assert.deepEqual(groups[0].items.map(i=>i.id),['planned-0','planned-1','planned-2','planned-3']);
  assert.deepEqual(groups[1].items.map(i=>i.id),['completed-5','completed-4','completed-3','completed-2']);
  assert.equal(items.length,19);
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
  const items=[record('a','planned','draft'),record('b','completed'),record('c','on_hold'),record('d','planned')];
  assert.equal(model.filterRoadmapItems(items,'all').length,4);
  assert.equal(model.filterRoadmapItems(items,'planned').length,2);
  for(const status of ['completed','on_hold']) assert.equal(model.filterRoadmapItems(items,status).length,1);
  assert.equal(items[3].status,'planned');
  assert.equal(model.filterRoadmapItems(items,'draft').length,1);assert.equal(model.filterRoadmapItems(items,'published').length,3);
});
test('server reference day is consistent around the project timezone midnight', () => {
  assert.equal(model.roadmapToday(new Date('2026-10-14T15:59:00Z')),'2026-10-14');
  assert.equal(model.roadmapToday(new Date('2026-10-14T16:00:00Z')),'2026-10-15');
});
