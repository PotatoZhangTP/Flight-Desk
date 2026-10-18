BEGIN;

CREATE TABLE IF NOT EXISTS public.daily_challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date date NOT NULL,
  category text NOT NULL CHECK (category IN ('quick', 'regional', 'medium', 'long')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_challenge_completions_user_date_category_key UNIQUE (user_id, challenge_date, category),
  CONSTRAINT daily_challenge_completions_challenge_key
    FOREIGN KEY (challenge_date, category)
    REFERENCES public.daily_challenges (challenge_date, category)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS daily_challenge_completions_user_date_idx
  ON public.daily_challenge_completions (user_id, challenge_date);

ALTER TABLE public.daily_challenge_completions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.daily_challenge_completions FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.daily_challenge_completions TO authenticated;

DROP POLICY IF EXISTS daily_challenge_completions_select_own ON public.daily_challenge_completions;
CREATE POLICY daily_challenge_completions_select_own
  ON public.daily_challenge_completions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS daily_challenge_completions_insert_own ON public.daily_challenge_completions;
CREATE POLICY daily_challenge_completions_insert_own
  ON public.daily_challenge_completions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS daily_challenge_completions_delete_own ON public.daily_challenge_completions;
CREATE POLICY daily_challenge_completions_delete_own
  ON public.daily_challenge_completions
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

COMMIT;
