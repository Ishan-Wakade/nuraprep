import { defineConfig, devices } from "@playwright/test";
import { config as loadEnvironment } from "dotenv";

loadEnvironment({ path: ".env.local", quiet: true });

const e2eOrigin = "http://localhost:3100";

const baseDatabaseUrl =
  process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
if (!baseDatabaseUrl) {
  throw new Error(
    "DATABASE_URL or E2E_DATABASE_URL is required for Playwright.",
  );
}
const e2eDatabaseUrl = new URL(baseDatabaseUrl);
if (!process.env.E2E_DATABASE_URL) {
  const developmentName = decodeURIComponent(e2eDatabaseUrl.pathname.slice(1));
  if (!developmentName.endsWith("_e2e")) {
    e2eDatabaseUrl.pathname = `/${developmentName}_e2e`;
  }
}
process.env.DATABASE_URL = e2eDatabaseUrl.toString();
process.env.DIRECT_URL = e2eDatabaseUrl.toString();

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global.setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: e2eOrigin,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /.*\.setup\.ts/,
    },
    {
      name: "firefox-smoke",
      use: { ...devices["Desktop Firefox"] },
      dependencies: ["setup"],
      testMatch: /cross-browser\.spec\.ts/,
    },
    {
      name: "webkit-smoke",
      use: { ...devices["Desktop Safari"] },
      dependencies: ["setup"],
      testMatch: /cross-browser\.spec\.ts/,
    },
  ],
  webServer: {
    command: process.env.CI
      ? "pnpm exec next start --port 3100"
      : "APP_ENV=test NEXT_DIST_DIR=.next-e2e NEXT_PUBLIC_APP_URL=http://localhost:3100 pnpm exec next dev --port 3100",
    url: e2eOrigin,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
