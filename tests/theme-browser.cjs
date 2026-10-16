// Run only against the local production build and tests/support/theme-api.cjs.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const origin=process.env.THEME_TEST_ORIGIN || 'http://localhost:3110';
assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname),'Browser fixture must never target a deployed site');
const flightId='44444444-4444-4444-8444-444444444444';
function cookie(role){const id=role==='admin'?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222',exp=Math.floor(Date.now()/1000)+3600;const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp})).toString('base64url'),'local-test-signature'].join('.');return{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'local-test-only',token_type:'bearer',expires_at:exp,user:{id,email:`${role}@example.test`,aud:'authenticated',role:'authenticated'}})).toString('base64url'),domain:new URL(origin).hostname,path:'/'};}
async function color(page,mode){await page.waitForFunction(expected=>getComputedStyle(document.body).backgroundColor===expected,mode==='dark'?'rgb(16, 17, 20)':'rgb(255, 255, 255)');}
async function choose(page,mode){await page.getByRole('button',{name:'Choose color theme',exact:true}).click();await page.getByRole('radio',{name:mode,exact:true}).click();}
async function checkMenuBounds(page){for(const width of [320,390,600,1440]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const trigger=page.getByRole('button',{name:'Choose color theme',exact:true});await trigger.click();const box=await page.locator('#theme-choices').boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=width,`theme menu ${width}px`);await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);}await page.setViewportSize({width:1440,height:1000});}
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const errors=[];
const context=await browser.newContext({colorScheme:'dark',viewport:{width:1440,height:1000}});
context.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',message=>{if(message.type()==='error'&&/hydration|hydrating|did not match|server rendered|Minified React error #4(?:18|23|25)/i.test(message.text()))errors.push(message.text());});});
try{
 const p=await context.newPage();await p.goto(origin,{waitUntil:'networkidle'});await color(p,'dark');assert.equal(await p.locator('html').getAttribute('data-theme'),'system');
 await checkMenuBounds(p);
 await choose(p,'Light');await color(p,'light');assert.equal(await p.evaluate(()=>localStorage.getItem('flightdesk-theme')),'light');
 await choose(p,'Dark');await color(p,'dark');await p.reload({waitUntil:'networkidle'});await color(p,'dark');
 await p.emulateMedia({colorScheme:'light'});await color(p,'dark');
 await choose(p,'System');await color(p,'light');await p.emulateMedia({colorScheme:'dark'});await color(p,'dark');
 await p.emulateMedia({colorScheme:'light'});await color(p,'light');
 await choose(p,'Dark');const other=await context.newPage();await other.goto(origin+'/roadmap',{waitUntil:'networkidle'});await color(other,'dark');
 await choose(p,'Light');await color(other,'light');await other.close();await choose(p,'Dark');
 const state=await context.storageState();const reopened=await browser.newContext({storageState:state,colorScheme:'light'});const reopenedPage=await reopened.newPage();await reopenedPage.goto(origin+'/auth',{waitUntil:'networkidle'});await color(reopenedPage,'dark');await reopened.close();
 console.log('PASS visitor Light/Dark/System, live OS changes, manual override, refresh, cross-tab sync and persisted browser reopening');
 // Abort hydration bundles: the inline head initializer must still choose the saved theme.
 const early=await browser.newContext({storageState:state,colorScheme:'light'});const earlyPage=await early.newPage();await earlyPage.route('**/_next/static/**/*.js',route=>route.abort());await earlyPage.goto(origin+'/auth');await color(earlyPage,'dark');assert.equal(await earlyPage.locator('html').getAttribute('data-theme'),'dark');await early.close();
 const blocked=await browser.newContext({colorScheme:'dark'});await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));const blockedPage=await blocked.newPage();await blockedPage.goto(origin,{waitUntil:'networkidle'});await color(blockedPage,'dark');await choose(blockedPage,'Light');await color(blockedPage,'light');await blocked.close();
 console.log('PASS pre-hydration saved theme and blocked localStorage graceful fallback');
 await p.goto(origin+'/auth',{waitUntil:'networkidle'});await p.getByLabel('Email',{exact:true}).fill('member@example.test');await p.getByLabel('Password',{exact:true}).fill('wrong-password');await p.locator('form button:not([type="button"])').click();await p.getByRole('alert').filter({hasText:'Email or password is incorrect.'}).waitFor();
 await p.getByRole('button',{name:'Show password',exact:true}).click();assert.equal(await p.getByLabel('Password',{exact:true}).getAttribute('type'),'text');await p.getByRole('button',{name:'Hide password',exact:true}).click();
 await p.getByLabel('Password',{exact:true}).fill('test-only-password');await p.locator('form button:not([type="button"])').click();await p.waitForURL('**/dashboard');await color(p,'dark');
 assert.equal(await p.getByRole('button',{name:'Choose color theme',exact:true}).count(),1);await choose(p,'Light');await color(p,'light');await choose(p,'Dark');await color(p,'dark');
 await p.goto(origin,{waitUntil:'networkidle'});await checkMenuBounds(p);await p.goto(origin+'/dashboard',{waitUntil:'networkidle'});
 await p.getByRole('button',{name:'Open user menu'}).click();await p.getByRole('link',{name:'Settings',exact:true}).click();await p.getByRole('heading',{name:'Appearance',exact:true}).waitFor();
 await p.getByRole('radio',{name:'Light',exact:true}).locator('..').click();await color(p,'light');await p.getByRole('radio',{name:'System',exact:true}).locator('..').click();await color(p,'light');await p.emulateMedia({colorScheme:'dark'});await color(p,'dark');await p.getByRole('radio',{name:'Dark',exact:true}).locator('..').click();
 await p.reload({waitUntil:'networkidle'});await p.getByRole('radio',{name:'Dark',exact:true}).waitFor();assert.equal(await p.getByRole('radio',{name:'Dark',exact:true}).isChecked(),true);
 await p.getByRole('button',{name:'Open user menu'}).click();await p.getByRole('button',{name:'Sign out',exact:true}).click();await p.waitForURL(origin+'/');await color(p,'dark');assert.equal(await p.evaluate(()=>localStorage.getItem('flightdesk-theme')),'dark');
 console.log('PASS actual local sign-in/error/password visibility, Settings Appearance and sign-out retain theme');
 // Verify every route with local member/admin fixtures in both palettes.
 const routes=[['/','Every Flight Tells a Story'],['/roadmap','Building the Next Journey'],['/auth','Keep Every'],['/auth/reset-password','Reset your password'],['/auth/update-password','Choose a new password'],['/dashboard','Good morning'],['/flights/new','Add a Flight'],[`/flights/${flightId}`,'PEK'],[`/flights/${flightId}/edit`,'Edit flight'],['/profile','Test Pilot'],['/settings','Settings']];
 await context.addCookies([cookie('member')]);
 for(const mode of ['light','dark']){
  await p.goto(origin,{waitUntil:'networkidle'});await choose(p,mode==='dark'?'Dark':'Light');
  for(const [route,title] of routes){await p.goto(origin+route,{waitUntil:'networkidle'});await p.getByRole('heading').filter({hasText:title}).first().waitFor();await color(p,mode);
   assert.equal(await p.getByRole('button',{name:'Choose color theme',exact:true}).count(),route.startsWith('/auth')?0:1,route);
   if(mode==='dark'){const white=await p.evaluate(()=>[...document.querySelectorAll('main section, main div, input, textarea, select, header, footer')].filter(e=>{const r=e.getBoundingClientRect();return r.width*r.height>3000&&getComputedStyle(e).backgroundColor==='rgb(255, 255, 255)'}).map(e=>e.tagName));assert.deepEqual(white,[],route);}
   for(const width of [1440,390]){await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' '+width);}await p.setViewportSize({width:1440,height:1000});
   if(route==='/auth'||route==='/settings'||route==='/flights/new')await p.screenshot({path:`/tmp/theme-${mode}-${route.replaceAll('/','-')}.png`,fullPage:true});
  }
 }
 console.log('PASS all public/auth/private routes in Light and Dark, mobile and desktop, no accidental white panels');
 // Existing flight editing action remains functional; only the local fixture is updated.
 await p.goto(origin+`/flights/${flightId}/edit`,{waitUntil:'networkidle'});await p.getByPlaceholder('Anything you want to remember…',{exact:true}).fill('Theme browser edit check');await p.getByRole('button',{name:'Save changes →',exact:true}).click();await p.waitForURL(origin+`/flights/${flightId}?updated=1`);await p.getByText('Theme browser edit check',{exact:true}).waitFor();await color(p,'dark');
 // Password reset stays on the same local origin; mock service never sends email.
 await p.goto(origin+'/auth/reset-password',{waitUntil:'networkidle'});await p.getByLabel('Email',{exact:true}).fill('member@example.test');await p.getByRole('button',{name:'Send reset link',exact:true}).click();await p.getByText('Check your inbox for the password reset link.',{exact:true}).waitFor();await color(p,'dark');
 await p.goto(origin+'/auth/update-password',{waitUntil:'networkidle'});await p.getByLabel('New password',{exact:true}).fill('new-test-only-password');await p.getByRole('button',{name:'Update password',exact:true}).click();await p.waitForURL('**/dashboard?password_updated=1');await p.getByRole('status').filter({hasText:'Password updated successfully.'}).waitFor();
 console.log('PASS local flight edit/save and password reset/update submit flows');
 await context.addCookies([cookie('admin')]);
 for(const mode of ['light','dark']){await p.goto(origin,{waitUntil:'networkidle'});await choose(p,mode==='dark'?'Dark':'Light');for(const [route,title] of [['/admin','Admin Panel'],['/admin/roadmap','Manage roadmap'],['/admin/landing-page','Manage Landing Page']]){await p.goto(origin+route,{waitUntil:'networkidle'});await p.getByRole('heading',{name:title,exact:true}).waitFor();await color(p,mode);for(const width of [1440,390]){await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' '+width);}await p.setViewportSize({width:1440,height:1000});}}
 console.log('PASS all administrator routes in both palettes and mobile layouts');
 const itemTitle=`Theme browser ${Date.now()}`;
 await p.goto(origin+'/admin/roadmap',{waitUntil:'networkidle'});await p.getByRole('button',{name:/New roadmap item/}).click();await p.getByLabel('Feature name',{exact:true}).fill(itemTitle);await p.getByLabel('Description',{exact:true}).fill('Only in local test memory');assert.deepEqual(await p.locator('select[name="status"] option').allTextContents(),['Planned','Completed','On Hold']);await p.getByRole('button',{name:'Save item',exact:true}).click();await p.getByRole('status').filter({hasText:'Draft saved'}).waitFor();
 await p.getByRole('button',{name:`Edit ${itemTitle}`,exact:true}).click();await p.locator('select[name="status"]').selectOption('completed');await p.locator('select[name="publication_status"]').selectOption('published');await p.getByRole('button',{name:'Save item',exact:true}).click();await p.getByRole('status').filter({hasText:'Published'}).waitFor();p.once('dialog',d=>d.accept());await p.getByRole('button',{name:`Delete ${itemTitle}`,exact:true}).click();await p.getByRole('status').filter({hasText:'deleted'}).waitFor();
 await p.goto(origin+'/admin/landing-page',{waitUntil:'networkidle'});await p.getByRole('button',{name:'Save Draft',exact:true}).click();await p.getByRole('status').filter({hasText:'Draft saved'}).waitFor();p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Publish Saved Draft',exact:true}).click();await p.getByRole('status').filter({hasText:'Published'}).waitFor();
 await context.addCookies([cookie('member')]);await p.goto(origin+'/admin',{waitUntil:'networkidle'});await p.getByRole('heading',{name:'Access denied',exact:true}).waitFor();
 console.log('PASS all admin routes in both themes, draft/edit/publish/delete and CMS save/publish, ordinary user denied');
 await p.emulateMedia({reducedMotion:'reduce'});const animation=await p.locator('body').evaluate(e=>getComputedStyle(e).animationName);assert.equal(animation,'none');assert.deepEqual(errors,[]);
 console.log('PASS reduced motion and no browser runtime/hydration errors');
}finally{await browser.close();}})();
