import { createHash, createHmac, randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { Pool } from "pg";

async function createAuthenticatedSession() {
  const databaseUrl = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!databaseUrl || !secret) {
    throw new Error(
      "Authenticated browser tests require database and auth configuration.",
    );
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const userId = `e2e-auth-user-${randomUUID()}`;
  const sessionId = `e2e-session-${randomUUID()}`;
  const token = `e2e-token-${randomUUID()}`;
  await pool.query(
    `INSERT INTO auth_users (id, name, email, email_verified)
     VALUES ($1, 'Ada Learner', $2, true)`,
    [userId, `${userId}@example.test`],
  );
  await pool.query(
    `INSERT INTO auth_sessions (id, token, user_id, expires_at)
     VALUES ($1, $2, $3, now() + interval '1 hour')`,
    [sessionId, token, userId],
  );

  const signature = createHmac("sha256", secret).update(token).digest("base64");

  return {
    pool,
    userId,
    sessionId,
    token,
    cookie: {
      name: "better-auth.session_token",
      value: `${token}.${signature}`,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax" as const,
    },
  };
}

test("shows an honest local sign-in state and rejects external return URLs", async ({
  page,
}) => {
  await page.goto("/sign-in?returnTo=https%3A%2F%2Fattacker.example");

  await expect(
    page.getByRole("heading", { name: "Welcome to NuraPrep." }),
  ).toBeVisible();
  await expect(
    page.getByText("Google sign-in is not configured yet"),
  ).toBeVisible();

  const developmentLink = page.getByRole("link", {
    name: "Continue with local development access",
  });
  await expect(developmentLink).toHaveAttribute("href", "/practice");

  await developmentLink.click();
  await expect(page).toHaveURL(/\/practice$/);
  await expect(
    page.getByRole("heading", { name: "Build a focused Math session." }),
  ).toBeVisible();
});

test("returns an uncached anonymous session before sign-in", async ({
  request,
}) => {
  const response = await request.get("/api/auth/get-session");

  expect(response.ok()).toBe(true);
  expect(await response.json()).toBeNull();
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("keeps billing visibly and operationally disabled without configuration", async ({
  page,
}) => {
  await page.goto("/account");

  await expect(page.getByRole("heading", { name: "Free plan" })).toBeVisible();
  await expect(
    page.getByText("Payments are not activated in this environment."),
  ).toBeVisible();

  const checkout = await page.request.post("/api/billing/checkout");
  expect(checkout.status()).toBe(404);
});

test("rate limits repeated auth requests in shared storage", async ({
  request,
}) => {
  const responses = [];
  for (let attempt = 0; attempt < 121; attempt += 1) {
    responses.push(
      await request.get("/api/auth/get-session", {
        headers: {
          "x-forwarded-for": "198.51.100.42",
        },
      }),
    );
  }

  expect(
    responses.slice(0, 120).every((response) => response.status() === 200),
  ).toBe(true);
  expect(responses[120]?.status()).toBe(429);
  expect(responses[120]?.headers()["x-retry-after"]).toBeTruthy();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Rate-limit test requires DATABASE_URL.");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const stored = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM auth_rate_limits
       WHERE key LIKE '%/get-session'`,
    );
    expect(stored.rows[0]?.count).toBeGreaterThan(0);
  } finally {
    await pool.end();
  }
});

test("resolves an authenticated learner and revokes the session on sign-out", async ({
  page,
}) => {
  const authenticated = await createAuthenticatedSession();
  try {
    await page.context().addCookies([authenticated.cookie]);
    await page.goto("/sign-in?returnTo=%2Fpractice");

    await expect(page).toHaveURL(/\/practice$/);
    await expect(page.getByText("Ada Learner").first()).toBeVisible();
    await expect(page.getByText("Signed in securely")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    const sessionCount = await authenticated.pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM auth_sessions WHERE user_id = $1",
      [authenticated.userId],
    );
    expect(sessionCount.rows[0]?.count).toBe(0);

    const revocationAudit = await authenticated.pool.query<{
      count: number;
    }>(
      `SELECT count(*)::int AS count
       FROM account_audit_events
       WHERE user_id = $1 AND event_type = 'SESSION_REVOKED'`,
      [authenticated.userId],
    );
    expect(revocationAudit.rows[0]?.count).toBe(1);
  } finally {
    await authenticated.pool.end();
  }
});

test("requires a current database grant for reviewer access", async ({
  page,
}) => {
  const authenticated = await createAuthenticatedSession();
  try {
    await page.context().addCookies([authenticated.cookie]);

    const denied = await page.goto("/review");
    expect(denied?.status()).toBe(404);

    await authenticated.pool.query(
      `INSERT INTO auth_role_grants (user_id, role, granted_by, reason)
       VALUES ($1, 'REVIEWER', 'e2e-security-test',
               'Verify that reviewer access depends on an active database grant.')`,
      [authenticated.userId],
    );
    await page.goto("/review");

    await expect(
      page.getByRole("heading", { name: "Question review queue" }),
    ).toBeVisible();
    await expect(page.getByText("Authorized reviewer")).toBeVisible();
  } finally {
    await authenticated.pool.end();
  }
});

test("exports only portable learner data without credentials", async ({
  page,
}) => {
  const authenticated = await createAuthenticatedSession();
  try {
    await authenticated.pool.query(
      `INSERT INTO learner_profiles
       (auth_user_id, auth_subject, display_name, email)
       VALUES ($1, $2, 'Ada Learner', $3)`,
      [
        authenticated.userId,
        `auth-user:${authenticated.userId}`,
        `${authenticated.userId}@example.test`,
      ],
    );
    await page.context().addCookies([authenticated.cookie]);

    const response = await page.request.get("/api/account/export");
    expect(response.ok()).toBe(true);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["content-disposition"]).toContain(
      'attachment; filename="nuraprep-data-',
    );

    const rawExport = await response.text();
    const exportData = JSON.parse(rawExport) as {
      exportVersion: string;
      account: { displayName: string; mode: string };
      profile: { authUserId: string };
      accountSessions: Array<Record<string, unknown>>;
      billing: Array<Record<string, unknown>>;
    };
    expect(exportData.exportVersion).toBe("nuraprep-learner-export-v1");
    expect(exportData.account).toMatchObject({
      displayName: "Ada Learner",
      mode: "authenticated",
    });
    expect(exportData.profile.authUserId).toBe(authenticated.userId);
    expect(exportData.accountSessions).toHaveLength(1);
    expect(exportData.billing).toEqual([]);
    expect(exportData.accountSessions[0]).not.toHaveProperty("token");
    expect(rawExport).not.toContain(authenticated.token);

    const exportAudit = await authenticated.pool.query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM account_audit_events
       WHERE user_id = $1 AND event_type = 'DATA_EXPORT_DOWNLOADED'`,
      [authenticated.userId],
    );
    expect(exportAudit.rows[0]?.count).toBe(1);
  } finally {
    await authenticated.pool.end();
  }
});

test("rate limits repeated sensitive account exports per account", async ({
  page,
}) => {
  const authenticated = await createAuthenticatedSession();
  try {
    await authenticated.pool.query(
      `INSERT INTO learner_profiles
       (auth_user_id, auth_subject, display_name, email)
       VALUES ($1, $2, 'Rate Limited Learner', $3)`,
      [
        authenticated.userId,
        `auth-user:${authenticated.userId}`,
        `${authenticated.userId}@example.test`,
      ],
    );
    await page.context().addCookies([authenticated.cookie]);

    const responses = await Promise.all(
      Array.from({ length: 6 }, () => page.request.get("/api/account/export")),
    );
    expect(
      responses.filter((response) => response.status() === 200),
    ).toHaveLength(5);
    const rejected = responses.find((response) => response.status() === 429);
    expect(rejected).toBeTruthy();
    if (!rejected)
      throw new Error("Expected one rate-limited export response.");
    expect(rejected.status()).toBe(429);
    expect(rejected.headers()["retry-after"]).toBeTruthy();
    expect(await rejected.json()).toMatchObject({
      error: expect.stringContaining("Too many requests"),
    });

    const rateLimitKey = createHash("sha256")
      .update(
        `nuraprep-rate-limit-v1\0account-export\0auth-user:${authenticated.userId}`,
      )
      .digest("hex");
    const stored = await authenticated.pool.query<{
      count: number;
      principal_exposed: boolean;
    }>(
      `SELECT count,
              position($1 in key) > 0 AS principal_exposed
       FROM application_rate_limits
       WHERE key = $2 AND scope = 'account-export'`,
      [authenticated.userId, rateLimitKey],
    );
    expect(stored.rows[0]).toMatchObject({
      count: 5,
      principal_exposed: false,
    });
  } finally {
    await authenticated.pool.end();
  }
});

test("requires a recent sign-in for an authenticated data export", async ({
  page,
}) => {
  const authenticated = await createAuthenticatedSession();
  try {
    await authenticated.pool.query(
      `UPDATE auth_sessions
       SET created_at = now() - interval '16 minutes'
       WHERE user_id = $1`,
      [authenticated.userId],
    );
    await page.context().addCookies([authenticated.cookie]);

    const response = await page.request.get("/api/account/export");
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({
      error: "A recent sign-in is required before downloading account data.",
    });
  } finally {
    await authenticated.pool.end();
  }
});

test("revokes other sessions without ending the current session", async ({
  page,
}) => {
  const authenticated = await createAuthenticatedSession();
  const otherSessionId = `e2e-other-session-${randomUUID()}`;
  try {
    await authenticated.pool.query(
      `INSERT INTO auth_sessions
       (id, token, user_id, expires_at, user_agent)
       VALUES ($1, $2, $3, now() + interval '1 hour', 'Other test browser')`,
      [otherSessionId, `e2e-other-token-${randomUUID()}`, authenticated.userId],
    );
    await page.context().addCookies([authenticated.cookie]);
    await page.goto("/account");

    await expect(page.getByText("2 active")).toBeVisible();
    await expect(page.getByText("Current session")).toBeVisible();
    await page.getByRole("button", { name: "Sign out other devices" }).click();
    await expect(page.getByText("1 other session signed out.")).toBeVisible();
    await expect(page.getByText("1 active")).toBeVisible();

    const remaining = await authenticated.pool.query<{ id: string }>(
      "SELECT id FROM auth_sessions WHERE user_id = $1",
      [authenticated.userId],
    );
    expect(remaining.rows).toEqual([{ id: authenticated.sessionId }]);

    const audit = await authenticated.pool.query<{
      event_type: string;
      revoked_count: number;
    }>(
      `SELECT event_type, (metadata->>'revokedCount')::int AS revoked_count
       FROM account_audit_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [authenticated.userId],
    );
    expect(audit.rows[0]).toEqual({
      event_type: "OTHER_SESSIONS_REVOKED",
      revoked_count: 1,
    });

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Your NuraPrep data" }),
    ).toBeVisible();
  } finally {
    await authenticated.pool.end();
  }
});

test("deletes a learner account and its connected private history atomically", async ({
  page,
}) => {
  const authenticated = await createAuthenticatedSession();
  try {
    const published = await authenticated.pool.query<{
      question_version_id: string;
      skill_id: string;
    }>(
      `SELECT qp.question_version_id, qv.primary_skill_id AS skill_id
       FROM question_publications qp
       JOIN question_versions qv ON qv.id = qp.question_version_id
       WHERE qp.retired_at IS NULL
       LIMIT 1`,
    );
    const source = published.rows[0];
    if (!source) throw new Error("Deletion test requires a published fixture.");

    const profile = await authenticated.pool.query<{ id: string }>(
      `INSERT INTO learner_profiles
       (auth_user_id, auth_subject, display_name, email)
       VALUES ($1, $2, 'Ada Learner', $3)
       RETURNING id`,
      [
        authenticated.userId,
        `auth-user:${authenticated.userId}`,
        `${authenticated.userId}@example.test`,
      ],
    );
    const learnerId = profile.rows[0]!.id;
    const practice = await authenticated.pool.query<{ id: string }>(
      `INSERT INTO practice_sessions
       (learner_id, requested_question_count, filters)
       VALUES ($1, 1, '{}'::jsonb)
       RETURNING id`,
      [learnerId],
    );
    const item = await authenticated.pool.query<{ id: string }>(
      `INSERT INTO practice_session_items
       (session_id, question_version_id, position, selection_reason)
       VALUES ($1, $2, 1, 'Account-erasure browser-test fixture.')
       RETURNING id`,
      [practice.rows[0]!.id, source.question_version_id],
    );
    const attempt = await authenticated.pool.query<{ id: string }>(
      `INSERT INTO attempts
       (session_item_id, answer_payload, correct, elapsed_milliseconds)
       VALUES ($1, '{"type":"NUMERIC","value":"1"}'::jsonb, false, 1000)
       RETURNING id`,
      [item.rows[0]!.id],
    );
    await authenticated.pool.query(
      `INSERT INTO tutor_interactions (session_item_id, step_index, step_id)
       VALUES ($1, 1, 'deletion-test-hint')`,
      [item.rows[0]!.id],
    );
    await authenticated.pool.query(
      `INSERT INTO practice_item_review_events
       (session_item_id, flagged, recorded_by)
       VALUES ($1, true, $2)`,
      [item.rows[0]!.id, `auth-user:${authenticated.userId}`],
    );
    const report = await authenticated.pool.query<{ id: string }>(
      `INSERT INTO learner_question_reports
       (question_version_id, learner_id, attempt_id, category, details)
       VALUES ($1, $2, $3, 'OTHER', 'Deletion test report details.')
       RETURNING id`,
      [source.question_version_id, learnerId, attempt.rows[0]!.id],
    );
    await authenticated.pool.query(
      `INSERT INTO learner_question_report_events
       (report_id, status, reviewer_id, notes)
       VALUES ($1, 'OPEN', 'e2e-reviewer', 'Opened for deletion test.')`,
      [report.rows[0]!.id],
    );
    const proposal = await authenticated.pool.query<{ id: string }>(
      `INSERT INTO improvement_proposals
       (proposal_key, pattern_key, category, target, title,
        problem_summary, proposed_change, regression_plan, created_by)
       VALUES ($1, $2, 'OTHER', 'EVALUATION_CASE',
        'Account erasure evidence fixture',
        'Verify linked learner evidence is erased completely.',
        'Remove only evidence derived from the deleting learner.',
        'Assert unrelated proposals remain after account erasure.',
        'e2e-reviewer')
       RETURNING id`,
      [`e2e-delete-${randomUUID()}`, `e2e-delete-${randomUUID()}`],
    );
    await authenticated.pool.query(
      `INSERT INTO improvement_proposal_evidence
       (proposal_id, evidence_key, source_kind, question_version_id,
        details_snapshot, learner_report_id)
       VALUES ($1, $2, 'LEARNER', $3, 'Deletion test report details.', $4)`,
      [
        proposal.rows[0]!.id,
        `learner:${report.rows[0]!.id}`,
        source.question_version_id,
        report.rows[0]!.id,
      ],
    );
    const estimate = await authenticated.pool.query<{ id: string }>(
      `INSERT INTO score_estimates
       (learner_id, model_version, estimate_basis_points, lower_basis_points,
        upper_basis_points, evidence_level, evidence_count,
        effective_evidence_milli, feature_snapshot, caveats)
       VALUES ($1, 'e2e-delete-v1', 5000, 4000, 6000, 'LOW', 1, 1000,
        '{}'::jsonb, '[]'::jsonb)
       RETURNING id`,
      [learnerId],
    );
    const plan = await authenticated.pool.query<{ id: string }>(
      `INSERT INTO study_plans
       (learner_id, score_estimate_id, model_version, weekly_minutes)
       VALUES ($1, $2, 'e2e-delete-v1', 60)
       RETURNING id`,
      [learnerId, estimate.rows[0]!.id],
    );
    await authenticated.pool.query(
      `INSERT INTO study_plan_items
       (study_plan_id, skill_id, priority, target_minutes, rationale)
       VALUES ($1, $2, 1, 30, 'Deletion test study priority.')`,
      [plan.rows[0]!.id, source.skill_id],
    );
    await authenticated.pool.query(
      `INSERT INTO auth_accounts
       (id, issuer, account_id, provider_id, user_id, access_token)
       VALUES ($1, 'https://accounts.google.com', $2, 'google', $3,
        'sensitive-test-token')`,
      [
        `e2e-account-${randomUUID()}`,
        `e2e-subject-${randomUUID()}`,
        authenticated.userId,
      ],
    );
    await authenticated.pool.query(
      `INSERT INTO auth_role_grants (user_id, role, granted_by, reason)
       VALUES ($1, 'LEARNER', 'e2e-security-test',
        'Verify learner role history is included in erasure.')`,
      [authenticated.userId],
    );
    await authenticated.pool.query(
      `INSERT INTO account_audit_events (user_id, event_type, actor_id)
       VALUES ($1, 'E2E_DELETE_FIXTURE', $2)`,
      [authenticated.userId, authenticated.userId],
    );
    await authenticated.pool.query(
      `INSERT INTO auth_verifications
       (id, identifier, value, expires_at)
       VALUES ($1, $2, 'sensitive-verification-value', now() + interval '1 hour')`,
      [
        `e2e-verification-${randomUUID()}`,
        `${authenticated.userId}@example.test`,
      ],
    );
    const receiptsBefore = await authenticated.pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM account_deletion_receipts",
    );

    await page.context().addCookies([authenticated.cookie]);
    await page.goto("/account");
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page
      .getByRole("button", { name: "Permanently delete account" })
      .click();

    await expect(page).toHaveURL(/\/sign-in\?deleted=1$/);
    await expect(
      page.getByText(
        "Your account and learner history were permanently deleted.",
      ),
    ).toBeVisible();

    const remaining = await authenticated.pool.query<{
      users: number;
      profiles: number;
      sessions: number;
      accounts: number;
      reports: number;
      practice_sessions: number;
      estimates: number;
      evidence: number;
    }>(
      `SELECT
        (SELECT count(*)::int FROM auth_users WHERE id = $1) AS users,
        (SELECT count(*)::int FROM learner_profiles WHERE id = $2) AS profiles,
        (SELECT count(*)::int FROM auth_sessions WHERE user_id = $1) AS sessions,
        (SELECT count(*)::int FROM auth_accounts WHERE user_id = $1) AS accounts,
        (SELECT count(*)::int FROM learner_question_reports WHERE learner_id = $2) AS reports,
        (SELECT count(*)::int FROM practice_sessions WHERE learner_id = $2) AS practice_sessions,
        (SELECT count(*)::int FROM score_estimates WHERE learner_id = $2) AS estimates,
        (SELECT count(*)::int FROM improvement_proposal_evidence WHERE learner_report_id = $3) AS evidence`,
      [authenticated.userId, learnerId, report.rows[0]!.id],
    );
    expect(remaining.rows[0]).toEqual({
      users: 0,
      profiles: 0,
      sessions: 0,
      accounts: 0,
      reports: 0,
      practice_sessions: 0,
      estimates: 0,
      evidence: 0,
    });

    const receiptsAfter = await authenticated.pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM account_deletion_receipts",
    );
    expect(receiptsAfter.rows[0]!.count).toBe(
      receiptsBefore.rows[0]!.count + 1,
    );
  } finally {
    await authenticated.pool.end();
  }
});

test("refuses self-service erasure for a privileged reviewer account", async ({
  page,
}) => {
  const authenticated = await createAuthenticatedSession();
  try {
    await authenticated.pool.query(
      `INSERT INTO auth_role_grants (user_id, role, granted_by, reason)
       VALUES ($1, 'REVIEWER', 'e2e-security-test',
        'Verify privileged review history blocks self-service erasure.')`,
      [authenticated.userId],
    );
    await page.context().addCookies([authenticated.cookie]);
    await page.goto("/account");
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page
      .getByRole("button", { name: "Permanently delete account" })
      .click();

    await expect(
      page.getByText(
        "Reviewer and administrator accounts require an administrator-assisted erasure so content audit history remains trustworthy.",
      ),
    ).toBeVisible();
    const remaining = await authenticated.pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM auth_users WHERE id = $1",
      [authenticated.userId],
    );
    expect(remaining.rows[0]!.count).toBe(1);
  } finally {
    await authenticated.pool.end();
  }
});

test("lets a second administrator pseudonymize a privileged account without orphaning review history", async ({
  page,
}) => {
  const administrator = await createAuthenticatedSession();
  const target = await createAuthenticatedSession();
  const targetEmail = `${target.userId}@example.test`;
  const reason =
    "Verified account-owner erasure request; retain only pseudonymous content attribution.";
  try {
    await administrator.pool.query(
      `INSERT INTO auth_role_grants (user_id, role, granted_by, reason)
       VALUES ($1, 'ADMIN', 'e2e-security-test',
        'Authorize the independent administrator for pseudonymization testing.')`,
      [administrator.userId],
    );
    await target.pool.query(
      `INSERT INTO auth_role_grants (user_id, role, granted_by, reason)
       VALUES ($1, 'REVIEWER', $2,
        'Create privileged attribution that must survive identity erasure.')`,
      [target.userId, administrator.userId],
    );
    await target.pool.query(
      `INSERT INTO learner_profiles
       (auth_user_id, auth_subject, display_name, email)
       VALUES ($1, $2, 'Reviewer Learner Profile', $3)`,
      [target.userId, `auth-user:${target.userId}`, targetEmail],
    );
    await target.pool.query(
      `INSERT INTO auth_accounts
       (id, issuer, account_id, provider_id, user_id)
       VALUES ($1, 'https://accounts.google.com', $2, 'google', $3)`,
      [`e2e-account-${randomUUID()}`, `google-${target.userId}`, target.userId],
    );
    const questionVersion = await target.pool.query<{ id: string }>(
      "SELECT id FROM question_versions ORDER BY created_at ASC LIMIT 1",
    );
    await target.pool.query(
      `INSERT INTO review_decisions
       (question_version_id, reviewer_id, decision, rubric_scores, notes)
       VALUES ($1, $2, 'NEEDS_REVISION', '{"math": 4}',
        'Retain this immutable reviewer attribution after pseudonymization.')`,
      [questionVersion.rows[0]!.id, target.userId],
    );
    await expect(
      target.pool.query("SELECT erase_nuraprep_account($1, $1, $2)", [
        target.userId,
        reason,
      ]),
    ).rejects.toThrow(/ACTIVE_ADMIN_REQUIRED_FOR_PRIVILEGED_ERASURE/);

    await page.context().addCookies([administrator.cookie]);
    await page.goto("/review/accounts");
    await expect(
      page.getByRole("heading", { name: "Privileged-account privacy" }),
    ).toBeVisible();

    const targetCard = page.locator("article").filter({ hasText: targetEmail });
    await targetCard
      .getByLabel(`Type ${targetEmail} exactly`)
      .fill(targetEmail);
    await targetCard.getByLabel(/Administrative reason/).fill(reason);
    await targetCard
      .getByRole("button", { name: "Pseudonymize account" })
      .click();
    await expect(
      page.getByText(
        "Already pseudonymized; no credentials or active role should remain.",
      ),
    ).toBeVisible();
    await expect(page.getByText(targetEmail)).toHaveCount(0);

    const pseudonymized = await target.pool.query<{
      name: string;
      email: string;
      email_verified: boolean;
      image: string | null;
    }>(
      `SELECT name, email, email_verified, image
       FROM auth_users WHERE id = $1`,
      [target.userId],
    );
    expect(pseudonymized.rows[0]).toMatchObject({
      name: "Former reviewer",
      email_verified: false,
      image: null,
    });
    expect(pseudonymized.rows[0]!.email).toMatch(
      /^erased-[0-9a-f-]+@users\.invalid$/,
    );
    expect(pseudonymized.rows[0]!.email).not.toContain(target.userId);

    const privateData = await target.pool.query<{
      sessions: number;
      accounts: number;
      profiles: number;
      active_roles: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM auth_sessions WHERE user_id = $1) AS sessions,
         (SELECT count(*)::int FROM auth_accounts WHERE user_id = $1) AS accounts,
         (SELECT count(*)::int FROM learner_profiles WHERE auth_user_id = $1) AS profiles,
         (SELECT count(*)::int FROM auth_role_grants
          WHERE user_id = $1 AND revoked_at IS NULL) AS active_roles`,
      [target.userId],
    );
    expect(privateData.rows[0]).toEqual({
      sessions: 0,
      accounts: 0,
      profiles: 0,
      active_roles: 0,
    });

    const retained = await target.pool.query<{
      decisions: number;
      grants: number;
      revoked_by: string;
      events: number;
      receipts: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM review_decisions
          WHERE reviewer_id = $1) AS decisions,
         (SELECT count(*)::int FROM auth_role_grants
          WHERE user_id = $1) AS grants,
         (SELECT revoked_by FROM auth_role_grants
          WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1) AS revoked_by,
         (SELECT count(*)::int FROM account_audit_events
          WHERE user_id = $1
            AND event_type = 'PRIVILEGED_ACCOUNT_PSEUDONYMIZED') AS events,
         (SELECT count(*)::int FROM account_deletion_receipts
          WHERE receipt_version = 'privileged-pseudonymization-v1') AS receipts`,
      [target.userId],
    );
    expect(retained.rows[0]).toMatchObject({
      decisions: 1,
      grants: 1,
      revoked_by: administrator.userId,
      events: 1,
    });
    expect(retained.rows[0]!.receipts).toBeGreaterThan(0);
  } finally {
    await administrator.pool.end();
    await target.pool.end();
  }
});

test("denies the privileged-account privacy control to a reviewer", async ({
  page,
}) => {
  const reviewer = await createAuthenticatedSession();
  try {
    await reviewer.pool.query(
      `INSERT INTO auth_role_grants (user_id, role, granted_by, reason)
       VALUES ($1, 'REVIEWER', 'e2e-security-test',
        'Verify that reviewer access does not imply administrator authority.')`,
      [reviewer.userId],
    );
    await page.context().addCookies([reviewer.cookie]);

    const response = await page.goto("/review/accounts");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("link", { name: "Account privacy" }),
    ).toHaveCount(0);
  } finally {
    await reviewer.pool.end();
  }
});

test("keeps the sign-in surface within a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  await expect(
    page.getByRole("link", { name: "Continue with local development access" }),
  ).toBeVisible();
});
