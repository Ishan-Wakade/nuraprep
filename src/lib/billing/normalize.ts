import type Stripe from "stripe";

import type { NormalizedSubscription } from "@/lib/billing/contracts";
import { toStoredSubscriptionStatus } from "@/lib/billing/contracts";

export function normalizeStripeSubscription(
  subscription: Stripe.Subscription,
): NormalizedSubscription {
  const item = subscription.items.data[0];
  if (!item) throw new Error("STRIPE_SUBSCRIPTION_HAS_NO_ITEMS");

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const productId =
    typeof item.price.product === "string"
      ? item.price.product
      : item.price.product.id;
  const periodEnd = Math.max(
    ...subscription.items.data.map((candidate) => candidate.current_period_end),
  );

  return {
    id: subscription.id,
    customerId,
    productId,
    priceId: item.price.id || null,
    status: toStoredSubscriptionStatus(subscription.status),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: Number.isFinite(periodEnd)
      ? new Date(periodEnd * 1_000)
      : null,
  };
}
