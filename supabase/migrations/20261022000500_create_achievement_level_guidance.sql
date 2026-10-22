BEGIN;

CREATE TABLE IF NOT EXISTS public.achievement_level_guidance (
  achievement_level_id uuid PRIMARY KEY REFERENCES public.achievement_levels(id) ON DELETE CASCADE,
  guidance_en text NOT NULL DEFAULT '',
  guidance_zh text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.achievement_level_guidance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.achievement_level_guidance FROM PUBLIC, anon;
GRANT SELECT ON public.achievement_level_guidance TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.achievement_level_guidance TO authenticated;

DROP POLICY IF EXISTS achievement_guidance_read ON public.achievement_level_guidance;
CREATE POLICY achievement_guidance_read ON public.achievement_level_guidance
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS achievement_guidance_admin_write ON public.achievement_level_guidance;
CREATE POLICY achievement_guidance_admin_write ON public.achievement_level_guidance
  FOR ALL TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

CREATE INDEX IF NOT EXISTS achievement_level_guidance_updated_idx
  ON public.achievement_level_guidance (updated_at DESC);

COMMIT;
