import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, getWebhookSecret } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;
  const stripe = createStripeClient(env);
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, getWebhookSecret(env));
  } catch (err) {
    return new Response(`Webhook signature failed: ${(err as Error).message}`, { status: 400 });
  }

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (!userId) return new Response("ok", { status: 200 });

      const item = sub.items?.data?.[0];
      const priceObj = item?.price;
      const lookupKey = priceObj?.lookup_key ?? null;
      // Map Stripe product back to our human-readable product_id via lookup_key prefix
      const ourProductId = lookupKey?.replace(/_(monthly|yearly)$/, "") ?? null;

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        environment: env,
        stripe_customer_id: sub.customer,
        stripe_subscription_id: sub.id,
        product_id: ourProductId,
        price_id: lookupKey,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const subId = invoice.subscription;
      if (subId) {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subId)
          .eq("environment", env);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(`Handler error: ${(error as Error).message}`, { status: 500 });
  }
});
