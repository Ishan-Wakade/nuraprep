import "dotenv/config";

import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DIRECT_URL or DATABASE_URL is required for database commands.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  migrations: {
    prefix: "timestamp",
  },
  strict: true,
  verbose: true,
});
