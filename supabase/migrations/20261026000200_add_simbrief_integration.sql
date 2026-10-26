-- Phase 1 SimBrief integration. Configuration and OFP identity are private
-- user data; the existing flights RLS remains the source of truth.
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider = 'simbrief'),
  navigraph_alias text,
  pilot_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_integrations_provider_user_key UNIQUE (user_id, provider),
  CONSTRAINT user_integrations_identifier_check CHECK (
    nullif(btrim(navigraph_alias), '') IS NOT NULL OR nullif(btrim(pilot_id), '') IS NOT NULL
  )
);

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can update their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.user_integrations;
CREATE POLICY "Users can view their own integrations" ON public.user_integrations FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert their own integrations" ON public.user_integrations FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own integrations" ON public.user_integrations FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own integrations" ON public.user_integrations FOR DELETE USING ((select auth.uid()) = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_integrations TO authenticated;

ALTER TABLE public.flights ADD COLUMN IF NOT EXISTS simbrief_request_id text;
CREATE UNIQUE INDEX IF NOT EXISTS flights_user_simbrief_request_key
  ON public.flights (user_id, simbrief_request_id)
  WHERE source = 'simbrief' AND simbrief_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS flights_user_simbrief_lookup_idx
  ON public.flights (user_id, source, departure_scheduled_at_utc);
