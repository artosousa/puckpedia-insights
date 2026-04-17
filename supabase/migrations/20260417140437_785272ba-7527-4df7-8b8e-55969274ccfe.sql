-- Helper: resolve a user's active tier id (defaults to 'peewee')
CREATE OR REPLACE FUNCTION public.current_tier_id(uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT product_id
       FROM public.subscriptions
      WHERE user_id = uid
        AND status IN ('active','trialing')
        AND (current_period_end IS NULL OR current_period_end > now())
      ORDER BY updated_at DESC
      LIMIT 1),
    'peewee'
  );
$$;

-- Helper: numeric player limit for a tier id
CREATE OR REPLACE FUNCTION public.tier_player_limit(tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE tier
    WHEN 'peewee' THEN 10
    WHEN 'junior' THEN 25
    WHEN 'minor'  THEN 50
    WHEN 'pro'    THEN 2147483647
    ELSE 10
  END;
$$;

-- Trigger: enforce player limit on insert
CREATE OR REPLACE FUNCTION public.enforce_player_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := NEW.user_id;
  tier text;
  lim integer;
  current_count integer;
BEGIN
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;
  tier := public.current_tier_id(uid);
  lim  := public.tier_player_limit(tier);
  SELECT COUNT(*) INTO current_count FROM public.players WHERE user_id = uid;
  IF current_count >= lim THEN
    RAISE EXCEPTION 'player_limit_reached: % plan allows up to % players', tier, lim
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_player_limit ON public.players;
CREATE TRIGGER trg_enforce_player_limit
  BEFORE INSERT ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_player_limit();