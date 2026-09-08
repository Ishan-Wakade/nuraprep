import { z } from "zod";

const serverEnvironmentSchema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url(),
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url().optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  BILLING_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  STRIPE_MODE: z.enum(["test", "live"]).default("test"),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_ID: z.string().min(1).optional(),
  STRIPE_PREMIUM_PRODUCT_ID: z.string().min(1).optional(),
  DEV_REVIEWER_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DEV_LEARNER_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function parseServerEnvironment(
  input: Record<string, string | undefined>,
): ServerEnvironment {
  const environment = serverEnvironmentSchema.parse(input);

  if (
    environment.APP_ENV === "production" &&
    (environment.DEV_REVIEWER_ENABLED || environment.DEV_LEARNER_ENABLED)
  ) {
    throw new Error(
      "Development identity bypasses cannot be enabled in production.",
    );
  }

  if (
    Boolean(environment.GOOGLE_CLIENT_ID) !==
    Boolean(environment.GOOGLE_CLIENT_SECRET)
  ) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together.",
    );
  }

  if (
    environment.APP_ENV === "production" &&
    (!environment.BETTER_AUTH_SECRET || !environment.GOOGLE_CLIENT_ID)
  ) {
    throw new Error(
      "Production requires BETTER_AUTH_SECRET and Google OAuth credentials.",
    );
  }

  if (environment.BILLING_ENABLED) {
    if (
      !environment.STRIPE_SECRET_KEY ||
      !environment.STRIPE_WEBHOOK_SECRET ||
      !environment.STRIPE_PRICE_ID ||
      !environment.STRIPE_PREMIUM_PRODUCT_ID
    ) {
      throw new Error(
        "Enabled billing requires Stripe secret, webhook secret, price, and premium product identifiers.",
      );
    }

    const secretPrefix =
      environment.STRIPE_MODE === "live" ? "sk_live_" : "sk_test_";
    if (!environment.STRIPE_SECRET_KEY.startsWith(secretPrefix)) {
      throw new Error(
        `STRIPE_SECRET_KEY must match configured ${environment.STRIPE_MODE} mode.`,
      );
    }
    if (!environment.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
      throw new Error("STRIPE_WEBHOOK_SECRET must start with whsec_.");
    }
    if (!environment.STRIPE_PRICE_ID.startsWith("price_")) {
      throw new Error("STRIPE_PRICE_ID must start with price_.");
    }
    if (!environment.STRIPE_PREMIUM_PRODUCT_ID.startsWith("prod_")) {
      throw new Error("STRIPE_PREMIUM_PRODUCT_ID must start with prod_.");
    }
  }

  return environment;
}
