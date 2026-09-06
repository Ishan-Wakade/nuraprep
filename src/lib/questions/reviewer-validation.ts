import { z } from "zod";

import { REVIEWER_PUBLICATION_VALIDATORS } from "./validation";

export const reviewerValidationSubmissionSchema = z
  .object({
    versionId: z.uuid(),
    validatorKey: z.enum(REVIEWER_PUBLICATION_VALIDATORS),
    outcome: z.enum(["PASS", "FAIL"]),
    evidence: z.string().trim().min(40).max(5_000),
    failureCode: z
      .string()
      .trim()
      .max(120)
      .regex(/^[A-Z0-9_-]*$/),
    inspectedExactVersion: z.literal("on"),
    appliedCurrentRubric: z.literal("on"),
    independentJudgment: z.literal("on"),
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
