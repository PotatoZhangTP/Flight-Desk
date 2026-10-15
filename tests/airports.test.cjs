const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}, env = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports,process){${code}\n})`, { filename: file })(name => {
    if (!(name in dependencies)) throw new Error('Unexpected import: ' + name);
    return dependencies[name];
  }, module, module.exports, { env });
  return module.exports;
}
const model = load('lib/airports.ts');
const time = load('lib/flight-time.ts', { luxon: require('luxon') });
const normalizer = load('lib/flight-input.ts', { '@/lib/flight-time': time });
const config = load('lib/airport-config.ts');
const input = () => ({
  departureAirportName: 'Beijing Capital', departureAirportIata: 'PEK', departureAirportIcao: 'ZBAA', departureCountryCode: 'CN',
  departureDate: '2026-10-20', departureTime: '10:00', departureTimezone: 'Asia/Shanghai',
  arrivalAirportName: 'New York JFK', arrivalAirportIata: 'JFK', arrivalAirportIcao: 'KJFK', arrivalCountryCode: 'US',
  arrivalDate: '2026-10-20', arrivalTime: '12:00', arrivalTimezone: 'America/New_York', actualDurationMinutes: null,
});
test('airport row mapping does not synthesize ICAO from GPS or ident; missing codes remain null', () => {
  const a = model.airportFromRow({id:1,name:'Small airfield',ident:'00A',gps_code:'K00A',timezone:null});
  assert.equal(a.icao,null); assert.equal(a.iata,null); assert.equal(a.ident,'00A'); assert.equal(a.timezone,null);
  assert.equal(model.airportCodes(a),'Ident: 00A'); assert.equal(model.airportLegacyKey(a),'00A');
});
test('historical airport snapshots survive without a catalog lookup or fabricated IATA', () => {
  const a = model.airportFromSnapshot({departure_airport:'old-local-code',departure_airport_name:'Historical field',departure_timezone:'Asia/Kathmandu'},'departure');
  assert.equal(a.name,'Historical field'); assert.equal(a.ident,'old-local-code'); assert.equal(a.iata,null); assert.equal(a.origin,'snapshot');
  assert.equal(model.airportFromSnapshot({},'arrival'),null);
});
test('Preview requires its own complete reference config and does not replace Auth configuration', () => {
  const env = {VERCEL_ENV:'preview',NEXT_PUBLIC_SUPABASE_URL:'https://auth.example.test',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_auth'};
  assert.throws(()=>config.resolveAirportConfig(env));
  assert.throws(()=>config.resolveAirportConfig({...env,AIRPORTS_SUPABASE_URL:'https://catalog.example.test'}));
  assert.deepEqual(config.resolveAirportConfig({...env,AIRPORTS_SUPABASE_URL:'https://catalog.example.test',AIRPORTS_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_catalog'}),{url:'https://catalog.example.test',key:'sb_publishable_catalog'});
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,'https://auth.example.test');
});
test('catalog config rejects Secret/service_role keys, credential URLs and deployed HTTP endpoints', () => {
  const service = 'header.' + Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url') + '.signature';
  const anon = 'header.' + Buffer.from(JSON.stringify({role:'anon'})).toString('base64url') + '.signature';
  for(const key of ['sb_secret_do-not-use',service]) assert.throws(()=>config.resolveAirportConfig({AIRPORTS_SUPABASE_URL:'https://catalog.example.test',AIRPORTS_SUPABASE_PUBLISHABLE_KEY:key}));
  assert.equal(config.resolveAirportConfig({AIRPORTS_SUPABASE_URL:'https://catalog.example.test',AIRPORTS_SUPABASE_PUBLISHABLE_KEY:anon}).key,anon);
  for(const url of ['https://user:password@catalog.example.test','http://catalog.example.test','https://catalog.example.test?key=x','http://localhost:4410']) {
    assert.throws(()=>config.resolveAirportConfig({VERCEL:'1',AIRPORTS_SUPABASE_URL:url,AIRPORTS_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'}));
  }
});
test('UTC conversion handles date line and fractional zones without local-time subtraction', () => {
  assert.equal(time.getScheduledDuration({date:'2026-01-01',time:'22:00',timezone:'America/Los_Angeles'},{date:'2026-01-03',time:'06:00',timezone:'Asia/Tokyo'}).minutes,900);
  assert.equal(time.getScheduledFlightTime('2026-01-01','00:15','Asia/Kathmandu').iso,'2025-12-31T18:30:00.000Z');
});
test('DST gaps and invalid dates are rejected rather than silently shifted', () => {
  for(const [date,clock,zone] of [['2026-03-08','02:30','America/New_York'],['2026-03-29','01:30','Europe/London'],['2026-02-30','12:00','Asia/Shanghai'],['2026-01-01','25:00','Asia/Shanghai'],['2026-01-01','12:00','UTC+8'],['2026-01-01','12:00','EST']]) {
    assert.equal(time.getScheduledFlightTime(date,clock,zone).iso,null);
  }
});
test('DST overlaps require an explicit choice, saved UTC restores the prior choice', () => {
  const ambiguous = time.getScheduledFlightTime('2026-11-01','01:30','America/New_York');
  assert(ambiguous.error); assert.equal(ambiguous.ambiguous,true); assert.equal(ambiguous.choices.length,2);
  assert.equal(time.getScheduledFlightTime('2026-11-01','01:30','America/New_York','earlier').iso,'2026-11-01T05:30:00.000Z');
  assert.equal(time.getScheduledFlightTime('2026-11-01','01:30','America/New_York','later').iso,'2026-11-01T06:30:00.000Z');
  assert.equal(time.snapshotClockChoice('2026-11-01','01:30','America/New_York','2026-11-01T06:30:00Z'),'later');
});
test('normalization fills legacy NOT NULL fields for code-less/manual airports and recomputes UTC', () => {
  const raw = {...input(),departureAirportIata:null,departureAirportIcao:null,departureAirportIdent:'00AK',departureAirportName:'Lowell Field',departureUtc:'FAKE',scheduledDurationMinutes:1};
  const {data,error} = normalizer.normalizeFlightInput(raw);
  assert.equal(error,null); assert.equal(data.departure_airport,'00AK'); assert.equal(data.departure_airport_iata,null);
  assert.equal(data.departure_scheduled_at_utc,'2026-10-20T02:00:00.000Z'); assert.equal(data.scheduled_duration_minutes,840);
  assert.equal(data.actual_duration_minutes,null); assert.equal(data.flight_date,'2026-10-20');
  assert.equal(normalizer.normalizeFlightInput({...raw,departureAirportIdent:null}).data.departure_airport,'Lowell Field');
});
test('Actual duration is independent, nullable and preserves zero; malformed inputs fail closed', () => {
  assert.equal(normalizer.normalizeFlightInput({...input(),actualDurationMinutes:0}).data.actual_duration_minutes,0);
  for(const patch of [{actualDurationMinutes:-1},{actualDurationMinutes:1.5},{actualDurationMinutes:NaN},{actualDurationMinutes:'10'},
    {departureAirportIata:'00AK'},{departureAirportIcao:'0000'},{departureCountryCode:'USA'}, {departureAirportName:''},
    {arrivalDate:'2026-10-19'},{departureDisambiguation:'ignore'}]) {
    const result = normalizer.normalizeFlightInput({...input(),...patch}); assert(result.error); assert.equal(result.data,null);
  }
});
function actionsFixture({user={id:'owner'},error=null,found=true}={}) {
  const writes=[],filters=[],invalidated=[];
  const db={auth:{getUser:async()=>({data:{user}})},from:table=>({
    insert:async data=>{writes.push({table,data});return{error};},
    update:data=>{writes.push({table,data}); const q={eq:(key,value)=>{filters.push([key,value]);return q;},select:()=>q,maybeSingle:async()=>({data:found?{id:'flight'}:null,error})};return q;},
  })};
  const actions=load('app/flights/actions.ts',{
    '@/lib/supabase/server':{createClient:async()=>db},'@/lib/flight-input':normalizer,
    'next/cache':{revalidatePath:p=>invalidated.push(p)},'next/navigation':{redirect:p=>({redirect:p})},
  });
  return{actions,writes,filters,invalidated};
}
test('flight mutations use authenticated ownership and whitelist data, never client supplied owner', async()=>{
  const f=actionsFixture();await f.actions.createFlight({...input(),user_id:'attacker',id:'fake'});
  assert.equal(f.writes[0].data.user_id,'owner');assert.equal(f.writes[0].data.id,undefined);assert.equal(f.writes[0].table,'flights');
  const id='44444444-4444-4444-8444-444444444444';await f.actions.updateFlight(id,input());
  assert.deepEqual(f.filters,[['id',id],['user_id','owner']]);
});
test('anonymous, invalid, missing/other-owner and DB failures cannot produce save success',async()=>{
  const anon=actionsFixture({user:null});assert((await anon.actions.createFlight(input())).error);assert.equal(anon.writes.length,0);
  const invalid=actionsFixture();assert((await invalid.actions.updateFlight('not-a-uuid',input())).error);assert.equal(invalid.writes.length,0);
  const missing=actionsFixture({found:false});assert((await missing.actions.updateFlight('44444444-4444-4444-8444-444444444444',input())).error);assert.equal(missing.invalidated.length,0);
  const failure=actionsFixture({error:{message:'private upstream diagnostic'}});const result=await failure.actions.createFlight(input());assert(result.error);assert(!result.error.includes('private upstream'));assert.equal(failure.invalidated.length,0);
});
function endpoint(result={data:[{id:1,name:'Sample Airport',ident:'TEST',icao_code:null,iata_code:null}],error:null}) {
  const calls=[];
  const route=load('app/api/airports/route.ts',{
    '@/lib/airports':model,'@/lib/airport-config':{AirportConfigError:config.AirportConfigError,resolveAirportConfig:()=>({url:'https://catalog.example.test',key:'sb_publishable_fixture'})},
    '@supabase/supabase-js':{createClient:(url,key,options)=>{calls.push({url,key,options});return{rpc:(name,args)=>{calls.push({name,args});return{abortSignal:async signal=>{assert(signal instanceof AbortSignal);return result;}};}};}},
  });
  return{route,calls};
}
test('airport endpoint is public, bounded and stateless, never forwards user auth cookies',async()=>{
  const f=endpoint();const response=await f.route.GET(new Request('https://site.example.test/api/airports?q=PEK',{headers:{cookie:'private-session'}}));
  assert.equal(response.status,200);assert.equal((await response.json()).airports[0].icao,null);
  assert.deepEqual(f.calls[1],{name:'search_airports',args:{search_query:'PEK',result_limit:12}});
  assert.equal(f.calls[0].options.auth.persistSession,false);assert.equal(f.calls[0].options.global,undefined);
});
test('short, punctuation-only and oversized queries never hit Supabase; upstream errors are not fake empty results',async()=>{
  const f=endpoint();for(const q of ['','a','%%','x'.repeat(81),'\n\u0000']) {
    const response=await f.route.GET(new Request('https://site.example.test/api/airports?q='+encodeURIComponent(q)));
    assert([200,400].includes(response.status));
  }assert.equal(f.calls.length,0);
  const failed=endpoint({data:null,error:{message:'private credentials diagnostics'}});
  const response=await failed.route.GET(new Request('https://site.example.test/api/airports?q=PEK'));
  assert.equal(response.status,503);assert(!(await response.text()).includes('private credentials'));
});
test('airport diagnostics distinguish rejected key, missing RPC, schema, permission, timeout and bad response without leaking upstream data',async()=>{
  for(const [status,code,expected] of [
    [401,undefined,'AIRPORT_KEY_REJECTED'],[404,'PGRST202','AIRPORT_RPC_NOT_FOUND'],
    [406,'PGRST106','AIRPORT_SCHEMA_NOT_EXPOSED'],[403,'42501','AIRPORT_PERMISSION_DENIED'],
    [500,'57014','AIRPORT_QUERY_TIMEOUT'],[0,undefined,'AIRPORT_CONNECTION_FAILED'],
    [500,'XX000','AIRPORT_UPSTREAM_REQUEST_FAILED'],
  ]){
    const f=endpoint({data:null,error:{code,message:'PRIVATE_SECRET_URL_DO_NOT_EXPOSE',details:'PRIVATE_SECRET_URL_DO_NOT_EXPOSE'},status});
    const response=await f.route.GET(new Request('https://site.example.test/api/airports?q=KJFK'));
    const body=await response.json(); assert.equal(response.status,503);assert.equal(body.diagnosticCode,expected);
    assert(!JSON.stringify(body).includes('PRIVATE_SECRET'));assert.equal(body.build,null);
  }
  const invalid=endpoint({data:[{}],error:null,status:200});
  assert.equal((await (await invalid.route.GET(new Request('https://site.example.test/api/airports?q=KJFK'))).json()).diagnosticCode,'AIRPORT_RESPONSE_INVALID');
});
test('configuration failures have safe diagnostic categories and reject appended API paths',()=>{
  const preview={VERCEL_ENV:'preview'};
  assert.throws(()=>config.resolveAirportConfig(preview),{diagnosticCode:'AIRPORT_PREVIEW_CONFIG_MISSING'});
  assert.throws(()=>config.resolveAirportConfig({...preview,AIRPORTS_SUPABASE_URL:'https://example.test'}),{diagnosticCode:'AIRPORT_CONFIG_INCOMPLETE'});
  const env={AIRPORTS_SUPABASE_URL:'PRIVATE_NOT_A_URL',AIRPORTS_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'};
  assert.throws(()=>config.resolveAirportConfig(env),{diagnosticCode:'AIRPORT_URL_INVALID'});
  assert.throws(()=>config.resolveAirportConfig({...env,AIRPORTS_SUPABASE_URL:'https://example.test/rest/v1'}),{diagnosticCode:'AIRPORT_URL_NOT_PROJECT_ROOT'});
});
