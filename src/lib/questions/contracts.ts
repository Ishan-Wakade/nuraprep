import { z } from "zod";

const stableIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const questionChoiceSchema = z.object({
  id: stableIdSchema,
  content: z.string().trim().min(1).max(1_000),
});

export const singleChoiceAnswerSchema = z.object({
  type: z.literal("single_choice"),
  choiceId: stableIdSchema,
});

export const multipleSelectAnswerSchema = z
  .object({
    type: z.literal("multiple_select"),
    choiceIds: z.array(stableIdSchema).min(1),
  })
  .refine(
    (answer) => new Set(answer.choiceIds).size === answer.choiceIds.length,
    {
      message: "Correct choice identifiers must be unique.",
      path: ["choiceIds"],
    },
  );

export const numericAnswerSchema = z
  .object({
    type: z.literal("numeric"),
    value: z.number().finite(),
    tolerance: z.number().finite().nonnegative().default(0),
    toleranceMode: z.enum(["absolute", "relative"]).default("absolute"),
    unit: z.string().trim().min(1).max(40).optional(),
    acceptedUnits: z.array(z.string().trim().min(1).max(40)).default([]),
    unitRequired: z.boolean().default(false),
  })
  .refine((answer) => !answer.unitRequired || Boolean(answer.unit), {
    message: "A canonical unit is required when unit entry is required.",
    path: ["unit"],
  });

export const orderedAnswerSchema = z
  .object({
    type: z.literal("ordered_response"),
    itemIds: z.array(stableIdSchema).min(2),
  })
  .refine((answer) => new Set(answer.itemIds).size === answer.itemIds.length, {
    message: "Ordered item identifiers must be unique.",
    path: ["itemIds"],
  });

export const answerSpecSchema = z.discriminatedUnion("type", [
  singleChoiceAnswerSchema,
  multipleSelectAnswerSchema,
  numericAnswerSchema,
  orderedAnswerSchema,
]);

export const barGraphDataSchema = z
  .object({
    kind: z.literal("bar"),
    title: z.string().trim().min(1).max(160),
    xAxisLabel: z.string().trim().min(1).max(120),
    yAxisLabel: z.string().trim().min(1).max(120),
    bars: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(80),
          value: z.number().finite().nonnegative(),
        }),
      )
      .min(2)
      .max(8),
  })
  .refine(
    (graph) =>
      new Set(graph.bars.map((bar) => bar.label.toLocaleLowerCase("en-US")))
        .size === graph.bars.length,
    { message: "Bar labels must be unique.", path: ["bars"] },
  );

export const stimulusSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("table"),
    caption: z.string().trim().min(1).max(500),
    columns: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
    rows: z
      .array(z.array(z.string().trim().max(500)))
      .min(1)
      .max(100),
  }),
  z.object({
    type: z.literal("graph"),
    accessibleDescription: z.string().trim().min(1).max(2_000),
    data: barGraphDataSchema,
  }),
]);

export const distractorRationaleSchema = z.record(
  stableIdSchema,
  z.string().trim().min(1).max(2_000),
);

export const misconceptionCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Z0-9_-]+$/);

export const misconceptionCodesSchema = z
  .array(misconceptionCodeSchema)
  .max(40)
  .refine((codes) => new Set(codes).size === codes.length, {
    message: "Misconception codes must be unique.",
  });

const misconceptionRuleBase = {
  id: stableIdSchema,
  code: misconceptionCodeSchema,
  learnerMessage: z.string().trim().min(1).max(500),
};

export const misconceptionRuleSchema = z.discriminatedUnion("kind", [
  z.object({
    ...misconceptionRuleBase,
    kind: z.literal("selected_choice"),
    choiceId: stableIdSchema,
  }),
  z.object({
    ...misconceptionRuleBase,
    kind: z.literal("omitted_choice"),
    choiceId: stableIdSchema,
  }),
  z.object({
    ...misconceptionRuleBase,
    kind: z.literal("numeric_value"),
    value: z.number().finite(),
    tolerance: z.number().finite().nonnegative().default(0),
  }),
  z.object({
    ...misconceptionRuleBase,
    kind: z.literal("reversed_pair"),
    earlierItemId: stableIdSchema,
    laterItemId: stableIdSchema,
  }),
  z.object({
    ...misconceptionRuleBase,
    kind: z.literal("evaluation_reason"),
    reason: z.enum(["INVALID_NUMBER", "UNIT_REQUIRED", "UNIT_INVALID"]),
  }),
]);

