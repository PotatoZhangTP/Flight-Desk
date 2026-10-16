# Unified display and language controls

`components/preferences-menu.tsx` replaces separate header theme/language
controls with one 44px gear button. The popover contains appearance options
(Light, Dark, System) and a globe-marked language section (English, 简体中文).
It is also available on Auth, password recovery and the not-found page.
The existing account Settings page retains its full appearance/language cards.

The popover reuses `ThemeProvider`, `LanguageProvider`, `LanguageSelector` and
the existing authenticated language-save action. No new persistence, tables,
permissions, API endpoints, environment variables or dependencies are introduced.
New labels use the existing translation catalog/admin override mechanism.

Native HTML Popover API provides top-layer rendering, outside-click dismissal,
Escape and trigger focus restoration. Radio groups support standard keyboard
selection; a close button is included. This requires a modern browser supporting
the Popover API (current Chrome, Edge, Firefox and Safari); no legacy-browser
polyfill is added. Real mobile Safari testing remains part of Preview acceptance.

The panel stays open while changing theme/language, closes when navigating or
scrolling/resizing the page, and is clamped to the viewport. Short viewports can
scroll the panel. Language persistence feedback is visible inside it. Switching
does not refresh the document or remount forms.

Local checks use the existing loopback fixture documented in
`landing-responsive.md`:

```sh
node --test tests/*.test.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/preferences-browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/i18n-browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/theme-browser.cjs
```

Restart the fixture between mutating suites. Shared browser helpers in
`tests/support/preferences-browser.cjs` open the actual popover before interacting
with controls. Existing browser suites are adapted to the combined entry point.

Preview acceptance: verify a single gear entry on public, Auth and signed-in
pages; open it and switch all three themes and both languages; reload to confirm
preferences; switch with a partially entered flight form; use Tab, radio arrow
keys, Escape and outside clicks; inspect narrow mobile widths. Confirm the
full Settings page continues to work. No Production deployment is authorized.
