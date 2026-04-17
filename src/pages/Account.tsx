import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ClipboardCheck, ExternalLink, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { TIER_BY_ID, aiReportsLimitLabel } from "@/lib/tiers";
import { openBillingPortal } from "@/lib/stripe";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { toast } from "sonner";

const Account = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    tier,
    tierId,
    status,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    hasStripeSubscription,
    aiReportsThisMonth,
    aiReportsRemaining,
    loading,
  } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    try {
      setPortalLoading(true);
      const url = await openBillingPortal(`${window.location.origin}/account`);
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const reportsLabel =
    tier.aiReportsPerMonth === 0
      ? "Not included"
      : !isFinite(tier.aiReportsPerMonth)
        ? `${aiReportsThisMonth} used (unlimited)`
        : `${aiReportsThisMonth} / ${tier.aiReportsPerMonth} used this month`;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <span className="font-heading text-base font-bold">BarnNotes</span>
            <span className="text-muted-foreground text-sm">/ Account</span>
          </div>
        </div>
      </header>

      <main className="container px-6 py-12 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-heading text-3xl font-bold mb-1">Account</h1>
          <p className="text-sm text-muted-foreground">Manage your profile, plan, and billing.</p>
        </motion.div>

        {/* Profile */}
        <section className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="font-heading text-base font-semibold mb-4">Profile</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground mb-1">Email</dt>
              <dd>{user?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-1">User ID</dt>
              <dd className="font-mono text-xs text-muted-foreground truncate">{user?.id ?? "—"}</dd>
            </div>
          </dl>
          <div className="mt-5">
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
              Sign out
            </Button>
          </div>
        </section>

        {/* Plan */}
        <section className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div>
              <h2 className="font-heading text-base font-semibold">Current plan</h2>
              <p className="text-xs text-muted-foreground mt-1">{tier.tagline}</p>
            </div>
            <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              {tier.name}
            </div>
          </div>

          {status === "past_due" && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-4 text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Payment failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update your payment method in the billing portal to keep your plan active.
                </p>
              </div>
            </div>
          )}

          {cancelAtPeriodEnd && currentPeriodEnd && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 mb-4 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-200">Cancellation scheduled</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You'll keep {tier.name} access until {new Date(currentPeriodEnd).toLocaleDateString()}, then drop to PeeWee.
                </p>
              </div>
            </div>
          )}

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-5">
            <div>
              <dt className="text-xs text-muted-foreground mb-1">Player limit</dt>
              <dd>{isFinite(tier.playerLimit) ? `${tier.playerLimit} players` : "Unlimited"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-1">AI scouting reports</dt>
              <dd>{aiReportsLimitLabel(tier)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-1">AI usage this month</dt>
              <dd>{reportsLabel}{tier.aiReports && isFinite(tier.aiReportsPerMonth) ? ` · ${aiReportsRemaining} left` : ""}</dd>
            </div>
            {currentPeriodEnd && hasStripeSubscription && (
              <div>
                <dt className="text-xs text-muted-foreground mb-1">
                  {cancelAtPeriodEnd ? "Access ends" : "Next renewal"}
                </dt>
                <dd>{new Date(currentPeriodEnd).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap gap-3">
            <Button variant="hero" size="sm" onClick={() => navigate("/pricing")}>
              <Sparkles className="w-4 h-4" />
              {tierId === "pro" ? "View plans" : "Change plan"}
            </Button>
            {hasStripeSubscription && (
              <Button variant="outline" size="sm" onClick={openPortal} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Manage billing
              </Button>
            )}
          </div>
          {!loading && !hasStripeSubscription && tierId === "peewee" && (
            <p className="text-xs text-muted-foreground mt-4">
              You're on the free PeeWee plan. Upgrade any time to unlock more players and AI reports.
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default Account;
