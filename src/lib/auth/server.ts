import "server-only";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";

import { getDatabase } from "@/db/client";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
} from "@/db/schema";
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
