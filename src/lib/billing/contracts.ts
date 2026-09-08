export const BILLING_PLAN = {
  FREE: "FREE",
  PREMIUM_MATH: "PREMIUM_MATH",
} as const;

export type BillingPlan = (typeof BILLING_PLAN)[keyof typeof BILLING_PLAN];

export const STRIPE_SUBSCRIPTION_STATUSES = [
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "paused",
  "trialing",
  "unpaid",
] as const;

export type StripeSubscriptionStatus =
  (typeof STRIPE_SUBSCRIPTION_STATUSES)[number];

export type StoredSubscriptionStatus = Uppercase<StripeSubscriptionStatus>;

export type NormalizedSubscription = {
  id: string;
  customerId: string;
  productId: string;
  priceId: string | null;
  status: StoredSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
};

export function toStoredSubscriptionStatus(
  status: string,
): StoredSubscriptionStatus {
  if (
    !STRIPE_SUBSCRIPTION_STATUSES.includes(status as StripeSubscriptionStatus)
  ) {
    throw new Error(`UNSUPPORTED_STRIPE_SUBSCRIPTION_STATUS:${status}`);
  }
  return status.toUpperCase() as StoredSubscriptionStatus;
}

export function grantsPremiumMathAccess(
  subscription: Pick<NormalizedSubscription, "productId" | "status">,
  premiumProductId: string,
): boolean {
  return (
    subscription.productId === premiumProductId &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING")
  );
}
