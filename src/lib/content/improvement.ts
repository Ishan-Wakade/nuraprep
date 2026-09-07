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

const jsonObjectText = z
  .string()
  .trim()
  .min(2)
  .max(20_000)
  .transform((value, context): Record<string, unknown> => {
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // The single field-level issue below intentionally covers invalid JSON.
    }
    context.addIssue({
      code: "custom",
      message: "Enter a valid JSON object.",
    });
    return z.NEVER;
  });

const jsonStringArrayText = z
  .string()
  .trim()
  .min(2)
  .max(20_000)
  .transform((value, context): string[] => {
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (item) =>
            typeof item === "string" &&
            item.trim().length > 0 &&
            item.length <= 500,
        )
      ) {
        return parsed;
      }
    } catch {
      // The single field-level issue below intentionally covers invalid JSON.
    }
    context.addIssue({
      code: "custom",
      message: "Enter a JSON array containing only non-empty strings.",
    });
    return z.NEVER;
  });

export const improvementTemplateImplementationSchema = z.object({
  proposalId: z.uuid(),
  baseTemplateId: z.uuid(),
  instructions: z.string().trim().min(40).max(20_000),
  parameterConstraints: jsonObjectText,
  prohibitedPatterns: jsonStringArrayText,
  validatorContract: jsonObjectText,
  implementationSummary: z.string().trim().min(20).max(5_000),
  regressionEvidence: z.string().trim().min(20).max(5_000),
  regressionChecksAttested: z.literal("on", {
    error: "Confirm that the recorded regression checks were performed.",
  }),
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
