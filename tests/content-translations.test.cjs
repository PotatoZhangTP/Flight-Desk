const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load(file,deps={}) { const m={exports:{}}; const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText; vm.runInThisContext('(function(require,module,exports){'+code+'\n})')(name=>{assert(name in deps,'Unexpected dependency '+name);return deps[name];},m,m.exports);return m.exports; }
const model=load('lib/content-translations/model.ts');
const provider=load('lib/content-translations/provider.ts',{'./model':model});
const worker=load('lib/content-translations/worker.ts',{'./model':model,'./provider':provider});
test('public/admin preview fallback protects manual wording and rejects stale automatic output',()=>{
  const row={locale:'zh-CN',source_text:'New English',source_hash:'new',translated_source_hash:'old',translated_text:'旧译文',translation_source:'auto',translation_status:'outdated'};
  assert.equal(model.resolveContentText('New English',row,'zh-CN'),'New English');
  row.translation_source='manual';assert.equal(model.resolveContentText('New English',row,'zh-CN'),'旧译文');
  assert.equal(model.resolveContentText('New English',row,'en'),'New English');
  row.translation_source='auto';row.translation_status='completed';row.translated_source_hash='new';assert.equal(model.resolveContentText('New English',row,'zh-CN'),'旧译文');
  assert.equal(model.resolveContentText('Changed English',row,'zh-CN'),'Changed English');
  for(const status of ['failed','pending']){row.translation_status=status;assert.equal(model.resolveContentText('New English',row,'zh-CN'),'New English');}
  assert.equal(model.resolveContentText('Title',undefined,'zh-CN'),'Title');
});
test('polling advances English fallback to a newer source without accepting an older snapshot',()=>{
  const row={source_text:'New source',updated_at:'2026-10-17T00:00:00Z'};
  assert.equal(model.currentContentSource('Old source','2026-10-16T00:00:00Z',row),'New source');
  assert.equal(model.currentContentSource('Newest source','2026-10-18T00:00:00Z',row),'Newest source');
});
test('aviation/brand/URL/formatting and nested placeholders survive without shielding ordinary prose',()=>{
  const source='Flight Desk adds Boeing 737-800 and Airbus A320neo flights to PEK / ZBAA via IATA.\nhttps://flight.example/path {count, plural, one {flight} other {flights}} %s';
  const protectedText=provider.protectTerms(source);
  assert(protectedText.text.includes(' adds '));assert(protectedText.text.includes(' and '));assert(protectedText.text.includes(' flights to '));
  assert.equal(protectedText.restore(protectedText.text),source);
  assert.throws(()=>protectedText.restore(protectedText.text.replace('__FDKEEP_0__','changed')),/protected_token_changed/);
  assert.throws(()=>protectedText.restore(protectedText.text+'__FDKEEP_0__'),/protected_token_changed/);
  assert.throws(()=>protectedText.restore('<script>'+protectedText.text+'</script>'),/invalid_response/);
  const url='Flight Desk: https://flight.example/{airport}/show?lang={locale}';
  const nested=provider.protectTerms(url);assert.equal(nested.restore(nested.text),url);
  assert.throws(()=>nested.restore(nested.text+'__FDKEEP_0__'),/protected_token_changed/);
});
test('DeepL adapter stays server-side, retains tokens, bounds requests and classifies failures',async()=>{
  let requests=0;
  const p=provider.createDeepLProvider({key:'local-fixture-key',plan:'free',fetcher:async(url,init)=>{
    requests++;assert.equal(url,'https://api-free.deepl.com/v2/translate');assert.equal(init.redirect,'error');
    const body=JSON.parse(init.body);assert.equal(body.source_lang,'EN');assert.equal(body.target_lang,'ZH');
    return Response.json({translations:[{text:body.text[0].replace(' adds ',' 新增 ')}]});
  }});
  assert.equal(await p.translate('Flight Desk adds Boeing 737-800','ZH'),'Flight Desk 新增 Boeing 737-800');assert.equal(requests,1);
  await assert.rejects(p.translate('x'.repeat(5001),'ZH'),/invalid_source/);assert.equal(requests,1);
  for(const [status,retryable]of [[429,true],[503,true],[403,false],[456,false],[400,false]]){
    const bad=provider.createDeepLProvider({key:'fixture',plan:'pro',fetcher:async()=>new Response('',{status})});
    await assert.rejects(bad.translate('Title','ZH'),error=>error.retryable===retryable);
  }
  const bad=provider.createDeepLProvider({key:'fixture',plan:'free',fetcher:async()=>Response.json({translations:[]})});await assert.rejects(bad.translate('Title','ZH'),/invalid_response/);
  const streamFailure=provider.createDeepLProvider({key:'fixture',plan:'free',fetcher:async()=>new Response(new ReadableStream({start(controller){controller.error(new Error('Local fixture disconnect'));}}))});
  await assert.rejects(streamFailure.translate('Title','ZH'),error=>error.code==='network_or_timeout'&&error.retryable);
});
test('worker reserves protected character cost before calling provider; exhausted budget calls no API',async()=>{
  const events=[],job={id:'fixture',lease_token:'lease',source_text:'Flight Desk adds {count}',target_code:'ZH',attempts:1};let available=true;
  const queue={claim:async()=>available?(available=false,job):null,reserve:async(_,count)=>{events.push(['reserve',count]);return false;},finish:async()=>{assert.fail('not finished');},fail:async()=>{assert.fail('not failed');}};
  const result=await worker.processTranslationJobs(queue,{translate:async()=>{assert.fail('no paid API');}});
  assert.equal(result.completed,0);assert.equal(events[0][1],[...provider.protectTerms(job.source_text).text].length);
});
test('worker never retries provider after uncertain DB completion; obsolete results are reported',async()=>{
  const job={id:'job',lease_token:'lease',source_text:'Title',target_code:'ZH',attempts:2};let calls=0,available=true;
  const q={claim:async()=>available?(available=false,job):null,reserve:async()=>true,finish:async()=>{throw Error('DB response lost');},fail:async()=>assert.fail()};
  await assert.rejects(worker.processTranslationJobs(q,{translate:async()=>{calls++;return '标题';}}),/DB response lost/);assert.equal(calls,1);
  available=true;q.finish=async()=>false;const result=await worker.processTranslationJobs(q,{translate:async()=> '标题'});assert.equal(result.obsolete,1);
});
test('worker reports bounded retry delays and stops on provider credential/quota failure',async()=>{
  let claims=0,report;
  const q={claim:async()=>{claims++;return{id:'job',lease_token:'lease',source_text:'Title',target_code:'ZH',attempts:4};},reserve:async()=>true,finish:async()=>assert.fail(),fail:async(...args)=>{report=args;}};
  await worker.processTranslationJobs(q,{translate:async()=>{throw new provider.TranslationFailure('provider_403',false);}});
  assert.equal(claims,1);assert.equal(report[2],false);assert.equal(report[3],240);assert.equal(model.retryDelaySeconds(999),3600);
});
test('manual/backfill server actions deny ordinary users before DB calls',async()=>{
  const actions=load('app/admin/translations/content-actions.ts',{'@/lib/admin/server':{siteAdminAccess:async()=>({user:{id:'member'},isAdmin:false,supabase:{rpc:()=>assert.fail()}})},'@/lib/content-translations/model':model,'next/cache':{revalidatePath:()=>assert.fail()}});
  assert.equal((await actions.saveDynamicTranslation({})).error,'admin.denied');assert.equal((await actions.backfillDynamicTranslations(null)).error,'admin.denied');
});
test('worker authentication rejects missing, short, forged and oversized secrets using a server-only boundary',()=>{
  const services=load('lib/content-translations/worker-server.ts',{'server-only':{},'node:crypto':require('node:crypto'),'@supabase/supabase-js':{createClient:()=>assert.fail('no DB client')},'./provider':provider});
  const secret='local-only-fixture-'.repeat(3);
  assert.equal(services.validWorkerAuthorization('Bearer '+secret,secret),true);
  for(const header of [null,'Bearer member-token','Bearer '+secret+'x','x'.repeat(2000)])assert.equal(services.validWorkerAuthorization(header,secret),false);
  assert.equal(services.validWorkerAuthorization('Bearer short','short'),false);
});
test('worker HTTP route fails closed without auth/config and does not claim tasks',async()=>{
  const route=load('app/api/internal/translations/process/route.ts',{'next/server':{NextResponse:require('next/server').NextResponse},'@/lib/content-translations/worker-server':{validWorkerAuthorization:header=>header==='Bearer local-fixture',workerServices:()=>null},'@/lib/content-translations/worker':{processTranslationJobs:()=>assert.fail()}});
  assert.equal((await route.GET(new Request('https://example.invalid'))).status,401);
  assert.equal((await route.GET(new Request('https://example.invalid',{headers:{authorization:'Bearer local-fixture'}}))).status,503);
});
