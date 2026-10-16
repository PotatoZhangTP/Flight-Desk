const {openPreferences,chooseLanguage,chooseTheme}=require('./support/preferences-browser.cjs');
// All requests use isolated loopback fixtures. Run with LANDING_RESPONSIVE_FIXTURE=1.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const origin=process.env.THEME_TEST_ORIGIN||'http://localhost:3110';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const errors=[];
 try {
  for(const locale of ['en','zh-CN']) for(const theme of ['light','dark']) {
   const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:theme});
   await context.addCookies([{name:'flightdesk-locale',value:locale,domain:new URL(origin).hostname,path:'/'}]);
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   page.on('console',message=>{if(message.type()==='error'&&/hydration|hydrating|did not match/i.test(message.text()))errors.push(message.text());});
   await page.goto(origin,{waitUntil:'networkidle'});
   await page.locator('[data-product-preview] img').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{const image=document.querySelector('[data-product-preview] img');return image.complete&&image.naturalWidth===1024;});
   await page.evaluate(()=>scrollTo(0,0));
   for(const width of [320,375,390,430,768,1024,1440,1920]) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${locale}/${theme}/${width} overflow`);
    assert.equal(await page.locator('#features article').count(),6);
    const grid=await page.locator('.feature-feed').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
    assert.equal(grid,width<640?1:width<1024?2:3);
    const boxes=await page.locator('.site-header > .site-container, main > .site-container, #roadmap > .site-container, footer.site-container').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,width:r.width,padding:getComputedStyle(e).paddingLeft};}));
    assert.equal(boxes.length,6);
    for(const box of boxes) {assert.equal(box.x,boxes[0].x);assert.equal(box.width,boxes[0].width);assert.equal(box.padding,boxes[0].padding);}
    if(width<640) {
     assert(await page.locator('.landing-roadmap-mobile').isVisible());
     assert(!await page.locator('.landing-roadmap-desktop').isVisible());
     assert.equal(await page.locator('.landing-roadmap-mobile details').count(),4);
     const row=await page.locator('#features article').first().boundingBox();assert(row.height<230);
     const footer=await page.locator('footer nav').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().x));assert(footer[1]>footer[0]);
     const image=await page.locator('[data-product-preview] img').boundingBox();assert(Math.abs(image.width/image.height-1024/800)<0.02);
    } else assert(await page.locator('.landing-roadmap-desktop').isVisible());
    if([390,1440].includes(width))await page.screenshot({path:`/tmp/landing-${locale}-${theme}-${width}.png`,fullPage:true});
   }
   await page.setViewportSize({width:390,height:844});
   const mobile=page.locator('.landing-roadmap-mobile');
   const summary=mobile.locator('summary').first();await summary.focus();await page.keyboard.press('Enter');
   assert(await mobile.locator('details').first().getAttribute('open')!==null);
   await mobile.locator('details').first().getByRole('link').waitFor({state:'visible'});
   assert(await summary.evaluate(e=>getComputedStyle(e).outlineStyle!=='none'));
   const href=await mobile.locator('details').first().getByRole('link').getAttribute('href');assert(href.startsWith('/roadmap?item='));
   await page.keyboard.press('Space');assert.equal(await mobile.locator('details').first().getAttribute('open'),null);
   const more=page.getByRole('button',{name:locale==='en'?'Show more':'查看更多',exact:true});await more.click();
   assert.equal(await mobile.locator('details').count(),8);
   const completed=mobile.getByRole('button',{name:locale==='en'?'Completed':'已完成',exact:true});await completed.click();
   assert.equal(await completed.getAttribute('aria-pressed'),'true');assert.equal(await mobile.locator('details').count(),4);
   await more.click();assert.equal(await mobile.locator('details').count(),5);assert(!await more.isVisible());
   const hold=mobile.getByRole('button',{name:locale==='en'?'On Hold':'暂缓',exact:true});await hold.click();assert.equal(await mobile.locator('details').count(),4);
   const all=mobile.getByRole('button',{name:locale==='en'?'All':'全部',exact:true});await all.click();assert.equal(await mobile.locator('details').count(),4);
   await mobile.locator('summary').first().click();
   // Language switch keeps the accordion open and updates shared dynamic translations.
   await chooseLanguage(page,locale==='en'?'zh-CN':'en');
   assert(await mobile.locator('details').first().getAttribute('open')!==null);
   await chooseLanguage(page,locale);
   await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('html').getAttribute('lang'),locale);
   await mobile.locator('summary').first().click();
   await mobile.locator('details').first().getByRole('link').click();await page.waitForURL('**/roadmap?item=*');
   await page.goBack({waitUntil:'networkidle'});assert.equal(new URL(page.url()).pathname,'/');
   await page.emulateMedia({reducedMotion:'reduce'});
   const duration=await page.locator('.roadmap-chevron').first().evaluate(e=>getComputedStyle(e).transitionDuration);assert.equal(duration,'0s');
   assert.equal(await page.getByText('Responsive milestone 16',{exact:true}).count(),0,'draft hidden');
   await context.close();
   console.log(`PASS ${locale}/${theme}: eight widths, shared alignment, compact features, footer columns, preview ratio, filters/show-more/keyboard/fallback and reduced motion`);
  }
  // The logged-in admin header can wrap at 320px: menus must stay on-screen.
  for(const role of ['member','admin']) {
   const context=await browser.newContext({viewport:{width:320,height:844}});
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin+'/auth',{waitUntil:'networkidle'});
   await page.locator('#auth-email').fill(`${role}@example.test`);await page.locator('#auth-password').fill('test-only-password');
   await page.locator('form button:not([type="button"])').click();await page.waitForURL('**/dashboard');
   for(const locale of ['en','zh-CN']) {
    await page.goto(origin,{waitUntil:'networkidle'});await chooseLanguage(page,locale);
    await page.waitForFunction(()=>!document.querySelector('.site-header select').disabled);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('.preferences-menu > button').click();
    const themeBox=await page.locator('.preferences-panel').boundingBox();assert(themeBox.x>=0&&themeBox.x+themeBox.width<=320);
    await page.keyboard.press('Escape');
    const user=page.locator('.site-header button').filter({has:page.locator('span.h-9')});await user.click();
    const menu=await user.locator('..').locator('div.absolute').boundingBox();assert(menu.x>=0&&menu.x+menu.width<=320);
    await page.keyboard.press('Escape');
   }
   await context.close();
  }
  console.log('PASS 320px member/admin bilingual header and menu boundaries');
  assert.deepEqual(errors,[]);
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
