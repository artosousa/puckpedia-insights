import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FREE_TIER, TIER_BY_ID, type Tier, type TierId } from "@/lib/tiers";
import { stripeEnvironment } from "@/lib/stripe";

interface SubRow {
  product_id: string | null;
  status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [row, setRow] = useState<SubRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRow(null); setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("product_id,status,cancel_at_period_end,current_period_end,stripe_subscription_id")
        .eq("user_id", user.id)
        .eq("environment", stripeEnvironment)
        .maybeSingle();
      if (!cancelled) { setRow(data as SubRow | null); setLoading(false); }
    };
    load();

    const channel = supabase
      .channel(`sub:${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user]);

  const isActive = !!row && (row.status === "active" || row.status === "trialing") &&
    (!row.current_period_end || new Date(row.current_period_end) > new Date());

  const tier: Tier = isActive && row?.product_id && TIER_BY_ID[row.product_id as TierId]
    ? TIER_BY_ID[row.product_id as TierId]
    : FREE_TIER;

  return {
    loading,
    tier,
    tierId: tier.id,
    status: row?.status ?? null,
    cancelAtPeriodEnd: !!row?.cancel_at_period_end,
    currentPeriodEnd: row?.current_period_end ?? null,
    hasStripeSubscription: !!row?.stripe_subscription_id,
  };
}
