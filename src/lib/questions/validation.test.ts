import { describe, expect, it } from "vitest";

import {
  tutorGuidanceSchema,
  type MisconceptionRule,
  type QuestionContent,
} from "./contracts";
import {
  attributeMisconceptions,
  evaluateAnswer,
  evaluatePublicationGate,
  parseNumericInput,
  REQUIRED_PUBLICATION_VALIDATORS,
  validateMathVerification,
  validateMisconceptionRules,
  validateQuestionContent,
} from "./validation";

const validSingleChoiceQuestion: QuestionContent = {
  questionType: "SINGLE_CHOICE",
  prompt:
    "A clinic ordered 24 boxes with 18 bandages in each box. How many bandages arrived?",
  choices: [
    { id: "a", content: "42" },
    { id: "b", content: "192" },
    { id: "c", content: "432" },
    { id: "d", content: "442" },
  ],
  answerSpec: { type: "single_choice", choiceId: "c" },
  explanation:
    "Multiply the number of boxes by the number in each box: 24 × 18 = 432.",
  distractorRationales: {
    a: "This adds the two quantities instead of multiplying them.",
    b: "This uses 8 rather than 18 bandages per box.",
    d: "This is an arithmetic error in the ones place.",
  },
};

describe("validateQuestionContent", () => {
  it("accepts a complete single-choice contract", () => {
    expect(validateQuestionContent(validSingleChoiceQuestion)).toMatchObject({
      valid: true,
      issues: [],
    });
  });

  it("rejects an answer identifier that is absent from the choices", () => {
    const result = validateQuestionContent({
      ...validSingleChoiceQuestion,
      answerSpec: { type: "single_choice", choiceId: "missing" },
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "ANSWER_ID_NOT_FOUND",
    );
  });

  it("requires a rationale for every incorrect choice", () => {
    const result = validateQuestionContent({
      ...validSingleChoiceQuestion,
      distractorRationales: { a: "Adds instead of multiplying." },
    });

    expect(result.valid).toBe(false);
    expect(
      result.issues.filter(
        (issue) => issue.code === "DISTRACTOR_RATIONALE_MISSING",
      ),
    ).toHaveLength(2);
  });

  it("rejects a malformed table", () => {
    const result = validateQuestionContent({
      ...validSingleChoiceQuestion,
      stimulus: {
        type: "table",
        caption: "Supply deliveries",
        columns: ["Day", "Boxes"],
        rows: [["Monday"]],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "TABLE_SHAPE_INVALID",
    );
  });
});

describe("evaluateAnswer", () => {
  it("scores multiple-select answers without depending on selection order", () => {
    expect(
      evaluateAnswer(
        { type: "multiple_select", choiceIds: ["a", "c"] },
        { type: "multiple_select", choiceIds: ["c", "a"] },
      ),
    ).toEqual({ correct: true });
  });

  it("requires ordered responses to match position by position", () => {
    expect(
      evaluateAnswer(
        { type: "ordered_response", itemIds: ["first", "second", "third"] },
        { type: "ordered_response", itemIds: ["first", "third", "second"] },
      ).correct,
    ).toBe(false);
  });

  it("scores fractions, mixed numbers, tolerance, and accepted units", () => {
    expect(
      evaluateAnswer(
        {
          type: "numeric",
          value: 1.5,
          tolerance: 0,
          toleranceMode: "absolute",
          unit: "liters",
          acceptedUnits: ["L"],
          unitRequired: true,
        },
        { type: "numeric", value: "1 1/2", unit: "l" },
      ),
    ).toEqual({ correct: true, normalizedValue: 1.5 });

    expect(
      evaluateAnswer(
        {
          type: "numeric",
          value: 75,
          tolerance: 0.01,
          toleranceMode: "relative",
          acceptedUnits: [],
          unitRequired: false,
        },
        { type: "numeric", value: "75.7" },
      ).correct,
    ).toBe(true);
  });
});

describe("deterministic misconception attribution", () => {
  const rules = [
    {
      id: "adds-values",
      code: "ADDS_INSTEAD_OF_MULTIPLIES",
      learnerMessage: "Model the context as equal groups and multiply.",
      kind: "selected_choice" as const,
      choiceId: "a",
    },
  ] satisfies MisconceptionRule[];

  it("validates explicit rules against declared codes and answer structure", () => {
    expect(
      validateMisconceptionRules(
        validSingleChoiceQuestion,
        ["ADDS_INSTEAD_OF_MULTIPLIES"],
        rules,
      ),
    ).toEqual([]);

    expect(
      validateMisconceptionRules(
        validSingleChoiceQuestion,
        ["SOME_OTHER_CODE"],
        [{ ...rules[0], choiceId: "c" }],
      ).map((issue) => issue.code),
    ).toEqual([
      "MISCONCEPTION_CODE_UNDECLARED",
      "MISCONCEPTION_CHOICE_INVALID",
    ]);
  });

  it("attributes only a reviewed rule that matches an incorrect answer", () => {
    const wrongAnswer = { type: "single_choice" as const, choiceId: "a" };
    expect(
      attributeMisconceptions(
        wrongAnswer,
        evaluateAnswer(validSingleChoiceQuestion.answerSpec, wrongAnswer),
        rules,
      ),
    ).toEqual([
      {
        id: "adds-values",
        code: "ADDS_INSTEAD_OF_MULTIPLIES",
        learnerMessage: "Model the context as equal groups and multiply.",
      },
    ]);

    const correctAnswer = { type: "single_choice" as const, choiceId: "c" };
    expect(
      attributeMisconceptions(
        correctAnswer,
        evaluateAnswer(validSingleChoiceQuestion.answerSpec, correctAnswer),
        rules,
      ),
    ).toEqual([]);
  });

  it("matches omitted selections, numeric values, input errors, and reversed pairs", () => {
    const cases: Array<{
      answer: Parameters<typeof attributeMisconceptions>[0];
      evaluation: Parameters<typeof attributeMisconceptions>[1];
      rule: MisconceptionRule;
    }> = [
      {
        answer: { type: "multiple_select", choiceIds: ["a"] },
        evaluation: { correct: false },
        rule: {
          id: "missed-c",
          code: "MISSED_EQUIVALENT",
          learnerMessage: "Check every option before submitting.",
          kind: "omitted_choice",
          choiceId: "c",
        },
      },
      {
        answer: { type: "numeric", value: "42" },
        evaluation: { correct: false, normalizedValue: 42 },
        rule: {
          id: "numeric-42",
          code: "ADDED_VALUES",
          learnerMessage: "Use the operation represented by the context.",
          kind: "numeric_value",
          value: 42,
          tolerance: 0,
        },
      },
      {
        answer: { type: "numeric", value: "not a number" },
        evaluation: { correct: false, reason: "INVALID_NUMBER" },
        rule: {
          id: "invalid-input",
          code: "INVALID_NUMERIC_FORMAT",
          learnerMessage: "Enter only a number, fraction, or mixed number.",
          kind: "evaluation_reason",
          reason: "INVALID_NUMBER",
        },
      },
      {
        answer: { type: "ordered_response", itemIds: ["later", "earlier"] },
        evaluation: { correct: false },
        rule: {
          id: "reversed-pair",
          code: "REVERSED_DECIMAL_ORDER",
          learnerMessage: "Compare place values from left to right.",
          kind: "reversed_pair",
          earlierItemId: "earlier",
          laterItemId: "later",
        },
      },
    ];

    for (const testCase of cases) {
      expect(
        attributeMisconceptions(testCase.answer, testCase.evaluation, [
          testCase.rule,
        ]),
      ).toHaveLength(1);
    }
  });
});

describe("tutorGuidanceSchema", () => {
  it("requires bounded, uniquely identified Socratic steps", () => {
    const guidance = {
      steps: [
        {
          id: "structure",
          kind: "SOCRATIC_QUESTION",
          content: "What operation models equal groups?",
        },
      ],
      reflectionPrompt: "What changes if one group is added?",
    };

    expect(tutorGuidanceSchema.safeParse(guidance).success).toBe(true);
    expect(
      tutorGuidanceSchema.safeParse({
        ...guidance,
        steps: [guidance.steps[0], guidance.steps[0]],
      }).success,
    ).toBe(false);
  });
});

describe("parseNumericInput", () => {
  it.each([
    ["3/4", 0.75],
    ["-2 1/2", -2.5],
    ["1,250.5", 1250.5],
    ["−4", -4],
  ])("parses %s", (input, expected) => {
    expect(parseNumericInput(input)).toBe(expected);
  });

  it.each(["", "3/0", "2 + 2", "infinity", "1/2/3"])("rejects %s", (input) => {
    expect(parseNumericInput(input)).toBeUndefined();
  });
});

describe("validateMathVerification", () => {
  it("recomputes the keyed value from a safe arithmetic expression", () => {
    expect(
      validateMathVerification(validSingleChoiceQuestion, {
        kind: "numeric_result",
        expression: [24, 18, "multiply"],
        tolerance: 0,
      }),
    ).toMatchObject({
      valid: true,
      evidence: { computedValue: 432, keyedValue: 432 },
    });
  });

  it("reads a leading numeric value when a choice includes units", () => {
    const content: QuestionContent = {
      ...validSingleChoiceQuestion,
      choices: [
        { id: "a", content: "9 feet" },
        { id: "b", content: "11 feet" },
      ],
      answerSpec: { type: "single_choice", choiceId: "b" },
      distractorRationales: { a: "This subtracts one paired side." },
    };

    expect(
      validateMathVerification(content, {
        kind: "numeric_result",
        expression: [54, 2, 16, "multiply", "subtract", 2, "divide"],
        tolerance: 0,
      }),
    ).toMatchObject({ valid: true });
  });

  it("derives every equivalent-ratio choice rather than trusting the key", () => {
    const content: QuestionContent = {
      questionType: "MULTIPLE_SELECT",
      prompt: "Which ratios are equivalent to 3:5?",
      choices: [
        { id: "a", content: "6:10" },
        { id: "b", content: "9:12" },
        { id: "c", content: "12:20" },
      ],
      answerSpec: { type: "multiple_select", choiceIds: ["a", "c"] },
      explanation: "Both terms must be scaled by the same factor.",
      distractorRationales: { b: "This simplifies to 3:4." },
    };

    expect(
      validateMathVerification(content, {
        kind: "choice_equivalence",
        target: [3, 5, "divide"],
        candidates: {
          a: [6, 10, "divide"],
          b: [9, 12, "divide"],
          c: [12, 20, "divide"],
        },
        tolerance: 1e-9,
      }),
    ).toMatchObject({ valid: true });
  });

  it("derives ordered-response positions from stored numeric values", () => {
    const content: QuestionContent = {
      questionType: "ORDERED_RESPONSE",
      prompt: "Order the values.",
      choices: [
        { id: "a", content: "0.62" },
        { id: "b", content: "0.602" },
        { id: "c", content: "0.206" },
      ],
      answerSpec: { type: "ordered_response", itemIds: ["c", "b", "a"] },
      explanation: "Compare equal place values.",
      distractorRationales: {},
    };

    expect(
      validateMathVerification(content, {
        kind: "ordered_values",
        values: { a: 0.62, b: 0.602, c: 0.206 },
        direction: "ascending",
      }),
    ).toMatchObject({ valid: true });
  });

  it("detects a mismatched key and malformed arithmetic", () => {
    expect(
      validateMathVerification(validSingleChoiceQuestion, {
        kind: "numeric_result",
        expression: [24, 10, "multiply"],
        tolerance: 0,
      }),
    ).toMatchObject({ valid: false, failureCode: "KEYED_ANSWER_MISMATCH" });

    expect(
      validateMathVerification(validSingleChoiceQuestion, {
        kind: "numeric_result",
        expression: [24, "multiply"],
        tolerance: 0,
      }),
    ).toMatchObject({
      valid: false,
      failureCode: "VERIFICATION_EVALUATION_ERROR",
    });
  });
});

describe("evaluatePublicationGate", () => {
  it("blocks an approved active question when one required validator is missing", () => {
    const latestValidationByKey: Record<string, "PASS"> = Object.fromEntries(
      REQUIRED_PUBLICATION_VALIDATORS.map((key) => [key, "PASS"]),
    );
    delete latestValidationByKey.originality;

    expect(
      evaluatePublicationGate({
        lifecycle: "ACTIVE",
        provenanceCount: 1,
        latestReviewDecision: "APPROVED",
        latestValidationByKey,
      }),
    ).toEqual({
      publishable: false,
      blockers: ["VALIDATOR_NOT_PASSING:originality"],
    });
  });

  it("allows publication only when every gate is satisfied", () => {
    expect(
      evaluatePublicationGate({
        lifecycle: "ACTIVE",
        provenanceCount: 1,
        latestReviewDecision: "APPROVED",
        latestValidationByKey: Object.fromEntries(
          REQUIRED_PUBLICATION_VALIDATORS.map((key) => [key, "PASS"] as const),
        ),
      }),
    ).toEqual({ publishable: true, blockers: [] });
  });
});
