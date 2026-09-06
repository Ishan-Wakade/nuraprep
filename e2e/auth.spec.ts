import { createHmac, randomUUID } from "node:crypto";

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
    };
    expect(exportData.exportVersion).toBe("nuraprep-learner-export-v1");
    expect(exportData.account).toMatchObject({
      displayName: "Ada Learner",
      mode: "authenticated",
    });
    expect(exportData.profile.authUserId).toBe(authenticated.userId);
    expect(exportData.accountSessions).toHaveLength(1);
    expect(exportData.accountSessions[0]).not.toHaveProperty("token");
    expect(rawExport).not.toContain(authenticated.token);
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
