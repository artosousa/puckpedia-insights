ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS player_context text;