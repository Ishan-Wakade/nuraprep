import { describe, expect, it } from "vitest";

import { reviewerValidationSubmissionSchema } from "./reviewer-validation";

const validSubmission = {
  versionId: "10000000-0000-4000-8000-000000000001",
  validatorKey: "explanation-consistency",
  outcome: "PASS",
  evidence:
    "I followed every explanation step and confirmed it reaches the keyed answer.",
  failureCode: "",
  inspectedExactVersion: "on",
  appliedCurrentRubric: "on",
  independentJudgment: "on",
} as const;

describe("reviewer validation submission", () => {
  it("accepts specific evidence with all review attestations", () => {
    expect(
      reviewerValidationSubmissionSchema.safeParse(validSubmission).success,
    ).toBe(true);
  });

  it("rejects missing inspection attestations", () => {
    expect(
      reviewerValidationSubmissionSchema.safeParse({
        ...validSubmission,
        inspectedExactVersion: undefined,
      }).success,
    ).toBe(false);
  });

  it("rejects short evidence and contradictory pass metadata", () => {
    expect(
      reviewerValidationSubmissionSchema.safeParse({
        ...validSubmission,
        evidence: "Looks good.",
      }).success,
    ).toBe(false);
    expect(
      reviewerValidationSubmissionSchema.safeParse({
        ...validSubmission,
        failureCode: "EXPLANATION_SKIPS_STEP",
      }).success,
    ).toBe(false);
  });

  it("requires a stable failure code when the outcome fails", () => {
    expect(
      reviewerValidationSubmissionSchema.safeParse({
        ...validSubmission,
        outcome: "FAIL",
        failureCode: "",
      }).success,
    ).toBe(false);
  });
});
