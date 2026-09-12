import { z } from "zod";

import { parseTrustedProxyCidrs } from "@/lib/security/network";

const LOCAL_ONLY_AUTH_SECRET = "nuraprep-local-only-auth-secret-change-me";

const serverEnvironmentSchema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEPLOYMENT_PLATFORM: z.enum(["LOCAL", "VERCEL", "AWS"]).default("LOCAL"),
  NEXT_PUBLIC_APP_URL: z.url(),
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url().optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: z
    .string()
    .regex(/^[A-Za-z0-9+/]{43}=$/)
    .optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  TRUSTED_PROXY_CIDRS: z.string().default("").transform(parseTrustedProxyCidrs),
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
  const publicUrl = new URL(environment.NEXT_PUBLIC_APP_URL);
  const databaseUrl = new URL(environment.DATABASE_URL);
  const directUrl = environment.DIRECT_URL
    ? new URL(environment.DIRECT_URL)
    : null;

  if (
    publicUrl.username ||
    publicUrl.password ||
    publicUrl.search ||
    publicUrl.hash ||
    (publicUrl.pathname !== "/" && publicUrl.pathname !== "")
  ) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be an origin without credentials, path, query, or fragment.",
    );
  }

  for (const [name, url] of [
    ["DATABASE_URL", databaseUrl],
    ["DIRECT_URL", directUrl],
  ] as const) {
    if (url && !["postgres:", "postgresql:"].includes(url.protocol)) {
      throw new Error(`${name} must use the postgres or postgresql protocol.`);
    }
  }

  if (
    environment.APP_ENV === "production" &&
    (environment.DEV_REVIEWER_ENABLED || environment.DEV_LEARNER_ENABLED)
  ) {
    throw new Error(
      "Development identity bypasses cannot be enabled in production.",
    );
  }

  if (environment.APP_ENV === "production" && publicUrl.protocol !== "https:") {
    throw new Error("Production NEXT_PUBLIC_APP_URL must use HTTPS.");
  }

  if (
    environment.APP_ENV === "production" &&
    environment.BETTER_AUTH_SECRET === LOCAL_ONLY_AUTH_SECRET
  ) {
    throw new Error(
      "Production cannot use the public local-only authentication secret.",
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
    (!environment.BETTER_AUTH_SECRET ||
      !environment.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY ||
      !environment.GOOGLE_CLIENT_ID ||
      (environment.DEPLOYMENT_PLATFORM !== "VERCEL" &&
        environment.TRUSTED_PROXY_CIDRS.length === 0))
  ) {
    throw new Error(
      "Production requires auth and Server Action secrets, Google OAuth credentials, and trusted proxy configuration outside Vercel.",
    );
  }

  if (environment.BILLING_ENABLED) {
    if (
      environment.STRIPE_MODE === "live" &&
      environment.APP_ENV !== "production"
    ) {
      throw new Error("Live Stripe mode is allowed only in production.");
    }
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
