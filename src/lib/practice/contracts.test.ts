import { describe, expect, it } from "vitest";

import {
  learnerQuestionReportSchema,
  practiceSessionFiltersSchema,
} from "./contracts";

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

describe("learnerQuestionReportSchema", () => {
  const validReport = {
    questionVersionId: "14000000-0000-4000-8000-000000000001",
    attemptId: "15000000-0000-4000-8000-000000000001",
    category: "AMBIGUITY",
    details: "Two phrases could reasonably imply different operations.",
  };

  it("accepts a version-linked report with actionable detail", () => {
    expect(learnerQuestionReportSchema.parse(validReport)).toEqual(validReport);
  });

  it("rejects categories and comments outside the learner contract", () => {
    expect(
      learnerQuestionReportSchema.safeParse({
        ...validReport,
        category: "ORIGINALITY",
        details: "Too short",
      }).success,
    ).toBe(false);
  });
});
