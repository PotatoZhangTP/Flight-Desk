const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {openPreferences,chooseLanguage,chooseTheme}=require('./support/preferences-browser.cjs');
const assert=require('node:assert/strict');
const origin=process.env.THEME_TEST_ORIGIN||'http://localhost:3110';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  for(const route of ['/','/roadmap','/auth','/auth/reset-password','/auth/update-password','/missing-page']){
   await page.goto(origin+route,{waitUntil:'networkidle'});
   assert.equal(await page.locator('.preferences-menu > button').count(),1,route);
   assert.equal(await page.locator('.preferences-panel').getByRole('combobox').count(),0,'language hidden until settings opened');
   const trigger=page.locator('.preferences-menu > button');await trigger.focus();await page.keyboard.press('Enter');
   await page.getByRole('dialog').waitFor();await page.waitForFunction(()=>document.querySelector('.preferences-menu > button').getAttribute('aria-expanded')==='true');
   assert.equal(await page.getByRole('dialog').getByRole('radio').count(),3);assert.equal(await page.getByRole('dialog').getByRole('combobox').count(),1);
   await page.locator('.preferences-panel input[value="light"]').focus();await page.keyboard.press('ArrowRight');
   assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
   await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.preferences-menu > button').getAttribute('aria-expanded')==='false');assert(await trigger.evaluate(e=>e===document.activeElement));
  }
  await page.goto(origin,{waitUntil:'networkidle'});
  for(const width of [320,375,390,430,768,1024,1440,1920]){
   await page.setViewportSize({width,height:844});
   for(const locale of ['en','zh-CN']){
    await chooseLanguage(page,locale);
    for(const mode of ['Light','Dark','System']){
     const localized=locale==='en'?mode:{Light:'浅色',Dark:'深色',System:'跟随系统'}[mode];
     await chooseTheme(page,localized);assert.equal(await page.locator('html').getAttribute('data-theme'),mode.toLowerCase());
    }
    const panel=await openPreferences(page),box=await panel.boundingBox();assert(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=844,`panel ${width}/${locale}`);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`/tmp/preferences-${locale}-${width}.png`});
    await page.locator('#hero-title').click();assert(!await panel.isVisible(),'outside click closes');
   }
  }
  await page.goto(origin+'/auth',{waitUntil:'networkidle'});
  await page.locator('#auth-email').fill('member@example.test');await page.locator('#auth-password').fill('test-only-password');
  await chooseLanguage(page,'en');await chooseTheme(page,'Dark');
  assert.equal(await page.locator('#auth-email').inputValue(),'member@example.test');assert.equal(await page.locator('#auth-password').inputValue(),'test-only-password');
  await page.locator('form button:not([type="button"])').click();await page.waitForURL('**/dashboard');
  for(const route of ['/dashboard','/flights/new','/flights/44444444-4444-4444-8444-444444444444/edit','/profile','/settings']){
   await page.goto(origin+route,{waitUntil:'networkidle'});assert.equal(await page.locator('.preferences-menu > button').count(),1);
   await chooseLanguage(page,'zh-CN');await chooseLanguage(page,'en');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  }
  await page.goto(origin+'/flights/new',{waitUntil:'networkidle'});await page.locator('textarea').fill('Unchanged user note');
  await chooseLanguage(page,'zh-CN');await chooseTheme(page,'浅色');assert.equal(await page.locator('textarea').inputValue(),'Unchanged user note');
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  assert.deepEqual(errors,[]);
  console.log('PASS one settings entry across public/Auth/private pages, globe language section, three themes, eight bilingual widths, keyboard/Escape/outside dismissal, dirty form retention and persistence');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
