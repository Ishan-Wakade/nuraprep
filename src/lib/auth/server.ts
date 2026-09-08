import "server-only";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";

import { getDatabase } from "@/db/client";
import {
  authAccounts,
  authRateLimits,
  authSessions,
  authUsers,
  authVerifications,
} from "@/db/schema";
import { getAuthCookiePolicy } from "@/lib/auth/cookie-policy";
import { getServerEnvironment } from "@/lib/env/server";

const environment = getServerEnvironment();
const googleConfigured = Boolean(
  environment.GOOGLE_CLIENT_ID && environment.GOOGLE_CLIENT_SECRET,
);

export const auth = betterAuth({
  appName: "NuraPrep",
  baseURL: environment.NEXT_PUBLIC_APP_URL,
  ...(environment.BETTER_AUTH_SECRET
    ? { secret: environment.BETTER_AUTH_SECRET }
    : {}),
  database: drizzleAdapter(getDatabase(), {
    provider: "pg",
    schema: {
      user: authUsers,
      session: authSessions,
      account: authAccounts,
      verification: authVerifications,
      rateLimit: authRateLimits,
    },
  }),
  emailAndPassword: { enabled: false },
  socialProviders: googleConfigured
    ? {
        google: {
          clientId: environment.GOOGLE_CLIENT_ID!,
          clientSecret: environment.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 15,
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 120,
    customRules: {
      "/sign-in/social": { window: 60, max: 5 },
    },
  },
  advanced: {
    ...getAuthCookiePolicy(environment),
    disableCSRFCheck: false,
    disableOriginCheck: false,
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"],
      trustedProxies: environment.TRUSTED_PROXY_CIDRS,
      ipv6Subnet: 64,
    },
  },
  // Keep Better Auth's direct deletion endpoint disabled until NuraPrep's
  // application-owned, transactional export/deletion workflow is complete.
  account: {
    encryptOAuthTokens: true,
    storeStateStrategy: "database",
    accountLinking: {
      enabled: false,
      allowUnlinkingAll: false,
    },
  },
  trustedOrigins: [environment.NEXT_PUBLIC_APP_URL],
});
