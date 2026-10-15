# Admin center and landing copy: database review stage

The user confirmed the approved migration has been manually executed. Do not
rerun it. The application now includes `/admin`, `/admin/landing-page`, the
separate Admin Panel account-area link and structured public content reads.

## Authorization

Keep `roadmap_admins` and `is_roadmap_admin()` unchanged. The new
`is_site_admin()` is a SECURITY INVOKER wrapper around the existing membership
check. Existing administrators retain access automatically; assigning/removing
membership remains a trusted SQL Editor operation using Auth user UUIDs.

The server-side admin guard verifies Auth with `getUser()`, then calls
`is_site_admin()`. Every new page and write action independently authorizes the
caller. A reusable account-area component renders the purple Admin Panel link
beside the personal menu, including on existing private pages. The menu contains
only personal actions. `/admin` links to the existing Roadmap editor and the new
landing editor. The Roadmap editor keeps its existing gate and CRUD logic.

## Content shape and workflow

`site_content` has 45 stable `landing.*` keys, each with independent Draft and
Published rows. Initial data creates 90 rows containing the current copy in both
slots. Empty copyright preserves the current footer rather than inventing text.
Newlines preserve existing intentional heading breaks. The demo flight ticket,
brand graphic, routes and icons remain in React and are not CMS content in v1.

The editor uses a code-owned field registry: labels, groups, stable keys,
required/optional fields and length limits. Only known keys render publicly;
copy is ordinary escaped React text, with multiline styles where appropriate.
No HTML, dangerous rendering, editable routes or rich-text engine is introduced.
The Roadmap section copy is independent from its items, which still come solely
from `roadmap_items`.

Save Draft writes only the draft slots, in one upsert request. Publish Saved Draft
calls `publish_landing_page()` after server authorization. The RPC is SECURITY
INVOKER, checks administrator membership and copies saved drafts to published
rows in one atomic statement under RLS. Unsaved form changes must be saved before
publishing. On RPC failure the old published content remains intact. Deleting a
draft key does not delete the published key; clearing optional text is an explicit
empty-string edit. Future key removals need separate migrations.

## Public stability and cache

The public read explicitly filters `publication_status = published`, even when
an administrator is browsing. Missing keys or unavailable content fall back to
the current code defaults, never drafts. Required empty values will be rejected
by the form/server registry; optional copyright may be empty. Saving drafts does
not invalidate the homepage. Successful publishing calls `revalidatePath('/')`;
the existing force-dynamic homepage fetches current published copy on refresh.
Other visitors' already-open tabs are not live-pushed; refresh shows changes.

## Migration scope

Run `20261015000200_create_landing_page_content.sql` once as postgres. It is in a
transaction, creates only a new table, new policies/functions/trigger, and references
the existing authorization function. It does not modify Auth, profiles, flights,
Roadmap data, membership or existing policies. Explicit table/API grants work
with automatic new-table exposure disabled when the public schema is exposed.
Initialization uses ON CONFLICT DO NOTHING to preserve edits. The overall
initialization migration is intentionally not rerunnable; future changes use new
migrations rather than overwriting live policies.

## Post-migration verification plan

Test separate anonymous, ordinary-user and administrator sessions. Verify admin
button visibility and direct route rejection, draft isolation via both public
pages and the Data API, persisted saves, atomic publication and updated public
copy without redeployment, revoked/expired-session writes, existing Roadmap CRUD,
and default copy when content is missing. Run the build and isolated tests before
pushing the development branch. Real-account verification needs user sessions;
isolated tests must not be described as proof of live RLS behavior.
