-- Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('player-media', 'player-media', false)
on conflict (id) do nothing;

-- Storage RLS: files are stored under {user_id}/...
create policy "Users read own player media"
on storage.objects for select to authenticated
using (bucket_id = 'player-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users upload own player media"
on storage.objects for insert to authenticated
with check (bucket_id = 'player-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own player media"
on storage.objects for update to authenticated
using (bucket_id = 'player-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own player media"
on storage.objects for delete to authenticated
using (bucket_id = 'player-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- player_media table
create table public.player_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  player_id uuid not null references public.players(id) on delete cascade,
  viewing_id uuid references public.viewings(id) on delete set null,
  kind text not null check (kind in ('photo','video')),
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  duration_seconds numeric,
  tags text[] not null default '{}',
  notes text,
  ai_analysis text,
  ai_analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index player_media_player_idx on public.player_media(player_id);
create index player_media_viewing_idx on public.player_media(viewing_id);
create index player_media_user_idx on public.player_media(user_id);

alter table public.player_media enable row level security;

create policy "Users read own player_media" on public.player_media
for select to authenticated using (auth.uid() = user_id);

create policy "Users insert own player_media" on public.player_media
for insert to authenticated with check (auth.uid() = user_id);

create policy "Users update own player_media" on public.player_media
for update to authenticated using (auth.uid() = user_id);

create policy "Users delete own player_media" on public.player_media
for delete to authenticated using (auth.uid() = user_id);

create trigger player_media_updated_at
before update on public.player_media
for each row execute function public.update_updated_at_column();