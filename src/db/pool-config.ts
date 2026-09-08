import type { PoolConfig } from "pg";

import type { ServerEnvironment } from "@/lib/env/validation";

type DatabasePoolEnvironment = Pick<
  ServerEnvironment,
  "APP_ENV" | "DATABASE_URL"
>;

const CONNECT_TIMEOUT_MILLISECONDS = 5_000;
const STATEMENT_TIMEOUT_MILLISECONDS = 15_000;
const CLIENT_QUERY_TIMEOUT_MILLISECONDS = 20_000;
const IDLE_TRANSACTION_TIMEOUT_MILLISECONDS = 15_000;
const IDLE_CONNECTION_TIMEOUT_MILLISECONDS = 30_000;
const CONNECTION_LIFETIME_SECONDS = 15 * 60;

export function createDatabasePoolConfig(
  environment: DatabasePoolEnvironment,
): PoolConfig {
  return {
    connectionString: environment.DATABASE_URL,
    application_name: `nuraprep-${environment.APP_ENV}`,
    max: environment.APP_ENV === "development" ? 5 : 10,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MILLISECONDS,
    statement_timeout: STATEMENT_TIMEOUT_MILLISECONDS,
    query_timeout: CLIENT_QUERY_TIMEOUT_MILLISECONDS,
    idle_in_transaction_session_timeout: IDLE_TRANSACTION_TIMEOUT_MILLISECONDS,
    idleTimeoutMillis: IDLE_CONNECTION_TIMEOUT_MILLISECONDS,
    maxLifetimeSeconds: CONNECTION_LIFETIME_SECONDS,
    keepAlive: true,
    allowExitOnIdle: environment.APP_ENV === "test",
    ssl:
      environment.APP_ENV === "production"
        ? { rejectUnauthorized: true }
        : false,
  };
}
