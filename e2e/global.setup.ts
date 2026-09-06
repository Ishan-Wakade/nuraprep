import { execFileSync } from "node:child_process";

import { Pool } from "pg";

export default async function prepareE2eDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Playwright requires an isolated DATABASE_URL.");
  }

  const targetUrl = new URL(databaseUrl);
  const databaseName = decodeURIComponent(targetUrl.pathname.slice(1));
  if (!/^[a-zA-Z0-9_]+_e2e$/.test(databaseName)) {
    throw new Error(
      `Refusing to reset non-E2E database '${databaseName}'. The database name must end in _e2e.`,
    );
  }

  const adminUrl = new URL(targetUrl);
  adminUrl.pathname = "/postgres";
  const adminPool = new Pool({ connectionString: adminUrl.toString() });
  const existing = await adminPool.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    [databaseName],
  );
  if (!existing.rows[0]?.exists) {
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  }
  await adminPool.end();

  const targetPool = new Pool({ connectionString: targetUrl.toString() });
  await targetPool.query("DROP SCHEMA public CASCADE");
  await targetPool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await targetPool.query("CREATE SCHEMA public");
  await targetPool.end();

  const commandEnvironment = {
    ...process.env,
    DATABASE_URL: targetUrl.toString(),
    DIRECT_URL: targetUrl.toString(),
  };
  execFileSync("pnpm", ["db:migrate"], {
    cwd: process.cwd(),
    env: commandEnvironment,
    stdio: "inherit",
  });
  execFileSync("pnpm", ["db:seed"], {
    cwd: process.cwd(),
    env: commandEnvironment,
    stdio: "inherit",
  });
}