export const misconceptionRulesSchema = z
  .array(misconceptionRuleSchema)
  .max(40)
  .refine(
    (rules) => new Set(rules.map((rule) => rule.id)).size === rules.length,
    {
      message: "Misconception rule identifiers must be unique.",
    },
  );

export const tutorGuidanceSchema = z
  .object({
    steps: z
      .array(
        z.object({
          id: stableIdSchema,
          kind: z.enum(["SOCRATIC_QUESTION", "HINT"]),
          content: z.string().trim().min(1).max(1_000),
        }),
      )
      .min(1)
      .max(5),
    reflectionPrompt: z.string().trim().min(1).max(1_000),
  })
  .refine(
    (guidance) =>
      new Set(guidance.steps.map((step) => step.id)).size ===
      guidance.steps.length,
    { message: "Tutor-step identifiers must be unique.", path: ["steps"] },
  );

export const questionContentSchema = z.object({
  questionType: z.enum([
    "SINGLE_CHOICE",
    "MULTIPLE_SELECT",
    "NUMERIC",
    "ORDERED_RESPONSE",
  ]),
  prompt: z.string().trim().min(1).max(10_000),
  stimulus: stimulusSchema.optional(),
  choices: z.array(questionChoiceSchema).min(2).max(12).optional(),
  answerSpec: answerSpecSchema,
  explanation: z.string().trim().min(1).max(20_000),
  distractorRationales: distractorRationaleSchema,
});

export const arithmeticOperatorSchema = z.enum([
  "add",
  "subtract",
  "multiply",
  "divide",
]);

export const rpnExpressionSchema = z
  .array(z.union([z.number().finite(), arithmeticOperatorSchema]))
  .min(1)
  .max(100);

export const mathVerificationSpecSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("numeric_result"),
    expression: rpnExpressionSchema,
    tolerance: z.number().finite().nonnegative().default(0),
  }),
  z.object({
    kind: z.literal("choice_equivalence"),
    target: rpnExpressionSchema,
    candidates: z.record(stableIdSchema, rpnExpressionSchema),
    tolerance: z.number().finite().nonnegative().default(0),
  }),
  z.object({
    kind: z.literal("inequality_choices"),
    left: z.object({
      coefficient: z.number().finite(),
      constant: z.number().finite(),
    }),
    right: z.object({
      coefficient: z.number().finite(),
      constant: z.number().finite(),
    }),
    relation: z.enum(["lt", "lte", "gt", "gte"]),
    candidateValues: z.record(stableIdSchema, z.number().finite()),
  }),
  z.object({
    kind: z.literal("ordered_values"),
    values: z.record(stableIdSchema, z.number().finite()),
    direction: z.enum(["ascending", "descending"]),
  }),
  z.object({
    kind: z.literal("data_result"),
    operation: z.enum(["mean", "median", "range"]),
    values: z.array(z.number().finite()).min(1).max(1_000),
    tolerance: z.number().finite().nonnegative().default(0),
  }),
]);

export type AnswerSpec = z.infer<typeof answerSpecSchema>;
export type QuestionChoice = z.infer<typeof questionChoiceSchema>;
export type QuestionStimulus = z.infer<typeof stimulusSchema>;
export type DistractorRationales = z.infer<typeof distractorRationaleSchema>;
export type QuestionContent = z.infer<typeof questionContentSchema>;
export type RpnExpression = z.infer<typeof rpnExpressionSchema>;
export type MathVerificationSpec = z.infer<typeof mathVerificationSpecSchema>;
export type MisconceptionRule = z.infer<typeof misconceptionRuleSchema>;
export type MisconceptionAttribution = Pick<
  MisconceptionRule,
  "id" | "code" | "learnerMessage"
>;
export type TutorGuidance = z.infer<typeof tutorGuidanceSchema>;

export type LearnerAnswer =
  | { type: "single_choice"; choiceId: string }
  | { type: "multiple_select"; choiceIds: string[] }
  | { type: "numeric"; value: string; unit?: string }
  | { type: "ordered_response"; itemIds: string[] };
