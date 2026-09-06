import { describe, expect, it } from "vitest";

import { parseServerEnvironment } from "./validation";

const baseEnvironment = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://example.invalid/nuraprep",
};

describe("parseServerEnvironment", () => {
  it("allows explicit development identities only outside production", () => {
    expect(
      parseServerEnvironment({
        ...baseEnvironment,
        APP_ENV: "development",
        DEV_LEARNER_ENABLED: "true",
        DEV_REVIEWER_ENABLED: "true",
      }),
    ).toMatchObject({
      APP_ENV: "development",
      DEV_LEARNER_ENABLED: true,
      DEV_REVIEWER_ENABLED: true,
    });

    expect(() =>
      parseServerEnvironment({
        ...baseEnvironment,
        APP_ENV: "production",
        DEV_LEARNER_ENABLED: "true",
        BETTER_AUTH_SECRET: "a".repeat(32),
        GOOGLE_CLIENT_ID: "google-client",
        GOOGLE_CLIENT_SECRET: "google-secret",
      }),
    ).toThrow("Development identity bypasses cannot be enabled in production.");
  });

  it("requires Google credentials as an inseparable pair", () => {
    expect(() =>
      parseServerEnvironment({
        ...baseEnvironment,
        GOOGLE_CLIENT_ID: "google-client",
      }),
    ).toThrow(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together.",
    );
  });

  it("fails production closed without a strong secret and Google credentials", () => {
    expect(() =>
      parseServerEnvironment({
        ...baseEnvironment,
        APP_ENV: "production",
      }),
    ).toThrow(
      "Production requires BETTER_AUTH_SECRET and Google OAuth credentials.",
    );

    expect(
      parseServerEnvironment({
        ...baseEnvironment,
        APP_ENV: "production",
        BETTER_AUTH_SECRET: "b".repeat(32),
        GOOGLE_CLIENT_ID: "google-client",
        GOOGLE_CLIENT_SECRET: "google-secret",
      }),
    ).toMatchObject({ APP_ENV: "production" });
  });

  it("rejects auth secrets shorter than 32 characters", () => {
    expect(() =>
      parseServerEnvironment({
        ...baseEnvironment,
        BETTER_AUTH_SECRET: "too-short",
      }),
    ).toThrow();
  });
});
