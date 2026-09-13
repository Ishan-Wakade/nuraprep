import { describe, expect, it, vi } from "vitest";

import {
  loadServerlessRuntimeConfiguration,
  parseServerlessRuntimeConfiguration,
} from "./serverless-app-bootstrap";

const validConfiguration = {
  APP_ENV: "production",
  DEPLOYMENT_PLATFORM: "AWS",
  NEXT_PUBLIC_APP_URL: "https://example.lambda-url.us-east-1.on.aws",
  DATABASE_URL:
    "postgresql://user:password@database.test/nuraprep?sslmode=require",
  BETTER_AUTH_SECRET: "a-secure-auth-secret-longer-than-thirty-two-characters",
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY:
    "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  TRUSTED_PROXY_CIDRS: "127.0.0.1/32,::1/128",
  BILLING_ENABLED: "false",
  DEV_REVIEWER_ENABLED: "false",
  DEV_LEARNER_ENABLED: "false",
};

describe("serverless application bootstrap", () => {
  it("loads an allowlisted production configuration from one encrypted parameter", async () => {
    const getParameter = vi
      .fn()
      .mockResolvedValue(JSON.stringify(validConfiguration));

    await expect(
      loadServerlessRuntimeConfiguration(
        "/nuraprep/portfolio/runtime",
        getParameter,
      ),
    ).resolves.toEqual(validConfiguration);
    expect(getParameter).toHaveBeenCalledWith("/nuraprep/portfolio/runtime");
  });

  it("rejects missing, unknown, and unsafe configuration", () => {
    expect(() => parseServerlessRuntimeConfiguration("not-json")).toThrow(
      "RUNTIME_PARAMETER_INVALID_JSON",
    );
    expect(() =>
      parseServerlessRuntimeConfiguration(
        JSON.stringify({ ...validConfiguration, DATABASE_URL: undefined }),
      ),
    ).toThrow("RUNTIME_PARAMETER_KEY_MISSING:DATABASE_URL");
    expect(() =>
      parseServerlessRuntimeConfiguration(
        JSON.stringify({ ...validConfiguration, AWS_ACCESS_KEY_ID: "unsafe" }),
      ),
    ).toThrow("RUNTIME_PARAMETER_KEY_NOT_ALLOWED:AWS_ACCESS_KEY_ID");
    expect(() =>
      parseServerlessRuntimeConfiguration(
        JSON.stringify({
          ...validConfiguration,
          TRUSTED_PROXY_CIDRS: "0.0.0.0/0",
        }),
      ),
    ).toThrow("RUNTIME_PARAMETER_UNSAFE_PROXY_TRUST");
  });

  it("does not expose the encrypted payload in validation errors", async () => {
    const serialized = JSON.stringify({
      ...validConfiguration,
      GOOGLE_CLIENT_SECRET: "highly-sensitive-value",
      EXTRA: "invalid",
    });

    let message = "";
    try {
      await loadServerlessRuntimeConfiguration(
        "/nuraprep/portfolio/runtime",
        vi.fn().mockResolvedValue(serialized),
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toBe("RUNTIME_PARAMETER_KEY_NOT_ALLOWED:EXTRA");
    expect(message).not.toContain("highly-sensitive-value");
  });
});
