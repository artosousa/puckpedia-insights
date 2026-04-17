CREATE OR REPLACE FUNCTION public.tier_player_limit(tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE tier
    WHEN 'peewee' THEN 2147483647
    WHEN 'junior' THEN 2147483647
    WHEN 'minor'  THEN 2147483647
    WHEN 'pro'    THEN 2147483647
    ELSE 2147483647
  END;
$function$;