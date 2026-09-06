import { defineConfig, devices } from "@playwright/test";
import { config as loadEnvironment } from "dotenv";

loadEnvironment({ path: ".env.local", quiet: true });

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
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
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
  ],
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
