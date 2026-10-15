const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const root = path.join(__dirname, '..');
function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(`(function(require,exports){${code}\n})`,globals)(name=>{
    assert.ok(name in dependencies,`Unexpected dependency: ${name}`); return dependencies[name];
  },exports);
  return exports;
}
const theme = load('lib/theme.ts');
test('theme values are limited to light, dark and system; invalid values default to system',()=>{
  for(const value of ['light','dark','system']) assert.equal(theme.normalizeTheme(value),value);
  for(const value of [null,undefined,'',false,'auto','DARK','<script>']) assert.equal(theme.normalizeTheme(value),'system');
});
test('pre-paint initialization uses saved preferences and safely handles missing or blocked storage',()=>{
  for(const [stored,expected] of [[null,'system'],['invalid','system'],['light','light'],['dark','dark'],['system','system']]){
    const document={documentElement:{dataset:{}}};
    vm.runInNewContext(theme.themeInitScript,{document,localStorage:{getItem:key=>{assert.equal(key,'flightdesk-theme');return stored;}}});
    assert.equal(document.documentElement.dataset.theme,expected);
  }
  const document={documentElement:{dataset:{}}};
  vm.runInNewContext(theme.themeInitScript,{document,localStorage:{getItem(){throw Error('blocked');}}});
  assert.equal(document.documentElement.dataset.theme,'system');
});
test('root initializes exactly one provider before the body without account-dependent theme loading',()=>{
  const source=fs.readFileSync(path.join(root,'app/layout.tsx'),'utf8');
  assert.match(source,/data-theme="system" suppressHydrationWarning/);
  assert.ok(source.indexOf('id="flightdesk-theme-init"')<source.indexOf('<body>'));
  assert.equal((source.match(/<ThemeProvider>/g)||[]).length,1);
  assert.doesNotMatch(source,/supabase|profile|cookies\(/i);
});
test('theme selection updates root immediately, persists, handles storage failure and synchronizes tabs',()=>{
  const listeners=new Map(),document={documentElement:{dataset:{theme:'dark'}}};
  const saved=[];let blocked=false,captured,notified=0;
  const storage={setItem(key,value){if(blocked)throw Error('blocked');saved.push([key,value]);}};
  const window={localStorage:storage,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),dispatchEvent:event=>listeners.get(event.type)?.()};
  const provider=load('components/theme-provider.tsx',{
    'react':{...React,useSyncExternalStore:(subscribe,snapshot,server)=>{captured={subscribe,snapshot,server};return snapshot();}},
    'react/jsx-runtime':require('react/jsx-runtime'),'@/lib/theme':theme,
  },{document,window,localStorage:storage,Event:class{constructor(type){this.type=type;}}});
  const element=provider.ThemeProvider({children:null});
  assert.equal(element.props.value.theme,'dark');assert.equal(captured.server(),'system');
  const unsubscribe=captured.subscribe(()=>notified++);
  element.props.value.setTheme('light');assert.equal(document.documentElement.dataset.theme,'light');
  assert.deepEqual(saved,[['flightdesk-theme','light']]);assert.equal(notified,1);
  blocked=true;element.props.value.setTheme('dark');assert.equal(captured.snapshot(),'dark');assert.equal(notified,2);
  listeners.get('storage')({key:'unrelated',newValue:'light'});assert.equal(captured.snapshot(),'dark');
  listeners.get('storage')({key:'flightdesk-theme',newValue:'light',storageArea:{}});assert.equal(captured.snapshot(),'dark');
  listeners.get('storage')({key:'flightdesk-theme',newValue:'light'});assert.equal(captured.snapshot(),'light');
  listeners.get('storage')({key:null,newValue:null});assert.equal(captured.snapshot(),'system');
  unsubscribe();assert.equal(listeners.size,0);
});
test('all application components use semantic colors, not legacy hardcoded color classes or inversion',()=>{
  for(const directory of ['app','components'])for(const file of fs.readdirSync(path.join(root,directory),{recursive:true}).filter(file=>file.endsWith('.tsx'))){
    const source=fs.readFileSync(path.join(root,directory,file),'utf8');
    assert.doesNotMatch(source,/(?:bg|text|border|ring)-\[#[0-9a-f]+\]|\bbg-white\b|filter:\s*invert|\binvert\(/i,`${directory}/${file}`);
  }
});
