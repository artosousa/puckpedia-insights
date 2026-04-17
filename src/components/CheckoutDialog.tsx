import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStripe, createCheckoutSession } from "@/lib/stripe";
import { useAuth } from "@/hooks/useAuth";
import { useCallback } from "react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  priceId: string | null;
  tierName?: string;
}

export const CheckoutDialog = ({ open, onOpenChange, priceId, tierName }: Props) => {
  const { user } = useAuth();

  const fetchClientSecret = useCallback(async () => {
    if (!priceId) throw new Error("No price selected");
    return createCheckoutSession({
      priceId,
      userId: user?.id,
      customerEmail: user?.email ?? undefined,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  }, [priceId, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Subscribe{tierName ? ` to ${tierName}` : ""}
          </DialogTitle>
        </DialogHeader>
        {open && priceId && (
          <div id="checkout">
            <EmbeddedCheckoutProvider
              key={priceId}
              stripe={getStripe()}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
