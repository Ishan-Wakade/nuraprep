import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnvironment } from "@/lib/env/server";

import * as schema from "./schema";

const globalForDatabase = globalThis as unknown as {
  databasePool?: Pool;
};

function createPool() {
  const environment = getServerEnvironment();

  return new Pool({
    connectionString: environment.DATABASE_URL,
    max: environment.APP_ENV === "development" ? 5 : 10,
    ssl:
      environment.APP_ENV === "production"
        ? { rejectUnauthorized: true }
        : false,
  });
}

export const databasePool = globalForDatabase.databasePool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.databasePool = databasePool;
}

export const database = drizzle({ client: databasePool, schema });
