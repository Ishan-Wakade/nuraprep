import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnvironment } from "@/lib/env/server";

import * as schema from "./schema";
import { createDatabasePoolConfig } from "./pool-config";

const globalForDatabase = globalThis as unknown as {
  database?: NodePgDatabase<typeof schema>;
  databasePool?: Pool;
};

function createPool() {
  return new Pool(createDatabasePoolConfig(getServerEnvironment()));
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
