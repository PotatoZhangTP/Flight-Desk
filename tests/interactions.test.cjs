const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function load(file, deps) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod = {exports:{}};
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})')(name => {
    assert(name in deps, 'Unexpected dependency '+name); return deps[name];
  }, mod, mod.exports);
  return mod.exports;
}
function operation() {
  const states = [];
  const mod = load('components/use-async-operation.ts', {
    react:{useRef:value=>({current:value}),useState:()=>[false,value=>states.push(value)]},
    'next/navigation':{unstable_rethrow:error=>{if(error.digest === 'NEXT_REDIRECT') throw error;}},
  });
  return {...mod.useAsyncOperation(), states};
}
test('async operation takes an immediate lock, ignores duplicate calls, releases after success', async()=>{
  const op = operation(); let finish; let calls = 0;
  const first = op.run(async()=>{calls++; await new Promise(resolve=>finish=resolve);},()=>assert.fail());
  await op.run(async()=>{calls++;},()=>assert.fail());
  assert.equal(calls,1); assert.deepEqual(op.states,[true]);
  finish(); await first;
  await op.run(async()=>{calls++;},()=>assert.fail());
  assert.equal(calls,2); assert.deepEqual(op.states,[true,false,true,false]);
});
test('network failure reports an error and re-enables retry without automatically retrying',async()=>{
  const op = operation(); let errors=0; let calls=0;
  await op.run(async()=>{calls++; throw Error('offline');},()=>errors++);
  assert.equal(errors,1); assert.equal(calls,1); assert.deepEqual(op.states,[true,false]);
  await op.run(async()=>{calls++;},()=>assert.fail()); assert.equal(calls,2);
});
test('Next redirect control flow is rethrown, not turned into a false save failure',async()=>{
  const op = operation(); const redirect=Object.assign(Error('redirect'),{digest:'NEXT_REDIRECT'});
  await assert.rejects(op.run(async()=>{throw redirect;},()=>assert.fail()),error=>error===redirect);
  assert.deepEqual(op.states,[true,false]);
});
test('shared async button disables submits and exposes spinner, busy text and live status',()=>{
  const {AsyncButton} = load('components/async-button.tsx', {'react/jsx-runtime':require('react/jsx-runtime'),'react-dom':{useFormStatus:()=>({pending:false})}});
  const pending = renderToStaticMarkup(React.createElement(AsyncButton,{busy:true,busyLabel:'Saving…'},'Save'));
  assert.match(pending,/disabled=""/); assert.match(pending,/aria-busy="true"/);
  assert.match(pending,/interaction-spinner/); assert.match(pending,/role="status"/);
  const idle=renderToStaticMarkup(React.createElement(AsyncButton,{busy:false,busyLabel:'Saving…'},'Save'));
  assert.doesNotMatch(idle,/disabled=""|interaction-spinner/); assert.match(idle,/>Save</);
});
test('navigation stays Next-native and loading UI is available for every page family',()=>{
  const link=fs.readFileSync('components/navigation-link.tsx','utf8');
  assert.match(link,/useLinkStatus/); assert.match(link,/<NextLink/);
  assert.doesNotMatch(link,/preventDefault|location\.|setTimeout/);
  for(const route of ['','auth/','flights/','dashboard/','roadmap/','profile/','settings/','admin/']) {
    assert.match(fs.readFileSync(`app/${route}loading.tsx`,'utf8'),/RouteLoading/);
  }
  const css=fs.readFileSync('app/globals.css','utf8');
  assert.match(css,/route-enter 180ms/); assert.match(css,/prefers-reduced-motion: reduce/);
  assert.match(css,/hover: hover/); assert.match(css,/focus-visible/);
  const cards=fs.readFileSync('components/roadmap-cards.tsx','utf8');
  assert.doesNotMatch(cards.split('return <article id=')[1].split('</article>')[0],/hover:/);
});

test('page loader has central English/Chinese copy and falls back safely for unknown locales',()=>{
  const copy=load('lib/ui-messages.ts',{});
  assert.equal(copy.getLoadingMessages().label,'Loading…');
  assert.equal(copy.getLoadingMessages('zh-CN').label,'加载中…');
  assert.equal(copy.getLoadingMessages('zh-Hans').details.settings,'正在加载设置');
  assert.equal(copy.getLoadingMessages('fr').label,'Loading…');
  assert.deepEqual(Object.keys(copy.loadingMessages.en.details),Object.keys(copy.loadingMessages['zh-CN'].details));
  const {PageLoadingScreen}=load('components/page-loading-screen.tsx',{'react/jsx-runtime':require('react/jsx-runtime'),'@/lib/ui-messages':copy});
  for(const locale of ['en','zh-CN']) {
    const html=renderToStaticMarkup(React.createElement(PageLoadingScreen,{context:'flights',locale}));
    assert.match(html,/role="status"/);assert.match(html,/aria-atomic="true"/);assert.match(html,/loading-aircraft/);
    assert(html.includes(copy.getLoadingMessages(locale).label));
  }
});
