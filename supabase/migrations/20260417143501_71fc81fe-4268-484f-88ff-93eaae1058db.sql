create table if not exists public.user_theme_prefs (
  user_id uuid primary key default auth.uid(),
  background text,
  foreground text,
  primary_color text,
  primary_foreground text,
  accent text,
  card text,
  border text,
  surface_elevated text,
  surface_sunken text,
  updated_at timestamptz not null default now()
);

alter table public.user_theme_prefs enable row level security;

create policy "Users read own theme" on public.user_theme_prefs
for select to authenticated using (auth.uid() = user_id);

create policy "Users insert own theme" on public.user_theme_prefs
for insert to authenticated with check (auth.uid() = user_id);

create policy "Users update own theme" on public.user_theme_prefs
for update to authenticated using (auth.uid() = user_id);

create policy "Users delete own theme" on public.user_theme_prefs
for delete to authenticated using (auth.uid() = user_id);

create trigger user_theme_prefs_updated_at
before update on public.user_theme_prefs
for each row execute function public.update_updated_at_column();