import { describe, expect, it } from "vitest";

import { hasTrustedMutationOrigin } from "./request-security";

describe("billing mutation origin", () => {
  const appUrl = "https://app.nuraprep.example";

  it("accepts the configured application origin", () => {
    const request = new Request(`${appUrl}/api/billing/checkout`, {
      headers: { origin: appUrl },
    });
    expect(hasTrustedMutationOrigin(request, appUrl)).toBe(true);
  });

  it("rejects missing, malformed, and cross-origin requests", () => {
    expect(
      hasTrustedMutationOrigin(
        new Request(`${appUrl}/api/billing/checkout`),
        appUrl,
      ),
    ).toBe(false);
    expect(
      hasTrustedMutationOrigin(
        new Request(`${appUrl}/api/billing/checkout`, {
          headers: { origin: "https://evil.example" },
        }),
        appUrl,
      ),
    ).toBe(false);
  });
});
