import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnvironment } from "@/lib/env/server";

import * as schema from "./schema";

const globalForDatabase = globalThis as unknown as {
  database?: NodePgDatabase<typeof schema>;
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

export function getDatabasePool() {
  if (!globalForDatabase.databasePool) {
    globalForDatabase.databasePool = createPool();
  }

  return globalForDatabase.databasePool;
}

export function getDatabase() {
  if (!globalForDatabase.database) {
    globalForDatabase.database = drizzle({ client: getDatabasePool(), schema });
  }

  return globalForDatabase.database;
}
