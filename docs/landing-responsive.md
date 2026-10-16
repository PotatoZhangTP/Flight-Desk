# Landing Page responsive refinement

## Implementation

- `app/globals.css`: shared `.site-container` uses a 1440px outer maximum,
  16px mobile gutters and 32px gutters from 640px. Shared section spacing,
  pointer-aware interaction feedback, 44px public navigation/footer targets,
  mobile disclosures and reduced-motion handling reuse existing theme tokens.
- `app/page.tsx`: balanced wrapping Hero, six compact icon/text feature rows
  below 640px, two-column tablet and three-column desktop feature grid. Existing
  content, destinations, upcoming notices, CMS slots and section order remain.
- `components/journey-demo.tsx`: existing ticket illustration, centered with a
  960px maximum. Product Preview retains the exact original image and aspect
  ratio, up to its native 1024px width. Intentionally narrower illustrations do
  not change the outer shared section grid.
- `components/site-header.tsx`, `components/site-footer.tsx`: shared grid,
  wrapping mobile controls and two-column mobile link groups. Branding spans
  both mobile columns; desktop uses branding plus three navigation groups.
- `components/roadmap-cards.tsx`, `components/landing-roadmap-mobile.tsx`:
  desktop retains Planned/Completed groups and four-card caps; mobile receives
  the same published item array, shows four initial items, and adds four per
  Show more. Filter choices derive from actual Planned/Completed/On Hold data,
  not invented statuses. Native disclosures support keyboard and touch;
  details retain dates and stable full-Roadmap links. No votes or other source
  interactions existed to migrate. The shared dynamic translation scope is
  retained; there is no mobile data fetch or separate data source.
- `components/upcoming-button.tsx`: supports `aria-labelledby`, allowing feature
  link/button accessible names to follow the visible translated heading.
- `lib/i18n/catalog.ts`: English/Chinese UI labels for the new mobile controls,
  automatically included in the existing admin translation editor. No new SQL.

`details::details-content` height animation is progressive enhancement. Engines
without intrinsic-size animation still get native, keyboard-accessible instant
expand/collapse. Reduced motion disables transitions. Expansion intentionally
reflows subsequent content, without fixed-height clipping or absolute overlays.
The original English screenshot remains English in Chinese mode; no replacement
imagery or modifications to screenshot contents were introduced.

## Local verification

No hosted database, translation provider or deployed website is mutated by these
checks. Existing environment setup is sufficient; no new dependencies or secrets.

```sh
node --test tests/*.test.cjs

# Start the existing loopback fixture with an expanded Roadmap dataset.
LANDING_RESPONSIVE_FIXTURE=1 node tests/support/theme-api.cjs

# In another shell: build and run against that fixture only.
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4410 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_fixture \
AIRPORTS_SUPABASE_URL=http://127.0.0.1:4410 \
AIRPORTS_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_fixture \
npm run build

NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4410 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_fixture \
AIRPORTS_SUPABASE_URL=http://127.0.0.1:4410 \
AIRPORTS_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_fixture \
npm run start -- --port 3110

PLAYWRIGHT_MODULE=/path/to/playwright node tests/landing-responsive-browser.cjs
```

Browser checks cover 320, 375, 390, 430, 768, 1024, 1440 and 1920px, both
languages and OS light/dark palettes: horizontal overflow, shared alignment,
feature layout, two-column footer, loaded preview image/aspect ratio, four-item
initial cap, filters, pagination, draft exclusion, keyboard/focus, details links,
Back navigation, language persistence, retained open disclosure and reduced
motion. Screenshots are written under `/tmp/landing-*` for visual inspection.

For existing browser suites, restart the fixture **without** the expanded-data
flag between mutating suites. Relevant regressions are `theme-browser.cjs`,
`i18n-browser.cjs`, `content-translations-browser.cjs`,
`interactions-browser.cjs` and `airports-browser.cjs`.

## Preview review

Confirm the Vercel deployment source commit matches this branch's latest commit
before reviewing. Test the landing page at narrow and wide widths; switch
English/简体中文 and Light/Dark/System; check all six feature links/notices,
Roadmap filters, Show more (when more than four matching items exist), keyboard
disclosures, item destinations, browser Back and footer destinations. Check one
existing admin-edited translation is still applied. This change does not alter
Supabase, Auth, routing, environment configuration, main or Production.

Automated browser coverage is Chromium on Linux, not real iOS/Safari or Android
hardware. Confirm those browsers during Preview acceptance. Preview readiness
must be checked separately from a successful Git push.
