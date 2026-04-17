
-- 1. Add user_id columns (nullable initially to backfill, then enforce)
ALTER TABLE public.leagues   ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.teams     ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.players   ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.viewings  ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.watch_list ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2. Delete pre-existing rows with no owner (test data only — safe per user)
DELETE FROM public.viewings   WHERE user_id IS NULL;
DELETE FROM public.watch_list WHERE user_id IS NULL;
DELETE FROM public.players    WHERE user_id IS NULL;
DELETE FROM public.teams      WHERE user_id IS NULL;
DELETE FROM public.leagues    WHERE user_id IS NULL;

-- 3. Enforce NOT NULL
ALTER TABLE public.leagues    ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.teams      ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.players    ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.viewings   ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.watch_list ALTER COLUMN user_id SET NOT NULL;

-- 4. Default user_id to auth.uid() so client inserts don't have to set it
ALTER TABLE public.leagues    ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.teams      ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.players    ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.viewings   ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.watch_list ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 5. Drop old permissive public policies
DROP POLICY IF EXISTS "Public read leagues"   ON public.leagues;
DROP POLICY IF EXISTS "Public insert leagues" ON public.leagues;
DROP POLICY IF EXISTS "Public update leagues" ON public.leagues;
DROP POLICY IF EXISTS "Public delete leagues" ON public.leagues;

DROP POLICY IF EXISTS "Public read teams"   ON public.teams;
DROP POLICY IF EXISTS "Public insert teams" ON public.teams;
DROP POLICY IF EXISTS "Public update teams" ON public.teams;
DROP POLICY IF EXISTS "Public delete teams" ON public.teams;

DROP POLICY IF EXISTS "Public read players"   ON public.players;
DROP POLICY IF EXISTS "Public insert players" ON public.players;
DROP POLICY IF EXISTS "Public update players" ON public.players;
DROP POLICY IF EXISTS "Public delete players" ON public.players;

DROP POLICY IF EXISTS "Public read viewings"   ON public.viewings;
DROP POLICY IF EXISTS "Public insert viewings" ON public.viewings;
DROP POLICY IF EXISTS "Public update viewings" ON public.viewings;
DROP POLICY IF EXISTS "Public delete viewings" ON public.viewings;

DROP POLICY IF EXISTS "Public read watch_list"   ON public.watch_list;
DROP POLICY IF EXISTS "Public insert watch_list" ON public.watch_list;
DROP POLICY IF EXISTS "Public update watch_list" ON public.watch_list;
DROP POLICY IF EXISTS "Public delete watch_list" ON public.watch_list;

-- 6. Per-scout policies
-- leagues
CREATE POLICY "Scouts read own leagues"   ON public.leagues FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Scouts insert own leagues" ON public.leagues FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Scouts update own leagues" ON public.leagues FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Scouts delete own leagues" ON public.leagues FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- teams
CREATE POLICY "Scouts read own teams"   ON public.teams FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Scouts insert own teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Scouts update own teams" ON public.teams FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Scouts delete own teams" ON public.teams FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- players
CREATE POLICY "Scouts read own players"   ON public.players FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Scouts insert own players" ON public.players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Scouts update own players" ON public.players FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Scouts delete own players" ON public.players FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- viewings
CREATE POLICY "Scouts read own viewings"   ON public.viewings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Scouts insert own viewings" ON public.viewings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Scouts update own viewings" ON public.viewings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Scouts delete own viewings" ON public.viewings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- watch_list
CREATE POLICY "Scouts read own watch_list"   ON public.watch_list FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Scouts insert own watch_list" ON public.watch_list FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Scouts update own watch_list" ON public.watch_list FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Scouts delete own watch_list" ON public.watch_list FOR DELETE TO authenticated USING (auth.uid() = user_id);
