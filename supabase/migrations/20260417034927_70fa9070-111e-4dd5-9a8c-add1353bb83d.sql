create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  environment text not null default 'sandbox',
  stripe_customer_id text,
  stripe_subscription_id text,
  product_id text,
  price_id text,
  status text,
  cancel_at_period_end boolean default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users read own subscription"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create trigger update_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.update_updated_at_column();

alter publication supabase_realtime add table public.subscriptions;