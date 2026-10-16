// Run only against local fixture with DYNAMIC_TRANSLATIONS_UNAVAILABLE=1.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const origin=process.env.THEME_TEST_ORIGIN||'http://localhost:3110';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/auth',{waitUntil:'networkidle'});await page.locator('#auth-email').fill('admin@example.test');await page.locator('#auth-password').fill('test-only-password');await page.locator('form').getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/dashboard');
 await page.goto(origin+'/admin/roadmap',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Edit Test planned milestone',exact:true}).click();
 await page.getByRole('button',{name:'简体中文 (Translation)',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Dynamic translations are unavailable.'}).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'zh-CN title',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'English (Original)',exact:true}).click();
 await page.locator('input[name=title]').fill('English still saves before migration');await page.getByRole('button',{name:'Save item',exact:true}).click();
 await page.getByRole('heading',{name:'English still saves before migration',exact:true}).waitFor();
 await page.goto(origin+'/roadmap',{waitUntil:'networkidle'});await page.getByRole('combobox',{name:'Choose language'}).selectOption('zh-CN');
 await page.getByRole('heading',{name:'English still saves before migration',exact:true}).waitFor();assert.deepEqual(errors,[]);
 console.log('PASS missing dynamic migration: editor disabled, original English save unaffected, Chinese falls back to English without errors');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
