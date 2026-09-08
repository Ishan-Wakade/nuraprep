import "server-only";

import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";
import type Stripe from "stripe";

import { getDatabase } from "@/db/client";
import {
  billingCustomers,
  billingSubscriptions,
  billingWebhookEvents,
} from "@/db/schema";
import {
  BILLING_PLAN,
  grantsPremiumMathAccess,
  type NormalizedSubscription,
} from "@/lib/billing/contracts";
import { normalizeStripeSubscription } from "@/lib/billing/normalize";
import type { ServerEnvironment } from "@/lib/env/validation";

const SYNCHRONIZED_SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.updated",
]);

type BillingUser = { id: string; email: string; name: string };

export type BillingOverview = {
  enabled: boolean;
  plan: "FREE" | "PREMIUM_MATH";
  subscriptionStatus: NormalizedSubscription["status"] | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  hasCustomer: boolean;
  canStartCheckout: boolean;
  canManageBilling: boolean;
};

export async function getBillingOverview(
  userId: string | null,
  environment: ServerEnvironment,
): Promise<BillingOverview> {
  const disabled: BillingOverview = {
    enabled: environment.BILLING_ENABLED,
    plan: BILLING_PLAN.FREE,
    subscriptionStatus: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    hasCustomer: false,
    canStartCheckout: environment.BILLING_ENABLED && Boolean(userId),
    canManageBilling: false,
  };
  if (!environment.BILLING_ENABLED || !userId) return disabled;

  const database = getDatabase();
  const [customer] = await database
    .select({ id: billingCustomers.id })
    .from(billingCustomers)
    .where(eq(billingCustomers.userId, userId))
    .limit(1);
  if (!customer) return disabled;

  const subscriptions = await database
    .select({
      productId: billingSubscriptions.stripeProductId,
      status: billingSubscriptions.status,
      cancelAtPeriodEnd: billingSubscriptions.cancelAtPeriodEnd,
      currentPeriodEnd: billingSubscriptions.currentPeriodEnd,
    })
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.billingCustomerId, customer.id))
    .orderBy(desc(billingSubscriptions.lastSyncedAt));

  const configuredProductId = environment.STRIPE_PREMIUM_PRODUCT_ID!;
  const matching = subscriptions.filter(
    (subscription) => subscription.productId === configuredProductId,
  );
  const premium = matching.some((subscription) =>
    grantsPremiumMathAccess(subscription, configuredProductId),
  );
  const current =
    matching.find((subscription) =>
      grantsPremiumMathAccess(subscription, configuredProductId),
    ) ?? matching[0];
  const hasOpenSubscription = matching.some((subscription) =>
    [
      "ACTIVE",
      "INCOMPLETE",
      "PAST_DUE",
      "PAUSED",
      "TRIALING",
      "UNPAID",
    ].includes(subscription.status),
  );

  return {
    enabled: true,
    plan: premium ? BILLING_PLAN.PREMIUM_MATH : BILLING_PLAN.FREE,
    subscriptionStatus: current?.status ?? null,
    cancelAtPeriodEnd: current?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: current?.currentPeriodEnd ?? null,
    hasCustomer: true,
    canStartCheckout: !hasOpenSubscription,
    canManageBilling: true,
  };
}

export async function getOrCreateStripeCustomer(
  user: BillingUser,
  stripe: Stripe,
): Promise<string> {
  const database = getDatabase();
  const [existing] = await database
    .select({ stripeCustomerId: billingCustomers.stripeCustomerId })
    .from(billingCustomers)
    .where(eq(billingCustomers.userId, user.id))
    .limit(1);
  if (existing) return existing.stripeCustomerId;

  const created = await stripe.customers.create(
    {
      email: user.email,
      name: user.name,
      metadata: { nuraprep_user_id: user.id },
    },
    { idempotencyKey: `nuraprep-customer:${user.id}` },
  );

  await database
    .insert(billingCustomers)
    .values({ userId: user.id, stripeCustomerId: created.id })
    .onConflictDoNothing({ target: billingCustomers.userId });

  const [stored] = await database
    .select({ stripeCustomerId: billingCustomers.stripeCustomerId })
    .from(billingCustomers)
    .where(eq(billingCustomers.userId, user.id))
    .limit(1);
  if (!stored) throw new Error("BILLING_CUSTOMER_MAPPING_FAILED");
  return stored.stripeCustomerId;
}

