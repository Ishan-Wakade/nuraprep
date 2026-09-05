import { describe, expect, it } from "vitest";

import { practiceSessionFiltersSchema } from "./contracts";

describe("practiceSessionFiltersSchema", () => {
  it("applies conservative defaults", () => {
    expect(practiceSessionFiltersSchema.parse({})).toEqual({
      questionCount: 5,
      timingMode: "UNTIMED",
      newOnly: false,
      missedOnly: false,
    });
  });

  it("rejects contradictory history filters", () => {
    const result = practiceSessionFiltersSchema.safeParse({
      newOnly: true,
      missedOnly: true,
    });

    expect(result.success).toBe(false);
  });

  it("bounds the requested session size", () => {
    expect(
      practiceSessionFiltersSchema.safeParse({ questionCount: 21 }).success,
    ).toBe(false);
  });
});
