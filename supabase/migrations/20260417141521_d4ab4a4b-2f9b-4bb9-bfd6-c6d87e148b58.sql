INSERT INTO public.subscriptions (user_id, environment, product_id, price_id, status, current_period_end, cancel_at_period_end)
VALUES (
  '61924eec-bbe4-4c1a-84b4-424efc126414',
  'sandbox',
  'pro',
  'pro_yearly',
  'active',
  (now() + interval '10 years'),
  false
);