export async function createCheckoutUrl(
  user: BillingUser,
  stripe: Stripe,
  environment: ServerEnvironment,
): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(user, stripe);
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: environment.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${environment.NEXT_PUBLIC_APP_URL}/account?checkout=success`,
      cancel_url: `${environment.NEXT_PUBLIC_APP_URL}/account?checkout=canceled`,
      metadata: { nuraprep_user_id: user.id },
      subscription_data: {
        metadata: { nuraprep_user_id: user.id },
      },
    },
    { idempotencyKey: `nuraprep-checkout:${user.id}:${randomUUID()}` },
  );
  if (!session.url) throw new Error("STRIPE_CHECKOUT_URL_MISSING");
  return session.url;
}

export async function createPortalUrl(
  userId: string,
  stripe: Stripe,
  environment: ServerEnvironment,
): Promise<string | null> {
  const database = getDatabase();
  const [customer] = await database
    .select({ stripeCustomerId: billingCustomers.stripeCustomerId })
    .from(billingCustomers)
    .where(eq(billingCustomers.userId, userId))
    .limit(1);
  if (!customer) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripeCustomerId,
    return_url: `${environment.NEXT_PUBLIC_APP_URL}/account`,
  });
  return session.url;
}

export async function deleteStripeCustomerForAccountErasure(
  userId: string,
  stripe: Stripe | null,
): Promise<boolean> {
  const [customer] = await getDatabase()
    .select({ stripeCustomerId: billingCustomers.stripeCustomerId })
    .from(billingCustomers)
    .where(eq(billingCustomers.userId, userId))
    .limit(1);
  if (!customer) return false;
  if (!stripe) throw new Error("BILLING_PROVIDER_REQUIRED_FOR_ERASURE");

  try {
    await stripe.customers.del(customer.stripeCustomerId);
    return true;
  } catch (error) {
    // If Stripe completed deletion but the application failed before its local
    // transaction, a retry may observe the already-deleted customer.
    const existing = await stripe.customers
      .retrieve(customer.stripeCustomerId)
      .catch(() => null);
    if (existing && "deleted" in existing && existing.deleted) return true;
    throw error;
  }
}

export type WebhookProcessingResult = {
  duplicate: boolean;
  outcome: "PROCESSED" | "IGNORED";
  reasonCode: string;
};

export async function processStripeEvent(
  event: Stripe.Event,
  stripe: Stripe,
): Promise<WebhookProcessingResult> {
  const objectId = getStripeObjectId(event.data.object);
  if (!SYNCHRONIZED_SUBSCRIPTION_EVENTS.has(event.type)) {
    return recordIgnoredEvent(event, objectId, "UNHANDLED_EVENT_TYPE");
  }
  if (!objectId?.startsWith("sub_")) {
    return recordIgnoredEvent(event, objectId, "MALFORMED_SUBSCRIPTION_EVENT");
  }

  // Fetching the object at processing time makes synchronization independent
  // of Stripe's webhook delivery order.
  const subscription = normalizeStripeSubscription(
    await stripe.subscriptions.retrieve(objectId),
  );
  const database = getDatabase();

  return database.transaction(async (transaction) => {
    const [customer] = await transaction
      .select({ id: billingCustomers.id })
      .from(billingCustomers)
      .where(eq(billingCustomers.stripeCustomerId, subscription.customerId))
      .limit(1);
    const outcome = customer ? "PROCESSED" : "IGNORED";
    const reasonCode = customer
      ? "SUBSCRIPTION_SYNCHRONIZED"
      : "UNKNOWN_CUSTOMER";
    const inserted = await transaction
      .insert(billingWebhookEvents)
      .values(webhookEventRecord(event, objectId, outcome, reasonCode))
      .onConflictDoNothing({ target: billingWebhookEvents.stripeEventId })
      .returning({ stripeEventId: billingWebhookEvents.stripeEventId });
    if (inserted.length === 0) {
      return { duplicate: true, outcome, reasonCode: "DUPLICATE_EVENT" };
    }
    if (!customer) return { duplicate: false, outcome, reasonCode };

    await transaction
      .insert(billingSubscriptions)
      .values({
        billingCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        stripeProductId: subscription.productId,
        stripePriceId: subscription.priceId,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
        lastStripeEventCreatedAt: new Date(event.created * 1_000),
        lastStripeEventId: event.id,
      })
      .onConflictDoUpdate({
        target: billingSubscriptions.stripeSubscriptionId,
        set: {
          billingCustomerId: customer.id,
          stripeProductId: subscription.productId,
          stripePriceId: subscription.priceId,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          currentPeriodEnd: subscription.currentPeriodEnd,
          lastStripeEventCreatedAt: new Date(event.created * 1_000),
          lastStripeEventId: event.id,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    return { duplicate: false, outcome, reasonCode };
  });
}

async function recordIgnoredEvent(
  event: Stripe.Event,
  objectId: string | null,
  reasonCode: string,
): Promise<WebhookProcessingResult> {
  const inserted = await getDatabase()
    .insert(billingWebhookEvents)
    .values(webhookEventRecord(event, objectId, "IGNORED", reasonCode))
    .onConflictDoNothing({ target: billingWebhookEvents.stripeEventId })
    .returning({ stripeEventId: billingWebhookEvents.stripeEventId });
  return {
    duplicate: inserted.length === 0,
    outcome: "IGNORED",
    reasonCode: inserted.length === 0 ? "DUPLICATE_EVENT" : reasonCode,
  };
}

function webhookEventRecord(
  event: Stripe.Event,
  objectId: string | null,
  outcome: "PROCESSED" | "IGNORED",
  reasonCode: string,
) {
  return {
    stripeEventId: event.id,
    eventType: event.type,
    stripeObjectId: objectId,
    livemode: event.livemode,
    eventCreatedAt: new Date(event.created * 1_000),
    outcome,
    reasonCode,
  } as const;
}

function getStripeObjectId(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  ) {
    return value.id;
  }
  return null;
}
