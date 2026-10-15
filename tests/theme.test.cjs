const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8');
function token(name, mode) {
  const pair=css.match(new RegExp(`--${name}: light-dark\\((#[0-9a-f]{6}), (#[0-9a-f]{6})\\)`));
  if (pair) return pair[mode === 'dark' ? 2 : 1];
  const fixed=css.match(new RegExp(`--${name}: (#[0-9a-f]{6});`));
  assert.ok(fixed, `Missing palette token ${name}`);
  return fixed[1];
}
function luminance(hex) {
  const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
  return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
for (const mode of ['light','dark']) {
  test(`${mode} theme normal text and semantic badges meet WCAG AA contrast`, () => {
    const pairs=[['ink','page'],['ink','surface'],['ink','elevated'],['muted','page'],['muted','surface'],['subtle','surface'],['brand','page'],['brand','elevated'],['brand','brand-soft'],['on-brand','brand'],['on-brand','brand-hover'],['on-panel','panel'],['panel-muted','panel'],['panel-accent','panel'],...['completed','planned','hold','danger'].map(status=>[`${status}-fg`,`${status}-bg`])];
    for(const [foreground,background] of pairs) {
      const a=luminance(token(foreground,mode)),b=luminance(token(background,mode));
      const ratio=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
      assert.ok(ratio>=4.5,`${foreground}/${background}: ${ratio.toFixed(2)}:1`);
    }
  });
}
