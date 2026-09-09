import { describe, expect, it } from "vitest";

import {
  reviewerValidationBatchBaseSchema,
  reviewerValidationEvidenceSchema,
} from "./reviewer-validation";

const validAttestations = {
  versionId: "10000000-0000-4000-8000-000000000001",
  inspectedExactVersion: "on",
  appliedCurrentRubric: "on",
  independentJudgment: "on",
} as const;

const validEvidence = {
  outcome: "PASS",
  evidence:
    "I followed every explanation step and confirmed it reaches the keyed answer.",
  failureCode: "",
} as const;

describe("reviewer validation batch fields", () => {
  it("accepts specific evidence with all review attestations", () => {
    expect(
      reviewerValidationBatchBaseSchema.safeParse(validAttestations).success,
    ).toBe(true);
    expect(
      reviewerValidationEvidenceSchema.safeParse(validEvidence).success,
    ).toBe(true);
  });

  it("rejects missing inspection attestations", () => {
    expect(
      reviewerValidationBatchBaseSchema.safeParse({
        ...validAttestations,
        inspectedExactVersion: undefined,
      }).success,
    ).toBe(false);
  });

  it("rejects short evidence and contradictory pass metadata", () => {
    expect(
      reviewerValidationEvidenceSchema.safeParse({
        ...validEvidence,
        evidence: "Looks good.",
      }).success,
    ).toBe(false);
    expect(
      reviewerValidationEvidenceSchema.safeParse({
        ...validEvidence,
        failureCode: "EXPLANATION_SKIPS_STEP",
      }).success,
    ).toBe(false);
  });

  it("requires a stable failure code when the outcome fails", () => {
    expect(
      reviewerValidationEvidenceSchema.safeParse({
        ...validEvidence,
        outcome: "FAIL",
        failureCode: "",
      }).success,
    ).toBe(false);
  });
});
