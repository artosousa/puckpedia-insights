import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Check, ClipboardCheck, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIERS, type Tier, aiReportsLimitLabel } from "@/lib/tiers";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { openBillingPortal } from "@/lib/stripe";
import { toast } from "sonner";

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tierId, hasStripeSubscription, loading, cancelAtPeriodEnd, currentPeriodEnd } = useSubscription();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [checkoutPrice, setCheckoutPrice] = useState<{ priceId: string; tierName: string } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async (msg?: string) => {
    try {
      setPortalLoading(true);
      const url = await openBillingPortal(`${window.location.origin}/pricing`);
      window.open(url, "_blank");
      if (msg) toast.info(msg);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSelect = async (tier: Tier) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    // Already on this tier — manage in portal (or nothing for free)
    if (tierId === tier.id) {
      if (tier.id === "peewee") return;
      await openPortal();
      return;
    }
    // Downgrading to free PeeWee — must cancel via portal (no $0 Stripe price)
    if (tier.id === "peewee") {
      if (!hasStripeSubscription) return;
      await openPortal(
        "Cancel your current plan in the portal — you'll keep access until your renewal date, then drop to Healthy Scratch.",
      );
      return;
    }
    // Existing subscriber switching paid tiers — use portal
    if (hasStripeSubscription) {
      await openPortal("Switch your plan inside the billing portal.");
      return;
    }
    const price = billing === "monthly" ? tier.monthly : tier.yearly;
    if (!price) return;
    setCheckoutPrice({ priceId: price.priceId, tierName: tier.name });
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-3">
            <Link
              to={user ? "/dashboard" : "/"}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <span className="font-heading text-base font-bold">BarnNotes</span>
            <span className="text-muted-foreground text-sm">/ Pricing</span>
          </div>
        </div>
      </header>

      <main className="container px-6 py-12 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-3">Pick your plan.</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From Healthy Scratch to McJesus — scale your scouting workflow as your prospect list grows.
          </p>
        </motion.div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-secondary border border-border/50">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                billing === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors flex items-center gap-2 ${
                billing === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                2 mo free
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((tier, i) => {
            const price = billing === "monthly" ? tier.monthly : tier.yearly;
            const isCurrent = !loading && tierId === tier.id;
            const limit = tier.playerLimit === Infinity ? "Unlimited" : tier.playerLimit;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card rounded-2xl p-6 flex flex-col relative ${
                  tier.highlighted ? "border-primary/50 shadow-[0_0_40px_-15px_hsl(16,78%,57%/0.4)]" : ""
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">
                    Most popular
                  </div>
                )}
                <h3 className="font-heading text-xl font-bold">{tier.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-5">{tier.tagline}</p>

                <div className="mb-5">
                  {price ? (
                    <>
                      <span className="font-heading text-4xl font-bold">${price.amount}</span>
                      <span className="text-muted-foreground text-sm">/{billing === "monthly" ? "mo" : "yr"}</span>
                    </>
                  ) : (
                    <span className="font-heading text-4xl font-bold">$0</span>
                  )}
                </div>

                <ul className="space-y-2.5 text-sm mb-6 flex-1">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>
                      {limit} player{limit === 1 ? "" : "s"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Unlimited evaluations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Excel & CSV exports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    {tier.aiReports ? (
                      <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground/50">—</span>
                    )}
                    <span className={tier.aiReports ? "" : "text-muted-foreground/60"}>
                      AI scouting reports — {aiReportsLimitLabel(tier)}
                    </span>
                  </li>
                </ul>

                <Button
                  variant={isCurrent ? "outline" : tier.highlighted ? "hero" : "default"}
                  className="w-full"
                  disabled={portalLoading || (tier.id === "peewee" && isCurrent)}
                  onClick={() => handleSelect(tier)}
                >
                  {portalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCurrent
                    ? tier.id === "peewee"
                      ? "Current plan"
                      : "Manage plan"
                    : tier.id === "peewee"
                      ? hasStripeSubscription
                        ? "Cancel paid plan"
                        : "Free forever"
                      : `Choose ${tier.name}`}
                </Button>
                {isCurrent && currentPeriodEnd && tier.id !== "peewee" && (
                  <p className="text-[11px] text-muted-foreground mt-2 text-center">
                    {cancelAtPeriodEnd
                      ? `Cancels on ${new Date(currentPeriodEnd).toLocaleDateString()}`
                      : `Renews on ${new Date(currentPeriodEnd).toLocaleDateString()}`}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Prices in USD. Cancel anytime from the billing portal.
        </p>
      </main>

      <CheckoutDialog
        open={!!checkoutPrice}
        onOpenChange={(v) => !v && setCheckoutPrice(null)}
        priceId={checkoutPrice?.priceId ?? null}
        tierName={checkoutPrice?.tierName}
      />
    </div>
  );
};

export default Pricing;
