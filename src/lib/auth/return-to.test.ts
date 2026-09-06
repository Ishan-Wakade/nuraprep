import { describe, expect, it } from "vitest";

import { sanitizeReturnTo } from "./return-to";

describe("sanitizeReturnTo", () => {
  it("allows learner and reviewer destinations within NuraPrep", () => {
    expect(sanitizeReturnTo("/practice/diagnostic")).toBe(
      "/practice/diagnostic",
    );
    expect(sanitizeReturnTo("/review?status=UNREVIEWED")).toBe(
      "/review?status=UNREVIEWED",
    );
  });

  it.each([
    undefined,
    "",
    "https://attacker.example",
    "//attacker.example",
    "/api/auth/sign-out",
    "/practice#unsafe-fragment",
    "practice",
  ])("replaces unsafe destination %s with the learner home", (value) => {
    expect(sanitizeReturnTo(value)).toBe("/practice");
  });
});
