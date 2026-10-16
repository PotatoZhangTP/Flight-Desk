const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(file,deps={}) {
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod={exports:{}};
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})', {filename:file})(name=>{if(!(name in deps))throw Error('Unexpected dependency '+name);return deps[name];},mod,mod.exports);
  return mod.exports;
}
const model=load('lib/content/model.ts');
const defaults=model.landingDefaults;
const rows=stage=>Object.entries(defaults).map(([content_key,content])=>({content_key,content,publication_status:stage}));

test('registry matches all 45 initialized migration keys without duplicate fields',()=>{
  const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261015000200_create_landing_page_content.sql'),'utf8');
  const keys=[...sql.matchAll(/\('([a-z0-9_.]+)', (?:E)?'/g)].map(m=>m[1]).filter(k=>k.startsWith('landing.'));
  assert.equal(new Set(keys).size,45);assert.deepEqual(keys.sort(),Object.keys(defaults).sort());
  assert.equal(model.landingFields.length,45);
});
test('public copy never renders drafts, ignores unknown keys, and falls back per missing field',()=>{
  const copy=model.resolvePublishedCopy([
    {content_key:'landing.hero.title',content:'Private draft',publication_status:'draft'},
    {content_key:'landing.hero.description',content:'Live copy',publication_status:'published'},
    {content_key:'landing.features.title',content:' ',publication_status:'published'},
    {content_key:'other.key',content:'Unexpected',publication_status:'published'},
  ]);
  assert.equal(copy['landing.hero.title'],defaults['landing.hero.title']);
  assert.equal(copy['landing.hero.description'],'Live copy');
  assert.equal(copy['landing.features.title'],defaults['landing.features.title']);
  assert.equal('other.key' in copy,false);assert.equal(Object.keys(copy).length,45);
  assert.deepEqual(model.resolvePublishedCopy([]),defaults);
});
test('draft editor merges drafts over published/defaults and preserves multiline text and optional blanks',()=>{
  const copy=model.resolveDraftCopy([{content_key:'landing.hero.title',content:'Public',publication_status:'published'},{content_key:'landing.hero.title',content:'Draft\nHeading',publication_status:'draft'}]);
  assert.equal(copy['landing.hero.title'],'Draft\nHeading');
  assert.equal(model.validateLandingDraft(copy)['landing.footer.copyright'],'');
});
test('draft validation rejects unknown keys, incomplete fields, objects and oversized content',()=>{
  for(const invalid of [null,[],{}, {...defaults,'landing.hero.title':' '},{...defaults,'landing.hero.title':{html:'bad'}},{...defaults,publication_status:'published'},{...defaults,'landing.hero.title':'x'.repeat(241)}]) assert.throws(()=>model.validateLandingDraft(invalid));
});
function actionSetup({user={id:'admin'},isAdmin=true,saveError=false,publishError=false,draft=rows('draft')}={}) {
  const writes=[],calls=[],invalidated=[];
  const supabase={
    from(table){assert.equal(table,'site_content');return {
      upsert(payload,options){writes.push({payload,options});return {select:async()=>saveError?{data:null,error:{code:'42501'}}:{data:payload.map(r=>({content_key:r.content_key})),error:null}};},
      select(){return {eq(column,value){assert.equal(column,'publication_status');assert.equal(value,'draft');return {like:async()=>({data:draft,error:null})};}};},
    };},
    async rpc(name){calls.push(name);return publishError?{data:null,error:{code:'42501'}}:{data:45,error:null};},
  };
  const actions=load('app/admin/landing-page/actions.ts',{'next/cache':{revalidatePath:p=>invalidated.push(p)},'@/lib/admin/server':{siteAdminAccess:async()=>({supabase,user,isAdmin})},'@/lib/content/model':model});
  return {actions,writes,calls,invalidated};
}
test('anonymous, ordinary and signed-out sessions cannot save or publish',async()=>{
  for(const user of [null,{id:'ordinary'}]) {
    const env=actionSetup({user,isAdmin:false});
    assert.match((await env.actions.saveLandingDraft(defaults)).error,/Access denied/);
    assert.match((await env.actions.publishLandingDraft()).error,/Access denied/);
    assert.equal(env.writes.length,0);assert.equal(env.calls.length,0);
  }
});
test('saving draft writes only draft rows and never invalidates the public homepage',async()=>{
  const env=actionSetup();assert.ok((await env.actions.saveLandingDraft(defaults)).success);
  assert.equal(env.writes[0].payload.length,45);assert.ok(env.writes[0].payload.every(row=>row.publication_status==='draft'));
  assert.deepEqual(env.invalidated,['/admin/landing-page']);assert.equal(env.calls.length,0);
});
test('publish checks the saved draft, invokes the atomic RPC and refreshes public copy',async()=>{
  const env=actionSetup();const result=await env.actions.publishLandingDraft();assert.equal(result.changedRows,45);
  assert.deepEqual(env.calls,['publish_landing_page']);assert.deepEqual(env.invalidated,['/','/admin/landing-page']);
});
test('incomplete drafts and database errors do not produce publication success',async()=>{
  const missing=actionSetup({draft:[]});assert.ok((await missing.actions.publishLandingDraft()).error);assert.equal(missing.calls.length,0);
  const denied=actionSetup({publishError:true});assert.ok((await denied.actions.publishLandingDraft()).error);assert.equal(denied.invalidated.length,0);
  const failedSave=actionSetup({saveError:true});assert.ok((await failedSave.actions.saveLandingDraft(defaults)).error);assert.equal(failedSave.invalidated.length,0);
});
test('public loader explicitly filters published even when the caller might be an admin',async()=>{
  const filters=[];const server=load('lib/content/server.ts',{
    'server-only':{},'./model':model,'@/lib/supabase/server':{createClient:async()=>({from:()=>({select:()=>({eq:(key,value)=>{filters.push([key,value]);return {like:()=>({abortSignal:async()=>({data:rows('published'),error:null})})};}})})})},
  });
  assert.deepEqual(await server.publishedLandingCopy(),defaults);assert.deepEqual(filters,[['publication_status','published']]);
});
test('administrator button lives beside the personal menu and is absent for ordinary users',()=>{
  const controls=load('components/account-controls.tsx',{'react/jsx-runtime':require('react/jsx-runtime'),'@/components/navigation-link':require('next/link'),'./theme-controls':{ThemeMenu:()=>React.createElement('button',null,'Theme menu')},'./user-menu-client':{UserMenuClient:()=>React.createElement('button',null,'Personal menu')}});
  const admin=renderToStaticMarkup(React.createElement(controls.AccountControls,{email:'admin@example.test',initials:'AD',isAdmin:true}));
  assert.match(admin,/href="\/admin"/);assert.match(admin,/Admin Panel/);
  assert.equal((admin.match(/Theme menu/g)||[]).length,1);assert.ok(admin.indexOf('Theme menu')<admin.indexOf('Personal menu'));
  const ordinary=renderToStaticMarkup(React.createElement(controls.AccountControls,{email:'member@example.test',initials:'ME',isAdmin:false}));
  assert.doesNotMatch(ordinary,/Admin Panel|href="\/admin"/);
  assert.equal((ordinary.match(/Theme menu/g)||[]).length,1);
});
test('public content transport failures safely retain the existing default homepage copy',async()=>{
  const server=load('lib/content/server.ts',{'server-only':{},'./model':model,'@/lib/supabase/server':{createClient:async()=>{throw Error('transport unavailable');}}});
  assert.deepEqual(await server.publishedLandingCopy(),defaults);
});
test('new admin routes reject ordinary users and redirect signed-out users before reading content',async()=>{
  for(const file of ['app/admin/page.tsx','app/admin/landing-page/page.tsx']) {
    for(const user of [null,{id:'ordinary'}]) {
      const page=load(file,{
        'react/jsx-runtime':require('react/jsx-runtime'),'@/components/navigation-link':require('next/link'),
        'next/navigation':{redirect:()=>{throw Error('redirect-login');}},
        '@/components/site-header':{},'@/components/admin-navigation':{},
        '@/components/admin-denied':{AdminDenied:()=>React.createElement('p',null,'Access denied')},
        '@/components/landing-content-editor':{},'@/lib/content/model':model,
        '@/lib/admin/server':{siteAdminAccess:async()=>({user,isAdmin:false,error:null,supabase:{from:()=>{throw Error('must not query');}}})},
      });
      if(!user) await assert.rejects(page.default(),/redirect-login/);
      else assert.match(renderToStaticMarkup(await page.default()),/Access denied/);
    }
  }
});
