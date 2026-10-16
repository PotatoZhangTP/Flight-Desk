# Global Interaction System

## Design and implementation

- Existing semantic Light/Dark/System tokens remain the only palette source.
  Global base rules provide keyboard focus rings, restrained link/button hover,
  disabled/busy cursors, and touch tap feedback. Hover elevation is restricted to
  clickable `.interaction-card` containers and fine hover-capable pointers.
  Full Roadmap information cards deliberately have no click-like hover effect.
- `AsyncButton`, `SubmitButton` and `Spinner` share busy visuals and live status.
  `useAsyncOperation` takes a synchronous ref lock before awaiting the request,
  restores the button in `finally`, reports failures without clearing edits, and
  preserves Next redirect control flow with `unstable_rethrow`.
- Server-action forms retain React `useFormStatus` and Next redirect semantics;
  a client wrapper catches transport failures and prevents duplicate submissions.
  Roadmap/CMS retain their existing transitions with immediate operation feedback.
- The only flight action change is the successful edit redirect's `?updated=1`
  feedback flag. Database mutations, normalization, ownership checks and cache
  invalidation are unchanged. Password update has a similar UI-only success flag;
  the former artificial one-second redirect delay is removed.
- `NavigationLink` delegates to Next Link and `useLinkStatus`. It reports real
  pending navigations to one root indicator; it never intercepts clicks, modifies
  history, forces reloads, or adds a navigation delay. Programmatic action
  redirects retain their submitting button until the transition completes.
  The account menu stays mounted while its link is pending and closes when the
  pathname changes, so its navigation status is not lost prematurely.
- Root/section `loading.tsx` files share a theme-aware, labelled skeleton. The
  template adds a 180ms opacity/4px entrance animation. Reduced-motion disables
  animations, including spinner rotation, without hiding busy text or status.
  A recoverable page error boundary is also provided.

## Files changed

Shared system:

- `app/globals.css`, `app/layout.tsx`, `app/template.tsx`, `app/error.tsx`
- `app/loading.tsx` and `loading.tsx` in `auth`, `flights`, `admin`, `dashboard`,
  `roadmap`, `profile`, `settings`
- `components/async-button.tsx`, `components/use-async-operation.ts`,
  `components/server-action-form.tsx`, `components/navigation-link.tsx`,
  `components/navigation-feedback.tsx`, `components/route-loading.tsx`,
  `components/mutation-feedback.tsx`

Async interactions and cards:

- `components/auth-form.tsx`, `components/flight-form.tsx`,
  `components/airport-picker.tsx`, `components/profile-editor.tsx`,
  `components/bio-editor.tsx`, `components/password-security.tsx`,
  `components/user-menu-client.tsx`, `components/roadmap-manager.tsx`,
  `components/landing-content-editor.tsx`, `components/roadmap-cards.tsx`
- `app/auth/reset-password/page.tsx`, `app/auth/update-password/page.tsx`,
  `app/flights/actions.ts`

Existing links now use the shared Next Link wrapper (destinations unchanged):

- `app/page.tsx`, `app/dashboard/page.tsx`, `app/roadmap/page.tsx`,
  `app/auth/page.tsx`, `app/profile/page.tsx`, `app/settings/page.tsx`,
  `app/flights/new/page.tsx`, `app/flights/[id]/page.tsx`,
  `app/flights/[id]/edit/page.tsx`, `app/admin/page.tsx`,
  `app/admin/roadmap/page.tsx`, `app/admin/landing-page/page.tsx`
- `components/account-controls.tsx`, `components/admin-denied.tsx`,
  `components/admin-navigation.tsx`, `components/brand.tsx`,
  `components/logbook-link.tsx`, `components/site-header.tsx`,
  `components/site-footer.tsx`

Tests:

- `tests/interactions.test.cjs`, `tests/interactions-browser.cjs`
- Existing `tests/content.test.cjs`, `tests/roadmap.test.cjs` adapt the Link mock
  boundary; assertions about content/permissions are retained.
- `tests/airports-browser.cjs`, `tests/theme-browser.cjs` follow success-feedback
  query flags without relaxing the destination or save checks.

## Verification

Run `npm run build` and `node --test tests/*.test.cjs`.
The build and all 66 automated tests passed. Local Chromium theme, airport and
slow-network interaction suites also passed, covering sign-in/out, reset/update
password, profile/bio, flight create/edit, keyboard airport search, DST gaps and
overlaps, Roadmap/CMS mutations, admin denial, history, theme persistence,
reduced motion, responsive layout and absence of runtime/hydration errors.
Browser checks use `tests/support/theme-api.cjs`, a loopback-only in-memory
Supabase protocol fixture, and a local production build. Point BOTH browser
build-time and server runtime Supabase URLs/keys at this fixture; never run
mutation tests against a deployed website or real Supabase project.
`PLAYWRIGHT_MODULE` can select an external Playwright installation without adding
any app dependency. Run the existing theme and airport browser suites, followed
by `tests/interactions-browser.cjs` (which intentionally edits mock profile data).

## Scope and special cases

- There is no existing Delete Flight UI/action. None was invented. Roadmap
  deletion uses the shared loading state and retains its confirmation.
- Airport lookup remains debounced, cancellable, bounded server search. It uses
  inline progress/suggestion announcements, not a disabled search input, so the
  user can continue typing and stale results remain suppressed.
- Native date/time pickers and existing confirmation/upcoming-feature alerts
  remain native; they are not replaced with a new modal dependency.
- Frontend locks prevent repeated submissions in this mounted UI, not distributed
  or cross-tab duplicates. No database idempotency changes or automatic retries
  were introduced. An interrupted response may follow a committed write; error
  copy tells users to check the record before retrying.
- Instant/cached navigation requires no manufactured spinner delay. History and
  same-page anchor navigation remain native; pending skeletons appear only when
  React/Next is actually waiting.
- No SQL, RLS, airport import/configuration, environment files or dependencies
  were changed. Local mock tests do not certify live email delivery or production
  database/network availability. Validate the final deployment in Preview only.
