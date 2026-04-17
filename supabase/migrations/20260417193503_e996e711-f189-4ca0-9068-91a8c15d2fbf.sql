ALTER TABLE public.ai_reports
  ADD COLUMN IF NOT EXISTS report_text text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ai_reports_user_player_created
  ON public.ai_reports (user_id, player_id, created_at DESC);