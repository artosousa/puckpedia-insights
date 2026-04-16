-- Timestamp helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Leagues
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read leagues" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Public insert leagues" ON public.leagues FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update leagues" ON public.leagues FOR UPDATE USING (true);
CREATE POLICY "Public delete leagues" ON public.leagues FOR DELETE USING (true);

-- Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, league_id)
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Public insert teams" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update teams" ON public.teams FOR UPDATE USING (true);
CREATE POLICY "Public delete teams" ON public.teams FOR DELETE USING (true);
CREATE INDEX idx_teams_league ON public.teams(league_id);

-- Players
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT,
  shoots TEXT,
  date_of_birth DATE,
  height_cm INTEGER,
  weight_kg INTEGER,
  jersey_number INTEGER,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public insert players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update players" ON public.players FOR UPDATE USING (true);
CREATE POLICY "Public delete players" ON public.players FOR DELETE USING (true);
CREATE TRIGGER trg_players_updated BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_players_team ON public.players(team_id);
CREATE INDEX idx_players_name ON public.players(last_name, first_name);

-- Viewings (a scouting evaluation tied to a player)
CREATE TABLE public.viewings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  game_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opponent TEXT,
  location TEXT,
  notes TEXT,
  rating_skating SMALLINT,
  rating_shot SMALLINT,
  rating_hands SMALLINT,
  rating_iq SMALLINT,
  rating_compete SMALLINT,
  rating_physicality SMALLINT,
  rating_overall SMALLINT,
  projection TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.viewings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read viewings" ON public.viewings FOR SELECT USING (true);
CREATE POLICY "Public insert viewings" ON public.viewings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update viewings" ON public.viewings FOR UPDATE USING (true);
CREATE POLICY "Public delete viewings" ON public.viewings FOR DELETE USING (true);
CREATE TRIGGER trg_viewings_updated BEFORE UPDATE ON public.viewings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_viewings_player ON public.viewings(player_id);
CREATE INDEX idx_viewings_date ON public.viewings(game_date DESC);

-- Watch list
CREATE TABLE public.watch_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.watch_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read watch_list" ON public.watch_list FOR SELECT USING (true);
CREATE POLICY "Public insert watch_list" ON public.watch_list FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update watch_list" ON public.watch_list FOR UPDATE USING (true);
CREATE POLICY "Public delete watch_list" ON public.watch_list FOR DELETE USING (true);