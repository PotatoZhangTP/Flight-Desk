// Loopback-only Supabase protocol fixture. Never contacts a real database/email service.
const http = require('node:http');
const {landingDefaults} = require('../../lib/content/model.ts');
const port = Number(process.env.THEME_TEST_API_PORT || 4410);
const ids={admin:'11111111-1111-4111-8111-111111111111',member:'22222222-2222-4222-8222-222222222222'};
const flightId='44444444-4444-4444-8444-444444444444';
const user=role=>({id:ids[role],email:`${role}@example.test`,aud:'authenticated',role:'authenticated',created_at:'2026-10-01T00:00:00Z'});
function session(role){const exp=Math.floor(Date.now()/1000)+3600;return{access_token:[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:ids[role],aud:'authenticated',role:'authenticated',exp})).toString('base64url'),'local-test-signature'].join('.'),refresh_token:'local-test-only',token_type:'bearer',expires_in:3600,expires_at:exp,user:user(role)};}
const profiles=Object.fromEntries(Object.keys(ids).map(role=>[ids[role],{id:ids[role],display_name:role==='admin'?'Test Admin':'Test Pilot',bio:'Isolated browser test profile'}]));
const flights=[{id:flightId,user_id:ids.member,flight_date:'2026-10-20',departure_airport:'PEK',arrival_airport:'JFK',departure_airport_iata:'PEK',departure_airport_icao:'ZBAA',departure_airport_name:'Beijing Capital',departure_country_code:'CN',arrival_airport_iata:'JFK',arrival_airport_icao:'KJFK',arrival_airport_name:'New York JFK',arrival_country_code:'US',departure_local_date:'2026-10-20',departure_local_time:'10:00',departure_timezone:'Asia/Shanghai',arrival_local_date:'2026-10-20',arrival_local_time:'12:00',arrival_timezone:'America/New_York',airline:'Test Airline',flight_number:'TEST981',aircraft_type:'Boeing 777-300ER',registration:'TEST-01',scheduled_duration_minutes:840,actual_duration_minutes:null,duration_minutes:null,notes:'Local test fixture, not a real flight.'}];
const timestamp='2026-10-15T00:00:00Z';
const airportReferences=require('node:fs').readFileSync(require('node:path').join(__dirname,'../../scripts/airports/fixtures/sample.jsonl'),'utf8').trim().split('\n').map(line=>{const r=JSON.parse(line);return{...r,id:r.source_id};});
let items=['planned','completed','on_hold'].map((status,index)=>({id:`33333333-3333-4333-8333-${String(index+1).padStart(12,'0')}`,title:`Test ${status} milestone`,description:'Local browser test content',category:'Platform',status,publication_status:'published',priority:null,target_date:null,completed_date:null,sort_order:index,created_at:timestamp,updated_at:timestamp}));
// Optional larger dataset for responsive pagination/filter tests; never deployed.
if(process.env.LANDING_RESPONSIVE_FIXTURE==='1') items=Array.from({length:16},(_,index)=>({...items[index%3],id:`33333333-3333-4333-8333-${String(index+1).padStart(12,'0')}`,title:`Responsive milestone ${index+1}`,description:'A detailed roadmap description with enough information to test concise summaries and expandable content. Flight Desk keeps PEK / JFK and Boeing 737-800 unchanged.',publication_status:index===15?'draft':'published',sort_order:index}));
let content=Object.entries(landingDefaults).flatMap(([content_key,value])=>['draft','published'].map(publication_status=>({content_key,content:value,publication_status,updated_at:timestamp})));
let translations=[];
const dynamicTranslations=require('./content-translation-fixture.cjs')(()=>items);
const server=http.createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(origin&&/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))res.setHeader('Access-Control-Allow-Origin',origin);
 res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
 if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
 let text='';for await(const chunk of req)text+=chunk;let body={};try{body=text?JSON.parse(text):{};}catch{}
 const url=new URL(req.url,`http://127.0.0.1:${port}`);
 let role=null;try{const payload=JSON.parse(Buffer.from((req.headers.authorization||'').split('.')[1]||'','base64url'));role=Object.keys(ids).find(key=>ids[key]===payload.sub)||null;}catch{}
 const send=(value,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
 const rows=value=>send((req.headers.accept||'').includes('application/vnd.pgrst.object+json')?(value[0]??null):value);
 const deny=()=>send({message:'Access denied',code:'42501'},403);
 if(dynamicTranslations.handle(url,req,body,role,send,rows))return;
 if(url.pathname==='/auth/v1/token')return body.password==='test-only-password'?send(session(body.email==='admin@example.test'?'admin':'member')):send({code:'invalid_credentials',message:'Invalid login credentials'},400);
 if(url.pathname==='/auth/v1/signup')return send({user:{...user('member'),email:body.email},session:null});
 if(url.pathname==='/auth/v1/user')return role?send(user(role)):send({message:'Not authenticated'},401);
 if(url.pathname==='/auth/v1/logout'||url.pathname==='/auth/v1/recover')return send({});
 if(url.pathname==='/rest/v1/rpc/is_site_admin'||url.pathname==='/rest/v1/rpc/is_roadmap_admin')return send(role==='admin');
 if(url.pathname==='/rest/v1/rpc/search_airports'){
  const q=String(body.search_query||'').toLowerCase();
  if(q==='failure')return send({message:'Local reference failure'},503);
  const found=airportReferences.filter(a=>a.status==='listed'&&['iata_code','icao_code','ident','name','municipality','country_name'].some(k=>String(a[k]||'').toLowerCase().includes(q)))
   .sort((a,b)=>Number([b.iata_code,b.icao_code].some(v=>v?.toLowerCase()===q))-Number([a.iata_code,a.icao_code].some(v=>v?.toLowerCase()===q)));
  return send(found.slice(0,Math.min(Number(body.result_limit)||12,20)));
 }
 if(url.pathname==='/rest/v1/translation_overrides'){
  if(process.env.I18N_OVERRIDES_UNAVAILABLE==='1')return send({code:'PGRST205',message:'Local fixture table unavailable'},404);
  const key=url.searchParams.get('translation_key')?.replace(/^eq\./,'');
  const version=url.searchParams.get('version')?.replace(/^eq\./,'');
  const updated=url.searchParams.get('updated_at')?.replace(/^eq\./,'');
  let found=translations.filter(row=>(!key||row.translation_key===key)&&(!version||row.version===Number(version))&&(!updated||row.updated_at===updated));
  if(req.method==='GET')return rows(role==='admin'?found:found.filter(row=>row.is_published));
  if(role!=='admin')return deny();
  if(req.method==='POST'){
   if(translations.some(row=>row.translation_key===body.translation_key&&row.locale===body.locale))return send({code:'23505'},409);
   const row={...body,version:1,updated_at:new Date().toISOString()};translations.push(row);return rows([row]);
  }
  if(req.method==='PATCH'){found.forEach(row=>Object.assign(row,body,{version:row.version+1,updated_at:new Date().toISOString()}));return rows(found);}
  if(req.method==='DELETE'){translations=translations.filter(row=>!found.includes(row));return rows(found);}
 }
 if(url.pathname==='/rest/v1/profiles'){
  if(process.env.I18N_PROFILE_UNAVAILABLE==='1'&&url.searchParams.get('select')==='preferred_locale')return send({code:'42703',message:'Local fixture column unavailable'},400);
  if(!role||url.searchParams.get('id')!==`eq.${ids[role]}`)return deny();
  if(req.method==='PATCH')Object.assign(profiles[ids[role]],body);
  return rows([profiles[ids[role]]]);
 }
 if(url.pathname==='/rest/v1/flights'){
  if(req.method==='POST'){
   if(!role||body.user_id!==ids[role])return deny();
   const item={...body,id:require('node:crypto').randomUUID()};flights.unshift(item);return rows([item]);
  }
  if(!role||url.searchParams.get('user_id')!==`eq.${ids[role]}`)return deny();
  const filtered=flights.filter(item=>item.user_id===ids[role]&&(!url.searchParams.has('id')||url.searchParams.get('id')===`eq.${item.id}`));
  if(req.method==='PATCH')filtered.forEach(item=>Object.assign(item,body));
  return rows(filtered);
 }
 if(url.pathname==='/rest/v1/roadmap_items'){
  if(req.method==='GET')return rows(items.filter(item=>(role==='admin'||item.publication_status==='published')&&(!url.searchParams.has('publication_status')||url.searchParams.get('publication_status')===`eq.${item.publication_status}`)));
  if(role!=='admin')return deny();
  const id=url.searchParams.get('id')?.replace('eq.','');
  if(req.method==='POST'){const item={...body,id:require('node:crypto').randomUUID(),created_at:timestamp,updated_at:timestamp,sort_order:0};items.push(item);dynamicTranslations.sync(item);return rows([item]);}
  const item=items.find(item=>item.id===id);if(!item)return send({message:'Not found'},404);
  if(req.method==='PATCH'){Object.assign(item,body);dynamicTranslations.sync(item);}if(req.method==='DELETE')items=items.filter(item=>item.id!==id);return rows([item]);
 }
 if(url.pathname==='/rest/v1/site_content'){
  if(req.method==='GET')return rows(content.filter(item=>(role==='admin'||item.publication_status==='published')&&(!url.searchParams.has('publication_status')||url.searchParams.get('publication_status')===`eq.${item.publication_status}`)));
  if(role!=='admin')return deny();
  for(const item of body){const existing=content.find(row=>row.content_key===item.content_key&&row.publication_status===item.publication_status);if(existing)Object.assign(existing,item);else content.push(item);}return rows(body);
 }
 if(url.pathname==='/rest/v1/rpc/publish_landing_page'){
  if(role!=='admin')return deny();const drafts=content.filter(item=>item.publication_status==='draft');content=content.filter(item=>item.publication_status==='draft').concat(drafts.map(item=>({...item,publication_status:'published'})));return send(drafts.length);
 }
 return send({message:'Unsupported local test endpoint'},404);
});
server.listen(port,'127.0.0.1',()=>console.log(`Isolated theme API ready on ${port}`));
