import { describe, expect, it } from "vitest";

import { getAnswerChoiceDisplayLabel } from "./display";

describe("getAnswerChoiceDisplayLabel", () => {
  it("uses learner-facing letters instead of internal choice identifiers", () => {
    expect([0, 1, 2, 3].map(getAnswerChoiceDisplayLabel)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
  });

  it("continues past Z without exposing implementation-specific identifiers", () => {
    expect(getAnswerChoiceDisplayLabel(25)).toBe("Z");
    expect(getAnswerChoiceDisplayLabel(26)).toBe("AA");
  });

  it("rejects invalid positions", () => {
    expect(() => getAnswerChoiceDisplayLabel(-1)).toThrow(
      "Answer-choice indexes must be non-negative integers.",
    );
  });
});
