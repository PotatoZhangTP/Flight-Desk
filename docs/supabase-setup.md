# Supabase setup

## Local environment

Copy `.env.example` to `.env.local` and fill in the values from Supabase Dashboard → Project Settings → API:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Never commit `.env.local`. It is ignored by Git.

## Database

Run `supabase/migrations/20261014000100_create_profiles_and_flights.sql` in the Supabase SQL Editor or with the Supabase CLI. It creates `profiles` and `flights`, adds the new-user profile trigger, and enables per-user Row Level Security policies.

## Auth settings

In Supabase Authentication → URL Configuration, add the local site URL (`http://localhost:3000`) and the deployed site URL when ready. Email verification links return through `/auth/callback`; password reset links return through `/auth/update-password`.

## Verify

Run `npm run dev`, open `/auth`, create an account, verify the email, sign in, and confirm the browser session is shown by Supabase. The Dashboard continues to use mock flight data until the database read/write layer is implemented.
