import {
  questionContentSchema,
  type AnswerSpec,
  type QuestionContent,
} from "./contracts";

export const REQUIRED_PUBLICATION_VALIDATORS = [
  "answer-contract",
  "mathematical-correctness",
  "explanation-consistency",
  "accessibility",
  "topic-alignment",
  "originality",
] as const;

export type ValidationIssue = {
  code: string;
  message: string;
  path: string;
  severity: "error" | "warning";
};

export type ContentValidationResult =
  | { valid: true; content: QuestionContent; issues: ValidationIssue[] }
  | { valid: false; issues: ValidationIssue[] };

const questionTypeByAnswerType: Record<
  AnswerSpec["type"],
  QuestionContent["questionType"]
> = {
  single_choice: "SINGLE_CHOICE",
  multiple_select: "MULTIPLE_SELECT",
  numeric: "NUMERIC",
  ordered_response: "ORDERED_RESPONSE",
};

export function validateQuestionContent(
  input: unknown,
): ContentValidationResult {
  const parsed = questionContentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => ({
        code: "SCHEMA_INVALID",
        message: issue.message,
        path: issue.path.join("."),
        severity: "error" as const,
      })),
    };
  }

  const content = parsed.data;
  const issues: ValidationIssue[] = [];
  const choices = content.choices ?? [];
  const choiceIds = choices.map((choice) => choice.id);
  const uniqueChoiceIds = new Set(choiceIds);

  if (
    questionTypeByAnswerType[content.answerSpec.type] !== content.questionType
  ) {
    issues.push({
      code: "ANSWER_TYPE_MISMATCH",
      message: "The answer contract does not match the declared question type.",
      path: "answerSpec.type",
      severity: "error",
    });
  }

  if (uniqueChoiceIds.size !== choiceIds.length) {
    issues.push({
      code: "DUPLICATE_CHOICE_ID",
      message: "Choice identifiers must be unique and stable.",
      path: "choices",
      severity: "error",
    });
  }

  if (content.questionType === "NUMERIC" && choices.length > 0) {
    issues.push({
      code: "NUMERIC_HAS_CHOICES",
      message: "Numeric questions must not include answer choices.",
      path: "choices",
      severity: "error",
    });
  }

  if (content.questionType !== "NUMERIC" && choices.length === 0) {
    issues.push({
      code: "CHOICES_REQUIRED",
      message: "This question type requires choices or ordered items.",
      path: "choices",
      severity: "error",
    });
  }

  const correctIds = getCorrectIds(content.answerSpec);

  for (const correctId of correctIds) {
    if (!uniqueChoiceIds.has(correctId)) {
      issues.push({
        code: "ANSWER_ID_NOT_FOUND",
        message: `Correct answer identifier “${correctId}” is not present in choices.`,
        path: "answerSpec",
        severity: "error",
      });
    }
  }

  if (
    content.answerSpec.type === "ordered_response" &&
    (() => {
      const orderedItemIds = content.answerSpec.itemIds;
      return (
        orderedItemIds.length !== choices.length ||
        choices.some((choice) => !orderedItemIds.includes(choice.id))
      );
    })()
  ) {
    issues.push({
      code: "ORDER_SET_MISMATCH",
      message:
        "The ordered answer must contain every displayed item exactly once.",
      path: "answerSpec.itemIds",
      severity: "error",
    });
  }

  if (content.stimulus?.type === "table") {
    const tableStimulus = content.stimulus;
    if (
      tableStimulus.rows.some(
        (row) => row.length !== tableStimulus.columns.length,
      )
    ) {
      issues.push({
        code: "TABLE_SHAPE_INVALID",
        message:
          "Every table row must have the same number of cells as the header.",
        path: "stimulus.rows",
        severity: "error",
      });
    }
  }

  const expectedDistractorIds =
    content.answerSpec.type === "numeric" ||
    content.answerSpec.type === "ordered_response"
      ? []
      : choiceIds.filter((id) => !correctIds.includes(id));
  const rationaleIds = Object.keys(content.distractorRationales);

  for (const expectedId of expectedDistractorIds) {
    if (!rationaleIds.includes(expectedId)) {
      issues.push({
        code: "DISTRACTOR_RATIONALE_MISSING",
        message: `Distractor “${expectedId}” needs a rationale.`,
        path: `distractorRationales.${expectedId}`,
        severity: "error",
      });
    }
  }

  for (const rationaleId of rationaleIds) {
    if (!expectedDistractorIds.includes(rationaleId)) {
      issues.push({
        code: "DISTRACTOR_RATIONALE_ORPHANED",
        message: `Rationale “${rationaleId}” does not map to an incorrect choice.`,
        path: `distractorRationales.${rationaleId}`,
        severity: "error",
      });
    }
  }

  return issues.some((issue) => issue.severity === "error")
    ? { valid: false, issues }
    : { valid: true, content, issues };
}

