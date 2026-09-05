import { z } from "zod";

export const practiceSessionFiltersSchema = z
  .object({
    skillCode: z.string().trim().min(1).max(120).optional(),
    difficulty: z
      .enum(["FOUNDATIONAL", "DEVELOPING", "PROFICIENT", "ADVANCED"])
      .optional(),
    questionType: z
      .enum(["SINGLE_CHOICE", "MULTIPLE_SELECT", "NUMERIC", "ORDERED_RESPONSE"])
      .optional(),
    questionCount: z.coerce.number().int().min(1).max(20).default(5),
    timingMode: z.enum(["UNTIMED", "TIMED"]).default("UNTIMED"),
    newOnly: z.boolean().default(false),
    missedOnly: z.boolean().default(false),
  })
  .refine((filters) => !(filters.newOnly && filters.missedOnly), {
    message: "New-only and missed-only filters cannot be combined.",
    path: ["newOnly"],
  });

export type PracticeSessionFilters = z.infer<
  typeof practiceSessionFiltersSchema
>;
