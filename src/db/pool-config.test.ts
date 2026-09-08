import { describe, expect, it } from "vitest";

import { createDatabasePoolConfig } from "./pool-config";

describe("createDatabasePoolConfig", () => {
  it("uses a small, bounded pool for local development", () => {
    expect(
      createDatabasePoolConfig({
        APP_ENV: "development",
        DATABASE_URL: "postgresql://example.invalid/nuraprep",
      }),
    ).toMatchObject({
      application_name: "nuraprep-development",
      max: 5,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 15_000,
      query_timeout: 20_000,
      idle_in_transaction_session_timeout: 15_000,
      idleTimeoutMillis: 30_000,
      maxLifetimeSeconds: 900,
      keepAlive: true,
      allowExitOnIdle: false,
      ssl: false,
    });
  });

  it("enables certificate verification and production-sized bounds", () => {
    expect(
      createDatabasePoolConfig({
        APP_ENV: "production",
        DATABASE_URL: "postgresql://example.invalid/nuraprep",
      }),
    ).toMatchObject({
      application_name: "nuraprep-production",
      max: 10,
      allowExitOnIdle: false,
      ssl: { rejectUnauthorized: true },
    });
  });

  it("allows test processes to exit after the pool becomes idle", () => {
    expect(
      createDatabasePoolConfig({
        APP_ENV: "test",
        DATABASE_URL: "postgresql://example.invalid/nuraprep_e2e",
      }).allowExitOnIdle,
    ).toBe(true);
  });
});
