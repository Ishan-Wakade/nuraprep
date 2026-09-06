import { describe, expect, it } from "vitest";

import {
  canClaimGenerationAttempt,
  hasExhaustedGenerationAttempts,
  MAX_GENERATION_ATTEMPTS,
} from "./retry-policy";

describe("generation retry policy", () => {
  it("allows an initial claim and two retries", () => {
    expect(MAX_GENERATION_ATTEMPTS).toBe(3);
    expect(canClaimGenerationAttempt(0)).toBe(true);
    expect(canClaimGenerationAttempt(1)).toBe(true);
    expect(canClaimGenerationAttempt(2)).toBe(true);
  });

  it("marks the third expired attempt as exhausted", () => {
    expect(canClaimGenerationAttempt(3)).toBe(false);
    expect(hasExhaustedGenerationAttempts(2)).toBe(false);
    expect(hasExhaustedGenerationAttempts(3)).toBe(true);
    expect(hasExhaustedGenerationAttempts(4)).toBe(true);
  });

  it("rejects malformed counters", () => {
    expect(canClaimGenerationAttempt(-1)).toBe(false);
    expect(canClaimGenerationAttempt(1.5)).toBe(false);
    expect(hasExhaustedGenerationAttempts(Number.NaN)).toBe(false);
  });
});
