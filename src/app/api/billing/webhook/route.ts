import { processStripeEvent } from "@/data/billing";
import { getStripeClient } from "@/lib/billing/stripe";
import { getServerEnvironment } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const environment = getServerEnvironment();
  if (!environment.BILLING_ENABLED || !environment.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "Billing is not enabled." }, { status: 404 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const stripe = getStripeClient();
  let event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      environment.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return Response.json(
      { error: "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  const expectsLiveEvent = environment.STRIPE_MODE === "live";
  if (event.livemode !== expectsLiveEvent) {
    return Response.json(
      { error: "Stripe event mode does not match this environment." },
      { status: 400 },
    );
  }

  try {
    const result = await processStripeEvent(event, stripe);
    return Response.json({ received: true, ...result });
  } catch {
    // A non-2xx response asks Stripe to retry transient retrieval or database
    // failures instead of silently losing subscription state.
    return Response.json(
      { error: "Stripe event processing failed." },
      { status: 500 },
    );
  }
}