function getCorrectIds(answer: AnswerSpec): string[] {
  if (answer.type === "single_choice") return [answer.choiceId];
  if (answer.type === "multiple_select") return answer.choiceIds;
  if (answer.type === "ordered_response") return answer.itemIds;
  return [];
}

export type LearnerAnswer =
  | { type: "single_choice"; choiceId: string }
  | { type: "multiple_select"; choiceIds: string[] }
  | { type: "numeric"; value: string; unit?: string }
  | { type: "ordered_response"; itemIds: string[] };

export type AnswerEvaluation = {
  correct: boolean;
  normalizedValue?: number;
  reason?:
    "TYPE_MISMATCH" | "INVALID_NUMBER" | "UNIT_REQUIRED" | "UNIT_INVALID";
};

export function evaluateAnswer(
  expected: AnswerSpec,
  submitted: LearnerAnswer,
): AnswerEvaluation {
  switch (submitted.type) {
    case "single_choice":
      if (expected.type !== "single_choice") {
        return { correct: false, reason: "TYPE_MISMATCH" };
      }
      return { correct: expected.choiceId === submitted.choiceId };
    case "multiple_select":
      if (expected.type !== "multiple_select") {
        return { correct: false, reason: "TYPE_MISMATCH" };
      }
      return {
        correct: equalSets(expected.choiceIds, submitted.choiceIds),
      };
    case "ordered_response":
      if (expected.type !== "ordered_response") {
        return { correct: false, reason: "TYPE_MISMATCH" };
      }
      return {
        correct:
          expected.itemIds.length === submitted.itemIds.length &&
          expected.itemIds.every(
            (id, index) => id === submitted.itemIds[index],
          ),
      };
    case "numeric": {
      if (expected.type !== "numeric") {
        return { correct: false, reason: "TYPE_MISMATCH" };
      }
      const numericValue = parseNumericInput(submitted.value);
      if (numericValue === undefined) {
        return { correct: false, reason: "INVALID_NUMBER" };
      }

      if (expected.unitRequired && !submitted.unit?.trim()) {
        return {
          correct: false,
          normalizedValue: numericValue,
          reason: "UNIT_REQUIRED",
        };
      }

      if (submitted.unit && expected.unit) {
        const acceptedUnits = [expected.unit, ...expected.acceptedUnits].map(
          normalizeUnit,
        );
        if (!acceptedUnits.includes(normalizeUnit(submitted.unit))) {
          return {
            correct: false,
            normalizedValue: numericValue,
            reason: "UNIT_INVALID",
          };
        }
      }

      const allowedDifference =
        expected.toleranceMode === "absolute"
          ? expected.tolerance
          : expected.value === 0
            ? expected.tolerance
            : Math.abs(expected.value) * expected.tolerance;

      return {
        correct: Math.abs(numericValue - expected.value) <= allowedDifference,
        normalizedValue: numericValue,
      };
    }
  }
}

export function parseNumericInput(input: string): number | undefined {
  const normalized = input.trim().replaceAll(",", "").replaceAll("−", "-");
  if (!normalized) return undefined;

  const mixedNumberMatch = normalized.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedNumberMatch) {
    const whole = Number(mixedNumberMatch[1]);
    const numerator = Number(mixedNumberMatch[2]);
    const denominator = Number(mixedNumberMatch[3]);
    if (denominator === 0) return undefined;
    const sign = whole < 0 ? -1 : 1;
    return whole + sign * (numerator / denominator);
  }

  const fractionMatch = normalized.match(/^([+-]?\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) return undefined;
    return numerator / denominator;
  }

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return undefined;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function equalSets(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return (
    rightSet.size === right.length && left.every((value) => rightSet.has(value))
  );
}

function normalizeUnit(unit: string) {
  return unit.trim().toLocaleLowerCase("en-US").replaceAll(/\s+/g, " ");
}

type PublicationGateInput = {
  lifecycle: "DRAFT" | "ACTIVE" | "RETRACTED" | "ARCHIVED";
  provenanceCount: number;
  latestReviewDecision?: "APPROVED" | "NEEDS_REVISION" | "REJECTED";
  latestValidationByKey: Record<
    string,
    "PASS" | "FAIL" | "WARNING" | "ERROR" | undefined
  >;
};

export type PublicationGateResult = {
  publishable: boolean;
  blockers: string[];
};

export function evaluatePublicationGate(
  input: PublicationGateInput,
): PublicationGateResult {
  const blockers: string[] = [];

  if (input.lifecycle !== "ACTIVE") blockers.push("QUESTION_NOT_ACTIVE");
  if (input.provenanceCount < 1) blockers.push("PROVENANCE_REQUIRED");
  if (input.latestReviewDecision !== "APPROVED")
    blockers.push("APPROVAL_REQUIRED");

  for (const validatorKey of REQUIRED_PUBLICATION_VALIDATORS) {
    if (input.latestValidationByKey[validatorKey] !== "PASS") {
      blockers.push(`VALIDATOR_NOT_PASSING:${validatorKey}`);
    }
  }

  return { publishable: blockers.length === 0, blockers };
}
