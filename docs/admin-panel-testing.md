# Admin Panel Preview verification

The content migration was manually executed by the owner. Do not rerun SQL.
No new environment variable is required: use the existing Supabase URL and
publishable key in Vercel Preview. Never use a secret/service-role key.

1. Signed out: `/admin` and `/admin/landing-page` redirect to sign-in. The public
   homepage is usable, and no Admin Panel link is shown.
2. Ordinary account: both direct URLs show Access denied. There is no Admin
   Panel button and no CMS form.
3. Dedicated administrator: Admin Panel is next to the avatar, not inside its
   menu. `/admin` links to Manage Roadmap and Manage Landing Page. Personal menu
   actions remain My Profile, Settings, Sign out.
4. On Manage Landing Page, edit a harmless field and Save Draft. Refresh the
   editor: it persists. In a separate signed-out window, refresh the homepage:
   published copy must remain unchanged.
5. Publish Saved Draft (confirm). Refresh the public homepage to see changes.
   Verify multiline headings and footer text. Text that resembles HTML must be
   displayed as text, never interpreted as HTML. Publishing publishes all saved
   sections together. Unsaved changes disable publishing.
6. Restore the desired content with another Save Draft and Publish Saved Draft.
   Verify Roadmap CRUD and the private flight pages continue to work.
7. Sign out, then try the editor URL again. It must redirect to sign-in. A stale
   form cannot save or publish after a session becomes unauthorized.

Automated checks: `node --test tests/content.test.cjs tests/roadmap.test.cjs
tests/theme.test.cjs` (one command, on one line), followed by `npm run build`.

The development browser check used isolated local Auth/Data API fixtures, not
the real database. It verified guest/member/admin navigation, 45-field editing,
draft persistence and isolation, publication, escaped text, Roadmap creation,
mobile/tablet/desktop layout, stale-session rejection and sign out. Live RLS
verification still requires the real Preview account checks above.

Footer CMS values currently apply to the landing page. Other shared-footer
callers keep the default copy unless explicitly passed the landing content.
