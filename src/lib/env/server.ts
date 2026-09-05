import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url().optional(),
  DEV_REVIEWER_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  if (!cachedEnvironment) {
    cachedEnvironment = serverEnvironmentSchema.parse(process.env);

    if (
      cachedEnvironment.APP_ENV === "production" &&
      cachedEnvironment.DEV_REVIEWER_ENABLED
    ) {
      throw new Error("DEV_REVIEWER_ENABLED cannot be enabled in production.");
    }
  }

  return cachedEnvironment;
}
