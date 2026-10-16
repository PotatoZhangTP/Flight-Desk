const {openPreferences,chooseLanguage,chooseTheme}=require('./support/preferences-browser.cjs');
// Run against fixture flags I18N_OVERRIDES_UNAVAILABLE=1 I18N_PROFILE_UNAVAILABLE=1.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.THEME_TEST_ORIGIN || 'http://localhost:3110';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/auth', {waitUntil: 'networkidle'});
    await page.locator('#auth-email').fill('admin@example.test');
    await page.locator('#auth-password').fill('test-only-password');
    await page.locator('form').getByRole('button', {name: 'Sign in', exact: true}).click();
    await page.waitForURL('**/dashboard');
    await page.goto(origin + '/admin/translations', {waitUntil: 'networkidle'});
    await page.getByRole('alert').filter({hasText: 'Translation overrides are unavailable.'}).waitFor();
    assert.equal(await page.locator('textarea').first().isDisabled(), true);
    let writes = 0;
    page.on('request', request => {if (request.method() === 'POST') writes++;});
    await chooseLanguage(page,'zh-CN');
    await page.getByRole('heading', {name: '语言与翻译'}).waitFor();
    assert.equal(writes, 0, 'no preference write when column is missing');
    await page.reload({waitUntil: 'networkidle'});
    assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
    assert.equal(await page.locator('textarea').first().isDisabled(), true);
    const response = await page.request.get(origin + '/api/translations');
    const body = await response.json();
    assert.equal(body.ready, false); assert.deepEqual(body.overrides, {});
    assert.deepEqual(errors, []);
    console.log('PASS missing table/column preserve Auth and Chinese cookie SSR, dictionary fallback, disabled admin editor and no preference writes');
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
