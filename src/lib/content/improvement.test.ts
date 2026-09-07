import { describe, expect, it } from "vitest";

import {
  createImprovementProposalKey,
  improvementDecisionSchema,
  improvementProposalSchema,
  improvementTemplateImplementationSchema,
  type ImprovementProposalInput,
} from "./improvement";

const proposal: ImprovementProposalInput = {
  patternKey: "REPEATED_STRUCTURE",
  category: "ORIGINALITY",
  target: "EVALUATION_CASE",
  title: "Add near-copy regression coverage",
  problemSummary:
    "Multiple open reports identify the same potential originality failure.",
  proposedChange:
    "Add one reviewed near-copy fixture without changing any threshold automatically.",
  regressionPlan:
    "Require the new negative case to fail while independent controls continue to pass.",
};

describe("controlled improvement contracts", () => {
  it("accepts a complete evidence-backed proposal contract", () => {
    expect(improvementProposalSchema.parse(proposal)).toEqual(proposal);
  });

  it("rejects unstable lowercase pattern keys", () => {
    expect(() =>
      improvementProposalSchema.parse({
        ...proposal,
        patternKey: "repeated-structure",
      }),
    ).toThrow(/stable uppercase codes/i);
  });

  it("creates a deterministic case-normalized idempotency key", () => {
    const differentlyCased = {
      ...proposal,
      title: proposal.title.toLocaleUpperCase("en-US"),
      proposedChange: proposal.proposedChange.toLocaleUpperCase("en-US"),
    };

    expect(createImprovementProposalKey(differentlyCased)).toBe(
      createImprovementProposalKey(proposal),
    );
    expect(
      createImprovementProposalKey({ ...proposal, target: "VALIDATOR_RULE" }),
    ).not.toBe(createImprovementProposalKey(proposal));
  });

  it("requires durable notes for a final proposal decision", () => {
    expect(
      improvementDecisionSchema.safeParse({
        proposalId: "14000000-0000-4000-8000-000000000001",
        decision: "APPROVED",
        notes: "short",
      }).success,
    ).toBe(false);
  });

  it("parses a reviewed template implementation contract", () => {
    const parsed = improvementTemplateImplementationSchema.parse({
      proposalId: "14000000-0000-4000-8000-000000000001",
      baseTemplateId: "17000000-0000-4000-8000-000000000001",
      instructions:
        "Generate an original candidate while varying contexts and structural forms deliberately.",
      parameterConstraints: '{"sourceQuestionTextProvided":false}',
      prohibitedPatterns: '["copied wording","numbers-only variation"]',
      validatorContract: '{"required":["ORIGINALITY"]}',
      implementationSummary:
        "Expanded the originality rules while preserving the template scope.",
      regressionEvidence:
        "The adversarial near-copy fixture fails and independent controls pass.",
      regressionChecksAttested: "on",
    });

    expect(parsed.parameterConstraints).toEqual({
      sourceQuestionTextProvided: false,
    });
    expect(parsed.prohibitedPatterns).toEqual([
      "copied wording",
      "numbers-only variation",
    ]);
  });

  it("rejects malformed template JSON and an absent regression attestation", () => {
    const parsed = improvementTemplateImplementationSchema.safeParse({
      proposalId: "14000000-0000-4000-8000-000000000001",
      baseTemplateId: "17000000-0000-4000-8000-000000000001",
      instructions:
        "Generate an original candidate while varying contexts and structural forms deliberately.",
      parameterConstraints: "[]",
      prohibitedPatterns: '["valid", 3]',
      validatorContract: "not-json",
      implementationSummary:
        "Expanded the originality rules while preserving the template scope.",
      regressionEvidence:
        "The adversarial near-copy fixture fails and independent controls pass.",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining([
          "parameterConstraints",
          "prohibitedPatterns",
          "validatorContract",
          "regressionChecksAttested",
        ]),
      );
    }
  });
});
