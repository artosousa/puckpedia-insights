CREATE TABLE public.ai_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  player_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scouts read own ai_reports" ON public.ai_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_ai_reports_user_created ON public.ai_reports(user_id, created_at DESC);