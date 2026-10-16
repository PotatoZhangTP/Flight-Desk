# English / 简体中文 Preview

## Architecture

- `next-intl` 4.14.9, without changing existing URLs or Auth callback paths.
- `lib/i18n/catalog.ts`: semantic keys and English/Chinese base messages. Missing Chinese messages fall back to English. `T` and `useText` explicitly translate UI bindings, never scan or replace DOM text or user data.
- `LanguageProvider`: receives server-resolved locale and published overrides. Cookie `flightdesk-locale` initializes SSR; account preference is used if no valid cookie exists. Local storage only broadcasts changes across tabs. No locale-based component keys or full-page refresh on language switching.
- The HTML `lang`, UI labels, loading animation, live status, calendar-date formatting and duration units follow the selected language. Theme and language are independent.
- Root layout now reads cookies and user preference dynamically. Existing data queries and ownership checks remain unchanged.
- Website Supabase client is used for translations and preferences, **not** the separate airport reference connection. No admin/service-role keys or new environment variables are needed.

## Manual SQL review required — nothing was executed remotely

Review the full files and run them manually against the **website/Auth Supabase project** used by `NEXT_PUBLIC_SUPABASE_URL`, initially the Preview project's database:

1. `supabase/migrations/20261016000100_create_translation_overrides.sql`
2. `supabase/migrations/20261016000200_add_profile_preferred_locale.sql` (account preference synchronization)

The first migration requires the existing `public.is_site_admin()` from the CMS migration. It creates only `translation_overrides`, its policies and a metadata trigger. Published rows are publicly readable; only existing site administrators can mutate rows. Authenticated table-level DML grants are constrained by administrator-only RLS policies. No other table's policies or grants change.

The second migration adds a nullable, constrained `preferred_locale` column to `profiles`. It performs no backfill and does not replace the existing own-profile RLS, Auth trigger or user records. Neither migration touches flights, airports, roadmap items or CMS content.

Before migration, the base dictionary/cookie language switching works. Override reads fail safely to the dictionary; the admin editor is disabled with an explanatory notice. Account synchronization is enabled only after the own-profile column read succeeds. Missing profile/update failures never produce account-save success.

## Translation management

Open `/admin/translations` using an existing administrator account. English and default Chinese are read-only. Search keys/source/Chinese; filter module and default/customized/review status; edit Chinese; save and apply, or confirm restoration of a single default. Lists are paginated, 25 entries per page.

- Only registered keys are accepted. Plain text only, max 4,000 characters; HTML-like tags, invalid ICU messages and altered argument names are rejected. React renders text, not HTML.
- Saving requires current user authentication and existing admin membership, then caller-scoped RLS. No elevated client is used.
- Updates/deletes match locale, key, version and timestamp; stale writes report a conflict. New rows use insert, not blind upsert, so races cannot silently overwrite another administrator.
- Unsaved edits show a banner and a browser-leave warning; internal link clicks ask before leaving. This is not an offline draft store. Browser-history navigation is not intercepted; save before using Back/Forward.
- Source hashes flag overrides for review when the code's English base source changes. They do not automatically translate subsequent editorial CMS changes.
- Public override reads are uncached (`no-store`). The saving tab reloads immediately; other open pages refresh on focus/visibility or within 30 seconds. New requests get the current published data, without a Vercel redeploy. Network failures retain the last loaded dictionary.

## Content boundaries / special cases

- User notes, bios, display names, airport names/codes, airline/aircraft/registration values, IANA zones and database enums are preserved. Roadmap titles/descriptions/categories are administrator-authored editorial data, not machine-translated.
- Existing English CMS copy is preserved. Chinese display copy for rendered CMS slots is managed independently under `content.*` translation keys. Changing English CMS copy does not automatically translate Chinese; review/update the corresponding Chinese override.
- Native browser date/time pickers and native confirmation button captions follow browser/OS locale; application labels and confirmation message text are localized.
- Flight timestamps/UTC/IANA identifiers remain standard values. SEO metadata titles retain the existing English branding; visible page headings and HTML language are localized.
- Live Supabase RLS enforcement and account synchronization remain pending manual migration and Preview verification. Local fixtures validate application flows, not the deployed PostgreSQL policies.

## Preview acceptance

1. On `/`, switch English / 简体中文; refresh and confirm the language remains. Test guest Auth/reset pages too.
2. Sign in, fill Add Flight without saving, switch language; selected airports, local times, notes and Actual Duration must remain unchanged. Repeat in Edit Flight with an old record.
3. Search PEK, KJFK and 00AK. Airport names/codes/timezones remain original; surrounding labels, loading/error/empty states change language. Test DST gap and overlap cases.
4. Test Profile, Settings, Flight Detail, Dashboard, Roadmap and Admin/CMS in both languages and Light/Dark/System. At mobile widths confirm no overflow.
5. After manually running the reviewed SQL, save a Chinese override in `/admin/translations`, verify it in another page and restore default. Check an ordinary account cannot access the editor. Edit the same key in two tabs; a stale save should report a conflict.
6. Change language in Settings; verify browser persistence and account sync on a separate browser after migration. Do not use real flight mutations merely to test translation storage.

