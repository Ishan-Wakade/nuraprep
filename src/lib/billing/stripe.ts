import "server-only";

import Stripe from "stripe";

import { getServerEnvironment } from "@/lib/env/server";

let cachedStripe: Stripe | undefined;

export function getStripeClient(): Stripe {
  const environment = getServerEnvironment();
  if (!environment.BILLING_ENABLED || !environment.STRIPE_SECRET_KEY) {
    throw new Error("BILLING_NOT_CONFIGURED");
  }

  if (!cachedStripe) {
    cachedStripe = new Stripe(environment.STRIPE_SECRET_KEY, {
      appInfo: {
        name: "NuraPrep",
        version: "0.1.0",
        url: "https://github.com/Ishan-Wakade/nuraprep",
      },
      telemetry: false,
    });
  }

  return cachedStripe;
}
