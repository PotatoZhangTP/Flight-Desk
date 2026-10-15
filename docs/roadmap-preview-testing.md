# Roadmap Preview acceptance

The existing Roadmap migration has already been applied manually. Do not rerun
initialization SQL or change existing RLS policies for this release.

## Configuration

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the
Vercel **Preview** environment, using the same Supabase project as the migrated
tables. Never commit their values. No service-role/secret key is needed.
The project Data API must expose the `public` schema. New-table API permissions
are explicitly granted by the approved migration.

Administrator membership is managed only through the trusted Supabase SQL Editor
using an existing Auth user UID, never through this application. Auth redirects
for signing in, verification and recovery continue to use the existing setup.

## Acceptance with real accounts

1. In a signed-out/private window, open `/` and `/roadmap`. With all 13 initial
   items still drafts, expect one illustrated empty state and no progress counters
   or empty status columns on either page. The homepage Roadmap navigation links
   to `/#roadmap`; View Full Roadmap opens the independent page.
   Check the Product demo label and mobile navigation.
2. Visit `/admin/roadmap` signed out. Expect the login page. Sign in as an
   ordinary user and visit it directly: expect Access denied, no editor, and
   no Manage Roadmap menu entry.
3. Sign in using the dedicated administrator account. The avatar menu should
   show Manage Roadmap. Verify all initial drafts are visible in the backend.
4. Create a disposable Draft item. Refresh: it should persist. Confirm that it
   is absent in the signed-out window. Edit its title, category, priority,
   development status and optional dates. Save and reopen the editor. There
   should be no Sort Order input or Order number on the management cards.
5. Set visibility to Published. Refresh `/roadmap` in the signed-out window;
   the item should appear in the correct column and update its count. For
   all four statuses, the homepage selects at most six published items by the
   absolute target-date distance from today. Its cards display only title,
   status and target date (TBD if missing). No descriptions, categories or
   update timestamps belong on homepage cards. No progress panel is displayed.
   View Full Roadmap shows all published items, grouped by development status,
   with full descriptions and the category at the top right.
6. Clear the target date and save. Expect TBD on the homepage and no target
   date field on the detailed public card. Dates are sorted by absolute calendar
   distance, including past dates. Undated items stay last for both date sort
   directions. All views use one server-supplied reference day in Asia/Shanghai
   to avoid server/browser timezone disagreement. Test all four Sort By options
   in both the public page and administrator workspace. The public groups sort
   independently. Admin Filter By supports all four statuses, Draft and Published.
   Set the item back to Draft: it should disappear from both public pages.
7. Try deleting: cancel first and verify the item remains; confirm deletion
   second, then refresh and confirm it is removed. Delete only disposable
   test items, not the original product plan.
8. Verify desktop and mobile forms, keyboard focus, menu Escape behavior,
   Save pending state and errors. Existing flight and profile flows should
   still work. Public pages fetch current data on each request; an already
   open page should be refreshed to see another session's edits.

## Automated checks

`node --test tests/roadmap.test.cjs` tests server-action authorization, field
validation, draft/publish/delete operations, failure handling and invalidation
with isolated dependencies. It does not assert that live database RLS is correct.

The development browser acceptance run used a local isolated Supabase-compatible
test service and Chromium. It exercised real Next.js pages and Server Actions
for anonymous/member/admin access, persistence, publication, unpublishing,
deletion confirmation, mobile layout, and a submit after switching to a
non-admin session. It did not use real accounts or modify Supabase.