## Local checks

Use only loopback Supabase fixtures for automated mutation tests. Standard unit suite: `node --test tests/*.test.cjs`. Browser scripts: `tests/i18n-browser.cjs`, `theme-browser.cjs`, `airports-browser.cjs`, `interactions-browser.cjs`, `loading-browser.cjs`. Browser scripts require Playwright/Chromium externally provided for development, not a new production dependency. Restart the in-memory fixture between suites because regression tests intentionally modify its fake records.
## Changed files

- `app/admin/landing-page/page.tsx`
- `app/admin/page.tsx`
- `app/admin/roadmap/page.tsx`
- `app/admin/translations/actions.ts`
- `app/admin/translations/page.tsx`
- `app/api/translations/route.ts`
- `app/auth/page.tsx`
- `app/auth/reset-password/page.tsx`
- `app/auth/update-password/page.tsx`
- `app/dashboard/page.tsx`
- `app/error.tsx`
- `app/flights/[id]/edit/page.tsx`
- `app/flights/[id]/page.tsx`
- `app/flights/new/page.tsx`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`
- `app/profile/page.tsx`
- `app/roadmap/page.tsx`
- `app/settings/language-actions.ts`
- `app/settings/page.tsx`
- `components/account-controls.tsx`
- `components/admin-denied.tsx`
- `components/admin-navigation.tsx`
- `components/airport-picker.tsx`
- `components/async-button.tsx`
- `components/auth-aircraft.tsx`
- `components/auth-form.tsx`
- `components/bio-editor.tsx`
- `components/country-flag.tsx`
- `components/flight-form.tsx`
- `components/i18n.tsx`
- `components/journey-demo.tsx`
- `components/landing-content-editor.tsx`
- `components/language-selector.tsx`
- `components/localized-image.tsx`
- `components/logbook-link.tsx`
- `components/mutation-feedback.tsx`
- `components/navigation-link.tsx`
- `components/page-loading-screen.tsx`
- `components/password-security.tsx`
- `components/profile-editor.tsx`
- `components/roadmap-cards.tsx`
- `components/roadmap-controls.tsx`
- `components/roadmap-explorer.tsx`
- `components/roadmap-manager.tsx`
- `components/server-action-form.tsx`
- `components/site-footer.tsx`
- `components/site-header.tsx`
- `components/stat-card.tsx`
- `components/theme-controls.tsx`
- `components/translation-manager.tsx`
- `components/upcoming-button.tsx`
- `components/user-menu-client.tsx`
- `docs/i18n-preview.md`
- `lib/i18n/catalog.ts`
- `lib/i18n/server.ts`
- `lib/i18n/validation.ts`
- `package-lock.json`
- `package.json`
- `supabase/migrations/20261016000100_create_translation_overrides.sql`
- `supabase/migrations/20261016000200_add_profile_preferred_locale.sql`
- `tests/content.test.cjs`
- `tests/i18n-browser.cjs`
- `tests/i18n-migration-pending-browser.cjs`
- `tests/i18n.test.cjs`
- `tests/interactions.test.cjs`
- `tests/roadmap.test.cjs`
- `tests/support/i18n-mock.cjs`
- `tests/support/theme-api.cjs`

## Verified locally

- `npm run build`: passed using explicitly isolated loopback Supabase configuration.
- `node --test tests/*.test.cjs`: 73 passed, 0 failed.
- Browser suites `i18n-browser`, `theme-browser`, `airports-browser`, `interactions-browser`, `loading-browser`: passed. Includes guest/authenticated SSR, retained dirty forms and user text, admin override save/application/reset, normal-user denial, Auth/reset, flight save/edit, airport search, DST, Roadmap/CMS actions, both themes and mobile layouts.
- Migration-pending browser suite: passed with `I18N_OVERRIDES_UNAVAILABLE=1 I18N_PROFILE_UNAVAILABLE=1`; no preference writes, no Auth breakage, default Chinese SSR intact, editor disabled.
- Static translation binding audit: 0 missing literal IDs/sources. Mobile Chinese/Dark full-page screenshot inspected; no horizontal overflow. No browser runtime/hydration errors in completed suites.
- These checks do not establish live Supabase migration/RLS success or a Vercel deployment being Ready. Those remain manual Preview acceptance steps after SQL review.
