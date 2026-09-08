import "server-only";

import { createHash } from "node:crypto";

import { getDatabasePool } from "@/db/client";

export type ApplicationRateLimitPolicy = {
  scope: string;
  limit: number;
  windowSeconds: number;
};

export type ApplicationRateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export const APPLICATION_RATE_LIMITS = {
  learnerSessionStart: {
    scope: "learner-session-start",
    limit: 30,
    windowSeconds: 60 * 60,
  },
  learnerAnswer: {
    scope: "learner-answer",
    limit: 300,
    windowSeconds: 60 * 60,
  },
  learnerReport: {
    scope: "learner-report",
    limit: 10,
    windowSeconds: 60 * 60,
  },
  learnerTutor: {
    scope: "learner-tutor",
    limit: 60,
    windowSeconds: 60 * 60,
  },
  scoreEstimate: {
    scope: "score-estimate",
    limit: 12,
    windowSeconds: 60 * 60,
  },
  accountExport: {
    scope: "account-export",
    limit: 5,
    windowSeconds: 60 * 60,
  },
  accountSecurityMutation: {
    scope: "account-security-mutation",
    limit: 20,
    windowSeconds: 60 * 60,
  },
  billingSession: {
    scope: "billing-session",
    limit: 10,
    windowSeconds: 60 * 60,
  },
  generationRequest: {
    scope: "generation-request",
    limit: 20,
    windowSeconds: 60 * 60,
  },
} as const satisfies Record<string, ApplicationRateLimitPolicy>;

export async function consumeApplicationRateLimit(
  principal: string,
  policy: ApplicationRateLimitPolicy,
): Promise<ApplicationRateLimitDecision> {
  assertPolicy(policy);
  if (!principal) throw new Error("A rate-limit principal is required.");

  const key = createHash("sha256")
    .update(`nuraprep-rate-limit-v1\0${policy.scope}\0${principal}`)
    .digest("hex");
  const result = await getDatabasePool().query<{
    allowed: boolean;
    count: number;
    expires_at: Date;
  }>(
    `WITH pruned AS (
       DELETE FROM application_rate_limits
       WHERE key IN (
         SELECT key
         FROM application_rate_limits
         WHERE expires_at < statement_timestamp() - interval '1 day'
         ORDER BY expires_at
         LIMIT 25
       )
     ), consumed AS (
       INSERT INTO application_rate_limits AS existing
         (key, scope, count, window_started_at, expires_at, updated_at)
       VALUES
         ($1, $2, 1, statement_timestamp(),
          statement_timestamp() + make_interval(secs => $3::int),
          statement_timestamp())
       ON CONFLICT (key) DO UPDATE
       SET count = CASE
             WHEN existing.expires_at <= statement_timestamp() THEN 1
             ELSE existing.count + 1
           END,
           window_started_at = CASE
             WHEN existing.expires_at <= statement_timestamp()
               THEN statement_timestamp()
             ELSE existing.window_started_at
           END,
           expires_at = CASE
             WHEN existing.expires_at <= statement_timestamp()
               THEN statement_timestamp() + make_interval(secs => $3::int)
             ELSE existing.expires_at
           END,
           updated_at = statement_timestamp()
       WHERE existing.expires_at <= statement_timestamp()
          OR existing.count < $4::int
       RETURNING true AS allowed, count, expires_at
     )
     SELECT allowed, count, expires_at FROM consumed
     UNION ALL
     SELECT false AS allowed, current_limit.count, current_limit.expires_at
     FROM application_rate_limits AS current_limit
     WHERE current_limit.key = $1
       AND NOT EXISTS (SELECT 1 FROM consumed)
     LIMIT 1`,
    [key, policy.scope, policy.windowSeconds, policy.limit],
  );

  const row = result.rows[0];
  if (!row) throw new Error("Rate-limit decision could not be persisted.");

  return {
    allowed: row.allowed,
    remaining: Math.max(0, policy.limit - row.count),
    retryAfterSeconds: row.allowed
      ? 0
      : Math.max(1, Math.ceil((row.expires_at.getTime() - Date.now()) / 1_000)),
  };
}

export function rateLimitMessage(decision: ApplicationRateLimitDecision) {
  const minutes = Math.max(1, Math.ceil(decision.retryAfterSeconds / 60));
  return `Too many requests. Try again in about ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}

function assertPolicy(policy: ApplicationRateLimitPolicy) {
  if (
    !/^[a-z][a-z0-9-]{2,79}$/.test(policy.scope) ||
    !Number.isInteger(policy.limit) ||
    policy.limit < 1 ||
    !Number.isInteger(policy.windowSeconds) ||
    policy.windowSeconds < 1 ||
    policy.windowSeconds > 86_400
  ) {
    throw new Error("Invalid application rate-limit policy.");
  }
}
