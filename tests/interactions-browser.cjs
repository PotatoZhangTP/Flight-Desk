// Local production build + tests/support/theme-api.cjs ONLY. No real DB writes.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.INTERACTION_TEST_ORIGIN || 'http://127.0.0.1:3110';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
function cookie(role) {
  const id=role==='admin'?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222';
  const exp=Math.floor(Date.now()/1000)+3600;
  const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp})).toString('base64url'),'local-test-signature'].join('.');
  return {name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'local-test-only',token_type:'bearer',expires_at:exp,user:{id,email:`${role}@example.test`,aud:'authenticated',role:'authenticated'}})).toString('base64url'),domain:new URL(origin).hostname,path:'/'};
}
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    const page=await context.newPage(); const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    let loginCalls=0;
    await page.route('**/auth/v1/token*',async route=>{loginCalls++;await delay(700);await route.continue();});
    await page.goto(origin+'/auth',{waitUntil:'networkidle'});
    await page.getByLabel('Email',{exact:true}).fill('member@example.test');
    await page.getByLabel('Password',{exact:true}).fill('wrong-password');
    await page.locator('form').getByRole('button',{name:'Sign in',exact:true}).click();
    const signing=page.getByRole('button',{name:'Signing in…',exact:true});
    await signing.waitFor();assert(await signing.isDisabled());assert.equal(await signing.locator('svg').count(),1);
    await page.locator('form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
    await page.getByRole('alert').filter({hasText:'Email or password is incorrect.'}).waitFor();
    assert.equal(loginCalls,1);assert(await page.locator('form').getByRole('button',{name:'Sign in',exact:true}).isEnabled());
    assert.equal(await page.getByLabel('Email',{exact:true}).inputValue(),'member@example.test');
    console.log('PASS immediate sign-in spinner, duplicate-submit lock, auth failure recovery and retained inputs');

    await context.addCookies([cookie('member')]);
    let actionCalls=0;let fail=false;
    await page.route(origin+'/**',async route=>{
      if(route.request().method()==='POST'&&route.request().headers()['next-action']) {
        actionCalls++;await delay(650);if(fail)return route.abort('failed');
      }
      await route.continue();
    });
    await page.goto(origin+'/settings',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Edit display name',exact:true}).click();
    const name=page.getByRole('textbox',{name:'Display name',exact:true});await name.fill('Interaction Test Pilot');
    fail=true;actionCalls=0;
    await page.getByRole('button',{name:'Save',exact:true}).evaluate(button=>{button.click();button.click();});
    await page.getByRole('button',{name:'Saving…',exact:true}).waitFor();
    assert(await name.isDisabled());
    await page.getByRole('alert').filter({hasText:'Save could not be confirmed'}).waitFor();
    assert.equal(actionCalls,1);assert(await name.isEnabled());assert.equal(await name.inputValue(),'Interaction Test Pilot');
    fail=false;actionCalls=0;
    await page.getByRole('button',{name:'Save',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Saved'}).waitFor();assert.equal(actionCalls,1);
    await page.getByRole('button',{name:'Edit display name',exact:true}).click();await name.fill('Unsaved');
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByText('Interaction Test Pilot',{exact:true}).first().waitFor();
    console.log('PASS profile network failure and retry, retained edits, saved snapshot cancel and one write per click');

    await page.getByRole('button',{name:'Change password',exact:true}).click();
    await page.getByRole('button',{name:'Sending…',exact:true}).waitFor();
    await page.getByRole('status').filter({hasText:'Check your email'}).waitFor();
    await page.getByRole('button',{name:'Open user menu'}).click();
    await page.getByRole('link',{name:'My Profile',exact:true}).click();
    await page.getByRole('button',{name:'Edit bio',exact:true}).click();
    await page.getByLabel('Profile bio',{exact:true}).fill('Only in isolated test memory');
    await page.getByRole('button',{name:'Save bio',exact:true}).click();
    await page.getByRole('button',{name:'Saving…',exact:true}).waitFor();
    await page.getByRole('status').filter({hasText:'Saved'}).waitFor();
    console.log('PASS password email and profile bio pending and success states');

    await page.goto(origin+'/auth/reset-password',{waitUntil:'networkidle'});
    await page.getByLabel('Email',{exact:true}).fill('member@example.test');actionCalls=0;
    fail=true;
    await page.getByRole('button',{name:'Send reset link',exact:true}).click();
    await page.getByRole('button',{name:'Sending reset link…',exact:true}).waitFor();
    await page.getByRole('alert').filter({hasText:'request could not be confirmed'}).waitFor();
    assert.equal(await page.getByLabel('Email',{exact:true}).inputValue(),'member@example.test');
    assert(await page.getByRole('button',{name:'Send reset link',exact:true}).isEnabled());
    fail=false;actionCalls=0;
    await page.getByRole('button',{name:'Send reset link',exact:true}).click();
    await page.getByRole('button',{name:'Sending reset link…',exact:true}).waitFor();
    await page.locator('form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
    await page.getByRole('status').filter({hasText:'Check your inbox'}).waitFor();assert.equal(actionCalls,1);
    console.log('PASS server-action password reset pending status and pre-queue duplicate protection');

    const flightId='44444444-4444-4444-8444-444444444444';
    await page.goto(origin+`/flights/${flightId}/edit`,{waitUntil:'networkidle'});
    const notes=page.getByPlaceholder('Anything you want to remember…');await notes.fill('Interaction save check');
    fail=true;actionCalls=0;
    await page.getByRole('button',{name:'Save changes →',exact:true}).click();
    await page.getByRole('button',{name:'Updating flight…',exact:true}).waitFor();
    await page.locator('form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
    await page.getByRole('alert').filter({hasText:'save could not be confirmed'}).waitFor();
    assert.equal(actionCalls,1);assert.equal(await notes.inputValue(),'Interaction save check');assert(await notes.isEnabled());
    fail=false;actionCalls=0;await page.getByRole('button',{name:'Save changes →',exact:true}).click();
    await page.waitForURL(origin+`/flights/${flightId}?updated=1`);
    await page.getByRole('status').filter({hasText:'Flight updated successfully.'}).waitFor();assert.equal(actionCalls,1);
    console.log('PASS flight pending state, double-submit protection, failed save retains entries, retry and post-redirect success');

    await context.addCookies([cookie('admin')]);
    await page.goto(origin+'/admin/roadmap',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:/New roadmap item/}).click();
    await page.getByLabel('Feature name',{exact:true}).fill('Interaction browser milestone');
    await page.getByRole('button',{name:'Save item',exact:true}).click();
    await page.getByRole('button',{name:'Saving…',exact:true}).waitFor();
    assert(await page.getByLabel('Feature name',{exact:true}).isDisabled());
    await page.getByRole('status').filter({hasText:'Draft saved'}).waitFor();
    page.once('dialog',dialog=>dialog.accept());
    const remove=page.getByRole('button',{name:'Delete Interaction browser milestone',exact:true});await remove.click();
    await page.waitForFunction(()=>document.querySelector('button[aria-label="Delete Interaction browser milestone"]')?.getAttribute('aria-busy')==='true');
    await page.getByRole('status').filter({hasText:'deleted'}).waitFor();
    await page.goto(origin+'/admin/landing-page',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Save Draft',exact:true}).click();
    await page.getByRole('button',{name:'Saving…',exact:true}).waitFor();
    await page.getByRole('status').filter({hasText:'Draft saved'}).waitFor();
    page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Publish Saved Draft',exact:true}).click();
    await page.getByRole('button',{name:'Publishing…',exact:true}).waitFor();
    await page.getByRole('status').filter({hasText:'Published'}).waitFor();
    console.log('PASS Roadmap save/delete and CMS draft/publish show the operation-specific spinner');

    // Force a slow, non-prefetched internal link; Next owns navigation and history.
    await page.goto(origin+'/dashboard',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Choose color theme',exact:true}).click();
    await page.getByRole('radio',{name:'Dark',exact:true}).click();
    await page.route('**/settings?*',async route=>{if(route.request().headers().rsc==='1')await delay(900);await route.continue();});
    await page.getByRole('button',{name:'Open user menu'}).click();await page.getByRole('link',{name:'Settings',exact:true}).click();
    await page.locator('[data-page-loading]').waitFor();
    assert.equal(await page.locator('[data-page-loading]').count(),1);
    const overlay=await page.locator('[data-page-loading]').evaluate(el=>({blur:getComputedStyle(el).backdropFilter,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
    assert.match(overlay.blur,/blur\(10px\)/);assert.equal(overlay.width,1440);assert.equal(overlay.height,1000);
    assert(await page.locator('[inert]').count());
    await page.waitForURL(origin+'/settings');
    await page.getByRole('heading',{name:'Appearance',exact:true}).waitFor();
    assert.equal(await page.locator('[data-page-loading]').count(),0);
    assert.equal(await page.locator('[inert]').count(),0);
    await page.goBack();await page.getByRole('heading').filter({hasText:'Good morning'}).waitFor();
    await page.goForward();await page.getByRole('heading',{name:'Appearance',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>localStorage.getItem('flightdesk-theme')),'dark');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('main').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:'/tmp/flightdesk-interactions-dark-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    for (const theme of ['Light','Dark']) {
      await page.goto(origin,{waitUntil:'networkidle'});
      await page.getByRole('button',{name:'Choose color theme',exact:true}).click();
      await page.getByRole('radio',{name:theme,exact:true}).click();
      const card=page.locator('.interaction-card').first();
      await page.mouse.move(1,1);
      const normal=await card.evaluate(el=>getComputedStyle(el).borderTopColor);
      await card.hover();
      assert.notEqual(await card.evaluate(el=>getComputedStyle(el).borderTopColor),normal);
      await page.keyboard.press('Tab');await card.locator('a,button').first().focus();
      const focus=await card.locator('a,button').first().evaluate(el=>({style:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth}));
      assert.equal(focus.style,'solid');assert.equal(focus.width,'2px');
      await page.goto(origin+'/roadmap',{waitUntil:'networkidle'});
      const detail=page.locator('article').first();const before=await detail.evaluate(el=>getComputedStyle(el).borderTopColor);
      await detail.hover();assert.equal(await detail.evaluate(el=>getComputedStyle(el).borderTopColor),before);
    }
    console.log('PASS actual Light/Dark card hover, keyboard focus rings and no misleading hover on static Roadmap details');
    assert.deepEqual(errors,[]);
    console.log('PASS delayed Next navigation feedback, Back/Forward, theme continuity, reduced motion and mobile layout; no runtime/hydration errors');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
