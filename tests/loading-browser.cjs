// Local-only, read-only visual checks. Uses the in-memory protocol fixture.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin=process.env.INTERACTION_TEST_ORIGIN || 'http://127.0.0.1:3110';
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const prefix=fs.readFileSync('tests/interactions-browser.cjs','utf8').split('(async()=>{')[0];
const cookie=new Function('require','process',prefix+'return cookie;')(require,process);
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    for (const [theme,width,reducedMotion] of [['light',1440,'no-preference'],['dark',390,'no-preference'],['system',390,'reduce']]) {
      const context=await browser.newContext({viewport:{width,height:900},colorScheme:'dark',reducedMotion});
      await context.addCookies([cookie('member')]);
      await context.addInitScript(value=>localStorage.setItem('flightdesk-theme',value),theme);
      const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin,{waitUntil:'networkidle'});
      await page.route('**/settings?*',async route=>{
        if(route.request().headers().rsc==='1')await new Promise(resolve=>setTimeout(resolve,2500));
        await route.continue();
      });
      await page.getByRole('button',{name:'Open user menu'}).click();
      await page.getByRole('link',{name:'Settings',exact:true}).click();
      const screen=page.locator('[data-page-loading]');await screen.waitFor();
      assert.equal(await screen.count(),1);
      const styles=await screen.evaluate(el=>({blur:getComputedStyle(el).backdropFilter,
        textSize:parseFloat(getComputedStyle(el.querySelector('p')).fontSize),
        animation:getComputedStyle(el.querySelector('.loading-aircraft')).animationName,
        width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
      assert.match(styles.blur,/blur\(10px\)/);assert(styles.textSize>=20);
      assert.equal(styles.width,width);assert.equal(styles.height,900);
      assert.equal(styles.animation,reducedMotion==='reduce'?'none':'loading-flight');
      await page.keyboard.press('Tab');await page.keyboard.press('Escape');await screen.click({position:{x:4,y:4}});
      assert.equal(await screen.count(),1,'background blur/menu focus must not prematurely dismiss navigation');
      assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('[inert]')),false);
      await page.screenshot({path:`/tmp/flightdesk-loader-${theme}.png`});
      await page.waitForURL(origin+'/settings');await page.getByRole('heading',{name:'Appearance',exact:true}).waitFor();
      assert.equal(await screen.count(),0);assert.equal(await page.locator('[inert]').count(),0);
      assert.deepEqual(errors,[]);
      console.log(`PASS full-screen ${theme} ${width}px: blur, readable text, airplane animation/reduced motion, background inert, single overlay, cleanup and no hydration errors`);
      await context.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
