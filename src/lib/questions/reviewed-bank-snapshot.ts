import { z } from "zod";

import {
  mathVerificationSpecSchema,
  misconceptionCodesSchema,
  misconceptionRulesSchema,
  questionContentSchema,
  tutorGuidanceSchema,
} from "./contracts";

const sourceLinkSchema = z.object({
  canonicalUrl: z.url(),
  relationship: z.enum(["SPECIFICATION", "COVERAGE_OBSERVATION", "IN_HOUSE"]),
  transformationNotes: z.string().trim().min(20).max(5_000),
});

const ownerDecisionSchema = z.object({
  reviewerId: z.string().trim().min(3).max(160),
  decision: z.literal("APPROVED"),
  rubricScores: z.object({
    mathematicalCorrectness: z.number().int().min(1).max(4),
    clarity: z.number().int().min(1).max(4),
    alignment: z.number().int().min(1).max(4),
    accessibility: z.number().int().min(1).max(4),
    originality: z.number().int().min(1).max(4),
  }),
  notes: z.string().trim().min(5).max(5_000),
  decidedAt: z.iso.datetime(),
});

export const reviewedMathBankSnapshotSchema = z
  .object({
    schemaVersion: z.literal("reviewed-math-bank-v1"),
    reviewCompletedAt: z.iso.datetime(),
    scope: z.string().trim().min(20).max(2_000),
    questions: z
      .array(
        z.object({
          questionId: z.uuid(),
          versionId: z.uuid(),
          originalVersionNumber: z.number().int().positive(),
          slug: z
            .string()
            .trim()
            .min(3)
            .max(160)
            .regex(/^[a-z0-9][a-z0-9-]+$/),
          skillCode: z
            .string()
            .trim()
            .regex(/^MATH\.[A-Z0-9_]+$/),
          content: questionContentSchema,
          verificationSpec: mathVerificationSpecSchema,
          learningObjective: z.string().trim().min(10).max(2_000),
          difficulty: z.enum([
            "FOUNDATIONAL",
            "DEVELOPING",
            "PROFICIENT",
            "ADVANCED",
          ]),
          difficultyRationale: z.string().trim().min(10).max(2_000),
          estimatedSeconds: z.number().int().min(10).max(3_600),
          calculatorPolicy: z.enum(["ALLOWED", "NOT_ALLOWED", "NOT_NEEDED"]),
          commonMisconceptions: misconceptionCodesSchema,
          misconceptionRules: misconceptionRulesSchema,
          tutorGuidance: tutorGuidanceSchema.nullable(),
          provenanceSummary: z.string().trim().min(20).max(10_000),
          sources: z.array(sourceLinkSchema).min(1),
          ownerDecision: ownerDecisionSchema,
        }),
      )
      .length(38),
  })
  .superRefine((snapshot, context) => {
    for (const [label, values] of [
      [
        "question ID",
        snapshot.questions.map((question) => question.questionId),
      ],
      ["version ID", snapshot.questions.map((question) => question.versionId)],
      ["slug", snapshot.questions.map((question) => question.slug)],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message: `Reviewed bank contains a duplicate ${label}.`,
        });
      }
    }
  });

export type ReviewedMathBankSnapshot = z.infer<
  typeof reviewedMathBankSnapshotSchema
>;
