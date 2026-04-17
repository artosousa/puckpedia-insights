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
  const [aiReportsThisMonth, setAiReportsThisMonth] = useState(0);

  useEffect(() => {
    if (!user) { setRow(null); setAiReportsThisMonth(0); setLoading(false); return; }
    let cancelled = false;

    const monthStart = (() => {
      const n = new Date();
      return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString();
    })();

    const load = async () => {
      const [subRes, usageRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("product_id,status,cancel_at_period_end,current_period_end,stripe_subscription_id")
          .eq("user_id", user.id)
          .eq("environment", stripeEnvironment)
          .maybeSingle(),
        supabase
          .from("ai_reports")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", monthStart),
      ]);
      if (!cancelled) {
        setRow(subRes.data as SubRow | null);
        setAiReportsThisMonth(usageRes.count ?? 0);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`sub:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_reports", filter: `user_id=eq.${user.id}` },
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

  const aiReportsRemaining = isFinite(tier.aiReportsPerMonth)
    ? Math.max(0, tier.aiReportsPerMonth - aiReportsThisMonth)
    : Infinity;
  const canGenerateReport = tier.aiReports && aiReportsRemaining > 0;

  return {
    loading,
    tier,
    tierId: tier.id,
    status: row?.status ?? null,
    cancelAtPeriodEnd: !!row?.cancel_at_period_end,
    currentPeriodEnd: row?.current_period_end ?? null,
    hasStripeSubscription: !!row?.stripe_subscription_id,
    aiReportsThisMonth,
    aiReportsRemaining,
    canGenerateReport,
  };
}
