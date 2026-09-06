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
