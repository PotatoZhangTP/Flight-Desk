// Shared helpers follow the real combined preferences popover, not hidden controls.
async function openPreferences(page) {
 const panel=page.locator('.preferences-panel');
 if(!await panel.isVisible())await page.locator('.preferences-menu > button').click();
 await panel.waitFor({state:'visible'});return panel;
}
async function chooseLanguage(page,locale) {
 const panel=await openPreferences(page);
 const select=panel.getByRole('combobox');await select.selectOption(locale);
 await page.waitForFunction(()=>!document.querySelector('.preferences-panel select').disabled);
 await panel.locator('button[popovertargetaction="hide"]').click();
}
async function chooseTheme(page,mode) {
 const panel=await openPreferences(page);await panel.getByRole('radio',{name:mode,exact:true}).locator('..').click();
 await panel.locator('button[popovertargetaction="hide"]').click();
}
module.exports={openPreferences,chooseLanguage,chooseTheme};
