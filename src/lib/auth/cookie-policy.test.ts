import { getCookies } from "better-auth/cookies";
import { describe, expect, it } from "vitest";

import { getAuthCookiePolicy } from "./cookie-policy";

describe("authentication cookie policy", () => {
  it("uses a host-only secure prefixed session cookie in production", () => {
    const cookies = getCookies({
      advanced: getAuthCookiePolicy({ APP_ENV: "production" }),
    });

    expect(cookies.sessionToken).toMatchObject({
      name: "__Secure-better-auth.session_token",
      attributes: {
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      },
    });
    expect(cookies.sessionToken.attributes.domain).toBeUndefined();
  });

  it("keeps the same protections except Secure for local HTTP development", () => {
    const cookies = getCookies({
      advanced: getAuthCookiePolicy({ APP_ENV: "development" }),
    });

    expect(cookies.sessionToken).toMatchObject({
      name: "better-auth.session_token",
      attributes: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      },
    });
    expect(cookies.sessionToken.attributes.domain).toBeUndefined();
  });
});
