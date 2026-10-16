// Loopback only; all saves go to tests/support/theme-api.cjs in-memory fixtures.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const origin=process.env.AIRPORT_BROWSER_ORIGIN || 'http://127.0.0.1:3110';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const id='44444444-4444-4444-8444-444444444444';
const uid='22222222-2222-4222-8222-222222222222';
function cookie(){const exp=Math.floor(Date.now()/1000)+3600;const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:uid,aud:'authenticated',role:'authenticated',exp})).toString('base64url'),'local-test-signature'].join('.');return{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'local-test-only',token_type:'bearer',expires_at:exp,user:{id:uid,email:'member@example.test',aud:'authenticated',role:'authenticated'}})).toString('base64url'),domain:new URL(origin).hostname,path:'/'};}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'});
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const publicSearch=await page.request.get(origin+'/api/airports?q=00AK');assert.equal(publicSearch.status(),200);assert.equal((await publicSearch.json()).airports[0].iata,null);
  await page.goto(origin+'/flights/new');await page.waitForURL(url=>url.pathname==='/auth'&&url.searchParams.get('next')==='/flights/new');
  await context.addCookies([cookie()]);
  await page.goto(origin+'/flights/new',{waitUntil:'networkidle'});
  const dep=page.getByRole('combobox',{name:'Departure airport',exact:true});
  const arr=page.getByRole('combobox',{name:'Arrival airport',exact:true});
  let searchRequests=0;page.on('request',r=>{if(r.url().includes('/api/airports?'))searchRequests++;});
  await dep.pressSequentially('PEK',{delay:30});await page.getByRole('option').filter({hasText:'Beijing Capital'}).waitFor();
  assert.equal(searchRequests,1,'debounce sends one request for a rapid three-letter query');
  await dep.press('ArrowDown');assert(await dep.getAttribute('aria-activedescendant'));await dep.press('Enter');
  assert.equal(await dep.inputValue(),'Beijing Capital International Airport');
  assert.equal(await page.getByLabel('Departure timezone',{exact:true}).inputValue(),'Asia/Shanghai');
  await arr.fill('00AK');await page.getByRole('option').filter({hasText:'Lowell Field'}).waitFor();
  await arr.press('ArrowDown');await arr.press('Enter');assert.equal(await arr.inputValue(),'Lowell Field');
  assert.equal(await page.getByLabel('Arrival timezone',{exact:true}).inputValue(),'America/Anchorage');
  await page.getByLabel('Departure date',{exact:true}).fill('2026-10-20');await page.getByLabel('Departure local time',{exact:true}).fill('10:00');
  await page.getByLabel('Arrival date',{exact:true}).fill('2026-10-20');await page.getByLabel('Arrival local time',{exact:true}).fill('10:00');
  await page.getByLabel('Actual duration hours',{exact:true}).fill('0');await page.getByLabel('Actual duration minutes',{exact:true}).fill('0');
  await page.getByPlaceholder('Anything you want to remember…').fill('Airport browser create check');
  await page.getByRole('button',{name:'Save flight →',exact:true}).click();await page.waitForURL('**/dashboard?created=1');
  await page.getByRole('link',{name:'PEK → 00AK',exact:true}).click();
  await page.getByText('Airport browser create check',{exact:true}).waitFor();
  assert.equal(await page.getByText('0h 0m',{exact:true}).count(),1,'zero actual duration is retained');
  await page.getByRole('link',{name:'Edit flight',exact:true}).click();
  assert.equal(await arr.inputValue(),'Lowell Field');
  assert.equal(await page.getByLabel('Actual duration hours',{exact:true}).inputValue(),'0');
  console.log('PASS public reference endpoint, auth guard, debounce, keyboard selection, automatic zones, no-IATA create/reopen, independent actual zero');
  // Existing snapshot loads without searching or requiring the catalog entry.
  await page.goto(origin+'/flights/'+id+'/edit',{waitUntil:'networkidle'});
  assert.equal(await dep.inputValue(),'Beijing Capital');
  await page.getByPlaceholder('Anything you want to remember…').fill('Airport browser legacy edit');
  await page.getByRole('button',{name:'Save changes →',exact:true}).click();await page.waitForURL(origin+'/flights/'+id+'?updated=1');
  await page.getByText('Airport browser legacy edit',{exact:true}).waitFor();
  await page.goto(origin+'/flights/new',{waitUntil:'networkidle'});
  await dep.fill('failure');await page.getByRole('alert').filter({hasText:'Airport search is unavailable'}).waitFor();
  await dep.press('Escape');assert.equal(await dep.getAttribute('aria-expanded'),'false');
  await dep.fill('zzzz-no-such-airport');await page.getByRole('status').filter({hasText:'No matching airports'}).waitFor();
  await page.getByRole('button',{name:'Enter airport manually',exact:true}).first().click();
  await page.getByLabel('Airport name',{exact:true}).fill('Manual field');
  await page.getByLabel('Country code (optional)',{exact:true}).fill('NP');
  await page.getByLabel('Departure timezone',{exact:true}).fill('Asia/Kathmandu');
  await arr.fill('LHR');await page.getByRole('option').filter({hasText:'London Heathrow'}).click();
  await page.getByLabel('Departure date',{exact:true}).fill('2026-10-20');await page.getByLabel('Departure local time',{exact:true}).fill('10:00');
  await page.getByLabel('Arrival date',{exact:true}).fill('2026-10-20');await page.getByLabel('Arrival local time',{exact:true}).fill('12:00');
  await page.getByRole('button',{name:'Save flight →',exact:true}).click();await page.waitForURL('**/dashboard?created=1');
  await page.getByRole('link',{name:'Manual field → LHR',exact:true}).waitFor();
  console.log('PASS legacy snapshot editing, upstream error versus no results, Escape, manual name-only airport save');
  // Stale requests cannot replace a newer query; this interception stays loopback-only.
  await page.goto(origin+'/flights/new',{waitUntil:'networkidle'});
  await page.route('**/api/airports?q=SLOW',async route=>{await new Promise(r=>setTimeout(r,650));try{await route.fulfill({json:{airports:[{id:'old',name:'Stale result',ident:'OLD',origin:'catalog'}]}});}catch{}});
  await dep.fill('SLOW');await page.waitForRequest(r=>r.url().endsWith('q=SLOW'));
  await dep.fill('PEK');await page.getByRole('option').filter({hasText:'Beijing Capital'}).waitFor();
  await page.waitForTimeout(800);assert.equal(await page.getByRole('option').filter({hasText:'Stale result'}).count(),0);
  await page.unroute('**/api/airports?q=SLOW');
  await dep.press('ArrowDown');await dep.press('Enter');
  await arr.fill('JFK');await page.getByRole('option').filter({hasText:'John F. Kennedy'}).click();
  await page.getByLabel('Departure date',{exact:true}).fill('2026-11-01');await page.getByLabel('Departure local time',{exact:true}).fill('08:00');
  await page.getByLabel('Arrival date',{exact:true}).fill('2026-11-01');await page.getByLabel('Arrival local time',{exact:true}).fill('01:30');
  const clock=page.getByLabel('Arrival clock change',{exact:true});await clock.waitFor();assert.equal(await clock.inputValue(),'');
  await clock.selectOption('later');
  await page.getByLabel('Arrival timezone',{exact:true}).fill('America/New_York'); // unchanged clock resets explicit choice safely
  await page.getByLabel('Arrival date',{exact:true}).fill('2026-03-08');await page.getByLabel('Arrival local time',{exact:true}).fill('02:30');
  await page.getByRole('status').filter({hasText:'does not exist'}).waitFor();
  for(const scheme of ['light','dark']){
   await page.evaluate(mode=>{localStorage.setItem('flightdesk-theme',mode);document.documentElement.style.colorScheme=mode;document.documentElement.setAttribute('data-theme',mode);},scheme);
   for(const width of [1440,390]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  }
  await page.screenshot({path:'/tmp/flightdesk-airports-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS stale-result protection, DST overlap selection/gap rejection, Light/Dark mobile layout and no runtime errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
