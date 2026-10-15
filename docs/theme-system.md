# Flight Desk theme system

## Runtime

One root `ThemeProvider` reuses `app/globals.css` semantic tokens. No new
runtime dependency, database column, migration or environment variable is needed.
Default preference: **System**. Browser localStorage key: `flightdesk-theme`;
accepted values: `light`, `dark`, `system`. Invalid or missing values use System.

A small trusted inline head script applies the saved attribute before body paint.
Only the root attribute has suppressHydrationWarning; controls use the same
System server snapshot during hydration. No account or profile fetch is needed.
The provider uses useSyncExternalStore, handles blocked storage, synchronizes
other tabs' localStorage changes, and preserves a working in-memory choice if
storage fails. Logging in/out never resets the preference.

CSS color-scheme and light-dark() handle System changes live, without another
JavaScript listener or a second theme provider. Explicit Light/Dark override the OS.
Requires modern browsers (Chrome/Edge 123+, Firefox 120+, Safari 17.5+).

## Controls

- Public/shared header: keyboard-accessible theme button, Light/Dark/System radio
  choices, outside-click and Escape dismissal.
- Settings → Appearance: immediately applied radio cards. No Save required.
- Logged-in headers, including independent private-screen headers, include the
  same theme button beside the avatar. The public header renders it only once.
  Settings → Appearance remains available and shares the same preference.

## Tokens and new pages

- `page`, `surface`, `surface-muted`, `elevated`: layered surfaces.
- `ink`, `muted`, `subtle`: text.
- `brand`, `brand-hover`, `brand-soft`, `on-brand`: purple actions.
- `line`, `line-strong`: borders.
- `panel`, `on-panel`, `panel-muted`, `panel-accent`: aviation ticket panels.
- `completed-*`, `planned-*`, `hold-*`: semantic Roadmap badges.
- `danger-*`: errors and destructive actions.

Use `bg-surface text-ink border-line hover:text-brand` and CSS variables for SVGs.
Avoid hardcoded white backgrounds, inverted images, per-page providers or
account-dependent theme state. Native date/select controls inherit color-scheme.
Reduced-motion preferences suppress decorative animations and transitions.

All current public, auth, flight, profile/settings and administrator routes use
these tokens. Existing layout, data validation, auth, RLS and save actions remain
unchanged. Light branding uses the original SVG; the dark variant keeps its
geometry and changes only wordmark contrast. The approved light aircraft image
is preserved; a transparent-background variant is used in dark mode. The fixed
Landing Page product screenshot remains the approved static **light screenshot**
inside a themed frame; it is intentionally not a live form or an inverted image.

## Automated verification

```sh
npm run build
node --test tests/*.test.cjs
```

The unit suite checks bootstrap defaults/validation, blocked storage, persistence,
cross-tab synchronization, deterministic SSR snapshots, semantic colors and
light/dark contrast, along with the existing auth/content/Roadmap authorization
regressions. Browser checks use only local fake users and in-memory data.

With Playwright and Chromium installed, run the isolated browser suite:

1. `node tests/support/theme-api.cjs` (keep running).
2. Build with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4410` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=theme-test-public-key`.
3. Start that build with the same variables: `npm run start -- --port 3110`.
4. `node tests/theme-browser.cjs` (or set PLAYWRIGHT_MODULE to an existing
   installation and CHROMIUM_PATH to the Chromium executable).
5. Stop these local processes and rebuild normally before handoff.

The browser suite rejects non-loopback targets. It covers all current screens
in both palettes, System changes, persistence/reopening, pre-hydration paint,
blocked storage, login/logout, private settings, responsive layout, local password
reset/update requests and local flight/admin form submission. It does not send
real email, execute SQL, verify real inbox delivery or change a live database.

## Preview acceptance

On the new feature-branch Preview, try the guest theme menu; change OS appearance
in System, then override with Light/Dark. Reload, open another route/tab and sign
in/out. In Settings → Appearance verify immediate selection. Review flight,
Roadmap and admin pages on desktop/mobile. Test real password recovery email
delivery using your own account if desired; the theme does not change callbacks.
No production merge or deployment is part of this change.
