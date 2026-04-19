-- Allow URL-based media: storage_path becomes nullable, add source_url
ALTER TABLE public.player_media
  ALTER COLUMN storage_path DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS source_url text;

-- Either a storage_path OR a source_url must be present
ALTER TABLE public.player_media
  DROP CONSTRAINT IF EXISTS player_media_has_source;
ALTER TABLE public.player_media
  ADD CONSTRAINT player_media_has_source
  CHECK (storage_path IS NOT NULL OR source_url IS NOT NULL);