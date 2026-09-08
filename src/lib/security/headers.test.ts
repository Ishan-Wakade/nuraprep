import { describe, expect, it } from "vitest";

import { createContentSecurityPolicy } from "./headers";

describe("content security policy", () => {
  it("keeps production network and execution sources on the application origin", () => {
    const policy = createContentSecurityPolicy(false);

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'none'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("ws:");
  });

  it("allows only the development runtime additions needed for debugging and hot reload", () => {
    const policy = createContentSecurityPolicy(true);

    expect(policy).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(policy).toContain("connect-src 'self' ws: wss:");
    expect(policy).toContain("script-src-attr 'none'");
  });
});
