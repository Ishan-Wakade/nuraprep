import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { Pool } from "pg";

import { MAX_GENERATION_ATTEMPTS } from "../lib/generation/retry-policy";

const EXHAUSTION_SWEEP_LIMIT = 100;

type MaintenanceEnvironment = {
  RUNTIME_SECRET_ARN?: string;
};

type MaintenanceResult = {
  exhaustedRuns: number;
  retryableExpiredRuns: number;
  completedAt: string;
};

type MaintenanceDependencies = {
  getRuntimeSecret(secretArn: string): Promise<string>;
  sweep(databaseUrl: string): Promise<{
    exhaustedRuns: number;
    retryableExpiredRuns: number;
  }>;
  now(): Date;
  log(event: Record<string, unknown>): void;
};

export async function runGenerationMaintenance(
  environment: MaintenanceEnvironment,
  dependencies: MaintenanceDependencies,
): Promise<MaintenanceResult> {
  const secretArn = environment.RUNTIME_SECRET_ARN?.trim();
  if (!secretArn) throw new Error("RUNTIME_SECRET_ARN_REQUIRED");

  const secretPayload = await dependencies.getRuntimeSecret(secretArn);
  const databaseUrl = parseDatabaseUrl(secretPayload);
  const counts = await dependencies.sweep(databaseUrl);
  const result = {
    ...counts,
    completedAt: dependencies.now().toISOString(),
  };

  dependencies.log({
    event: "generation_maintenance_completed",
    ...result,
  });
  return result;
}

export async function handler(): Promise<MaintenanceResult> {
  const secrets = new SecretsManagerClient({});
  return runGenerationMaintenance(
    { RUNTIME_SECRET_ARN: process.env.RUNTIME_SECRET_ARN },
    {
      async getRuntimeSecret(secretArn) {
        const response = await secrets.send(
          new GetSecretValueCommand({ SecretId: secretArn }),
        );
        if (!response.SecretString) throw new Error("RUNTIME_SECRET_EMPTY");
        return response.SecretString;
      },
      sweep: sweepGenerationRuns,
      now: () => new Date(),
      log: (event) => console.info(JSON.stringify(event)),
    },
  );
}

export function parseDatabaseUrl(secretPayload: string): string {
  let payload: unknown;
  try {
    payload = JSON.parse(secretPayload);
  } catch {
    throw new Error("RUNTIME_SECRET_INVALID_JSON");
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("RUNTIME_SECRET_INVALID_SHAPE");
  }

  const databaseUrl = Reflect.get(payload, "DATABASE_URL");
  if (typeof databaseUrl !== "string" || databaseUrl.trim().length === 0) {
    throw new Error("DATABASE_URL_MISSING");
  }
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL_INVALID");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL_INVALID_PROTOCOL");
  }
  return databaseUrl;
}

async function sweepGenerationRuns(databaseUrl: string) {
  const pool = new Pool({
    connectionString: databaseUrl,
    application_name: "nuraprep-generation-maintenance",
    max: 1,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 15_000,
    query_timeout: 20_000,
    idle_in_transaction_session_timeout: 15_000,
    allowExitOnIdle: true,
    ssl: { rejectUnauthorized: true },
  });

  try {
    const exhausted = await pool.query<{ id: string }>(
      `WITH exhausted AS (
         SELECT id
         FROM generation_runs
         WHERE status = 'RUNNING'
           AND lease_expires_at <= now()
           AND attempt_count >= $1
         ORDER BY lease_expires_at, id
         FOR UPDATE SKIP LOCKED
         LIMIT $2
       )
       UPDATE generation_runs AS run
       SET status = 'FAILED',
           failure_code = 'LEASE_ATTEMPTS_EXHAUSTED',
           completed_at = now()
       FROM exhausted
       WHERE run.id = exhausted.id
       RETURNING run.id`,
      [MAX_GENERATION_ATTEMPTS, EXHAUSTION_SWEEP_LIMIT],
    );
    const retryable = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM generation_runs
       WHERE status = 'RUNNING'
         AND lease_expires_at <= now()
         AND attempt_count < $1`,
      [MAX_GENERATION_ATTEMPTS],
    );

    return {
      exhaustedRuns: exhausted.rowCount ?? 0,
      retryableExpiredRuns: Number(retryable.rows[0]?.count ?? 0),
    };
  } finally {
    await pool.end();
  }
}
