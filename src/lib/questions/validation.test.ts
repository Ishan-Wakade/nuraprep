import { describe, expect, it } from "vitest";

import type { QuestionContent } from "./contracts";
import {
  evaluateAnswer,
  evaluatePublicationGate,
  parseNumericInput,
  REQUIRED_PUBLICATION_VALIDATORS,
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
