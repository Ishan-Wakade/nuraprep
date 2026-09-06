import { describe, expect, it } from "vitest";

import {
  createImprovementProposalKey,
  improvementDecisionSchema,
  improvementProposalSchema,
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
});
