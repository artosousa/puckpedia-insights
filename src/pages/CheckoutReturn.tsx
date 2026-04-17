import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { stripeEnvironment } from "@/lib/stripe";

const CheckoutReturn = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [tierName, setTierName] = useState<string | null>(null);

  // Poll the subscriptions row until the webhook lands (or timeout)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12; // ~12s

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        const { data } = await supabase
          .from("subscriptions")
          .select("product_id,status,updated_at")
          .eq("user_id", user.id)
          .eq("environment", stripeEnvironment)
          .maybeSingle();
        const isFresh = data && (data.status === "active" || data.status === "trialing") &&
          data.updated_at && (Date.now() - new Date(data.updated_at).getTime() < 5 * 60 * 1000);
        if (isFresh) {
          if (!cancelled) {
            setConfirmed(true);
            setTierName(data!.product_id);
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!cancelled) setConfirmed(true); // give up & let user proceed anyway
    };
    poll();
    return () => { cancelled = true; };
  }, [user]);

  // Auto-redirect once confirmed
  useEffect(() => {
    if (!confirmed) return;
    const t = setTimeout(() => navigate("/dashboard"), 2000);
    return () => clearTimeout(t);
  }, [confirmed, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          {confirmed
            ? <CheckCircle2 className="w-8 h-8 text-primary" />
            : <Loader2 className="w-8 h-8 text-primary animate-spin" />}
        </div>
        <h1 className="font-heading text-2xl font-bold mb-2">
          {confirmed ? "You're on the roster." : "Activating your plan…"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {confirmed
            ? `Payment received${tierName ? ` — your ${tierName.charAt(0).toUpperCase() + tierName.slice(1)} plan is active` : ""}. Redirecting to your dashboard…`
            : sessionId
              ? "Hang tight while we confirm payment with our billing system."
              : "Setting things up…"}
        </p>
        <Button variant="hero" onClick={() => navigate("/dashboard")} className="w-full" disabled={!confirmed}>
          {confirmed ? "Go to dashboard" : "Please wait…"}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutReturn;
