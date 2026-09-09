import { z } from "zod";

export const reviewerValidationBatchBaseSchema = z.object({
  versionId: z.uuid(),
  inspectedExactVersion: z.literal("on"),
  appliedCurrentRubric: z.literal("on"),
  independentJudgment: z.literal("on"),
});

export const reviewerValidationEvidenceSchema = z
  .object({
    outcome: z.enum(["PASS", "FAIL"]),
    evidence: z.string().trim().min(40).max(5_000),
    failureCode: z
      .string()
      .trim()
      .max(120)
      .regex(/^[A-Z0-9_-]*$/),
  })
  .superRefine((value, context) => {
    if (value.outcome === "FAIL" && !value.failureCode) {
      context.addIssue({
        code: "custom",
        path: ["failureCode"],
        message: "A failure code is required for a failed validation.",
      });
    }
    if (value.outcome === "PASS" && value.failureCode) {
      context.addIssue({
        code: "custom",
        path: ["failureCode"],
        message: "A passing validation cannot include a failure code.",
      });
    }
  });
