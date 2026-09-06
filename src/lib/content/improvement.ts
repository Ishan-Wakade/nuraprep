import { createHash } from "node:crypto";

import { z } from "zod";

export const feedbackCategories = [
  "MATHEMATICAL_ERROR",
  "AMBIGUITY",
  "ALIGNMENT",
  "DISTRACTOR_QUALITY",
  "EXPLANATION_QUALITY",
  "ACCESSIBILITY",
  "ORIGINALITY",
  "DIFFICULTY",
  "FORMATTING",
  "OTHER",
] as const;

export const improvementTargets = [
  "GENERATION_TEMPLATE",
  "VALIDATOR_RULE",
  "DIFFICULTY_RUBRIC",
  "EVALUATION_CASE",
  "CONTENT_POLICY",
] as const;

export const improvementProposalSchema = z.object({
  patternKey: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[A-Z0-9_-]+$/, "Pattern keys must use stable uppercase codes."),
  category: z.enum(feedbackCategories),
  target: z.enum(improvementTargets),
  title: z.string().trim().min(8).max(240),
  problemSummary: z.string().trim().min(20).max(5_000),
  proposedChange: z.string().trim().min(20).max(5_000),
  regressionPlan: z.string().trim().min(20).max(5_000),
});

export const improvementDecisionSchema = z.object({
  proposalId: z.uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().trim().min(20).max(5_000),
});

export type ImprovementProposalInput = z.infer<
  typeof improvementProposalSchema
>;

export function createImprovementProposalKey(input: ImprovementProposalInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        patternKey: input.patternKey,
        category: input.category,
        target: input.target,
        title: input.title.toLocaleLowerCase("en-US"),
        problemSummary: input.problemSummary.toLocaleLowerCase("en-US"),
        proposedChange: input.proposedChange.toLocaleLowerCase("en-US"),
        regressionPlan: input.regressionPlan.toLocaleLowerCase("en-US"),
      }),
    )
    .digest("hex");
}
