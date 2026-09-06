import {
  mathVerificationSpecSchema,
  misconceptionCodesSchema,
  misconceptionRulesSchema,
  questionContentSchema,
  type AnswerSpec,
  type LearnerAnswer,
  type MathVerificationSpec,
  type MisconceptionAttribution,
  type MisconceptionRule,
  type QuestionContent,
  type RpnExpression,
} from "./contracts";

export const REQUIRED_PUBLICATION_VALIDATORS = [
  "answer-contract",
  "mathematical-correctness",
  "explanation-consistency",
  "accessibility",
  "topic-alignment",
  "originality",
] as const;

export const AUTOMATED_PUBLICATION_VALIDATORS = [
  "answer-contract",
  "mathematical-correctness",
] as const satisfies readonly (typeof REQUIRED_PUBLICATION_VALIDATORS)[number][];

export const REVIEWER_PUBLICATION_VALIDATORS = [
  "explanation-consistency",
  "accessibility",
  "topic-alignment",
  "originality",
] as const satisfies readonly (typeof REQUIRED_PUBLICATION_VALIDATORS)[number][];

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
  const normalizedChoiceContent = choices.map((choice) =>
    normalizeDisplayedChoice(choice.content),
  );

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

  if (
    new Set(normalizedChoiceContent).size !== normalizedChoiceContent.length
  ) {
    issues.push({
      code: "DUPLICATE_CHOICE_CONTENT",
      message: "Displayed answer choices must be distinct.",
      path: "choices",
      severity: "error",
    });
  }

  if (content.questionType === "SINGLE_CHOICE") {
    const simpleNumericChoices = choices
      .map((choice) => ({
        id: choice.id,
        numeric: parseSimpleNumericChoice(choice.content),
      }))
      .filter(
        (
          choice,
        ): choice is { id: string; numeric: { value: number; unit: string } } =>
          Boolean(choice.numeric),
      );
    const duplicateNumericChoice = simpleNumericChoices.some((choice, index) =>
      simpleNumericChoices
        .slice(index + 1)
        .some(
          (other) =>
            choice.numeric.unit === other.numeric.unit &&
            Math.abs(choice.numeric.value - other.numeric.value) <= 1e-12,
        ),
    );
    if (duplicateNumericChoice) {
      issues.push({
        code: "DUPLICATE_NUMERIC_CHOICE_VALUE",
        message:
          "Single-choice numeric options must not contain equivalent values.",
        path: "choices",
        severity: "error",
      });
    }
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

  if (content.answerSpec.type === "numeric") {
    const units = [
      content.answerSpec.unit,
      ...content.answerSpec.acceptedUnits,
    ].filter((unit): unit is string => Boolean(unit));
    if (new Set(units.map(normalizeUnit)).size !== units.length) {
      issues.push({
        code: "DUPLICATE_ACCEPTED_UNIT",
        message: "Canonical and accepted numeric units must be distinct.",
        path: "answerSpec.acceptedUnits",
        severity: "error",
      });
    }
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

export function validateMisconceptionRules(
  contentInput: unknown,
  declaredCodes: string[],
  rulesInput: unknown,
): ValidationIssue[] {
  const contentResult = questionContentSchema.safeParse(contentInput);
  const codesResult = misconceptionCodesSchema.safeParse(declaredCodes);
  const rulesResult = misconceptionRulesSchema.safeParse(rulesInput);
  if (!contentResult.success || !codesResult.success || !rulesResult.success) {
    return [
      {
        code: "MISCONCEPTION_RULE_SCHEMA_INVALID",
        message:
          "Misconception rules must match the deterministic rule contract.",
        path: "misconceptionRules",
        severity: "error",
      },
    ];
  }

  const content = contentResult.data;
  const choiceIds = new Set(content.choices?.map((choice) => choice.id) ?? []);
  const declared = new Set(codesResult.data);
  const issues: ValidationIssue[] = [];

  for (const [index, rule] of rulesResult.data.entries()) {
    const path = `misconceptionRules.${index}`;
    if (!declared.has(rule.code)) {
      issues.push({
        code: "MISCONCEPTION_CODE_UNDECLARED",
        message: `Rule code “${rule.code}” is not declared on this question version.`,
        path: `${path}.code`,
        severity: "error",
      });
    }

    if (rule.kind === "selected_choice") {
      const correctIds = new Set(getCorrectIds(content.answerSpec));
      if (!choiceIds.has(rule.choiceId) || correctIds.has(rule.choiceId)) {
        issues.push({
          code: "MISCONCEPTION_CHOICE_INVALID",
          message:
            "A selected-choice rule must reference an incorrect displayed choice.",
          path: `${path}.choiceId`,
          severity: "error",
        });
      }
    }

    if (
      rule.kind === "omitted_choice" &&
      (content.answerSpec.type !== "multiple_select" ||
        !content.answerSpec.choiceIds.includes(rule.choiceId))
    ) {
      issues.push({
        code: "MISCONCEPTION_OMISSION_INVALID",
        message:
          "An omitted-choice rule must reference a correct multiple-select choice.",
        path: `${path}.choiceId`,
        severity: "error",
      });
    }

    if (rule.kind === "numeric_value") {
      const matchesCorrectAnswer =
        content.answerSpec.type === "numeric" &&
        evaluateAnswer(content.answerSpec, {
          type: "numeric",
          value: String(rule.value),
          unit: content.answerSpec.unit,
        }).correct;
      if (content.answerSpec.type !== "numeric" || matchesCorrectAnswer) {
        issues.push({
          code: "MISCONCEPTION_NUMERIC_VALUE_INVALID",
          message:
            "A numeric-value rule must describe an incorrect value for a numeric question.",
          path: `${path}.value`,
          severity: "error",
        });
      }
    }

    if (rule.kind === "reversed_pair") {
      const expected =
        content.answerSpec.type === "ordered_response"
          ? content.answerSpec.itemIds
          : [];
      if (
        expected.indexOf(rule.earlierItemId) < 0 ||
        expected.indexOf(rule.laterItemId) < 0 ||
        expected.indexOf(rule.earlierItemId) >=
          expected.indexOf(rule.laterItemId)
      ) {
        issues.push({
          code: "MISCONCEPTION_ORDER_PAIR_INVALID",
          message:
            "A reversed-pair rule must name two items in their correct earlier/later order.",
          path,
          severity: "error",
        });
      }
    }

    if (
      rule.kind === "evaluation_reason" &&
      content.answerSpec.type !== "numeric"
    ) {
      issues.push({
        code: "MISCONCEPTION_REASON_INVALID",
        message:
          "Evaluation-reason rules currently apply only to numeric input.",
        path: `${path}.reason`,
        severity: "error",
      });
    }
  }

  return issues;
}

export function attributeMisconceptions(
  submitted: LearnerAnswer,
  evaluation: AnswerEvaluation,
  rulesInput: MisconceptionRule[],
): MisconceptionAttribution[] {
  if (evaluation.correct) return [];

  return rulesInput
    .filter((rule) => misconceptionRuleMatches(rule, submitted, evaluation))
    .map(({ id, code, learnerMessage }) => ({ id, code, learnerMessage }));
}

function misconceptionRuleMatches(
  rule: MisconceptionRule,
  submitted: LearnerAnswer,
  evaluation: AnswerEvaluation,
) {
  switch (rule.kind) {
    case "selected_choice":
      return submitted.type === "single_choice"
        ? submitted.choiceId === rule.choiceId
        : submitted.type === "multiple_select" &&
            submitted.choiceIds.includes(rule.choiceId);
    case "omitted_choice":
      return (
        submitted.type === "multiple_select" &&
        !submitted.choiceIds.includes(rule.choiceId)
      );
    case "numeric_value": {
      if (submitted.type !== "numeric") return false;
      const value = parseNumericInput(submitted.value);
      return (
        value !== undefined && Math.abs(value - rule.value) <= rule.tolerance
      );
    }
    case "reversed_pair": {
      if (submitted.type !== "ordered_response") return false;
      const earlierIndex = submitted.itemIds.indexOf(rule.earlierItemId);
      const laterIndex = submitted.itemIds.indexOf(rule.laterItemId);
      return earlierIndex >= 0 && laterIndex >= 0 && earlierIndex > laterIndex;
    }
    case "evaluation_reason":
      return evaluation.reason === rule.reason;
  }
}

export function parseNumericInput(input: string): number | undefined {
  let normalized = input.trim().replaceAll("−", "-");
  if (!normalized) return undefined;

  if (normalized.includes(",")) {
    if (!/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(normalized)) {
      return undefined;
    }
    normalized = normalized.replaceAll(",", "");
  }

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

function normalizeDisplayedChoice(content: string) {
  return content
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replaceAll(/\s+/g, " ");
}

function parseSimpleNumericChoice(content: string) {
  const match = content
    .normalize("NFKC")
    .match(
      /^\s*([+-]?(?:(?:\d+\s+)?\d+\/\d+|(?:\d[\d,]*\.?\d*|\.\d+)))\s*(%|[a-zA-Z]+(?:\s+[a-zA-Z]+)*)?\s*$/,
    );
  if (!match) return undefined;
  const value = parseNumericInput(match[1]);
  if (value === undefined) return undefined;
  const suffix = match[2] ?? "";
  return suffix === "%"
    ? { value: value / 100, unit: "" }
    : { value, unit: normalizeUnit(suffix) };
}

export type DeterministicMathValidation =
  | {
      valid: true;
      evidence: Record<string, unknown>;
    }
  | {
      valid: false;
      failureCode: string;
      evidence: Record<string, unknown>;
    };

export function validateMathVerification(
  contentInput: unknown,
  specificationInput: unknown,
): DeterministicMathValidation {
  const contentResult = questionContentSchema.safeParse(contentInput);
  if (!contentResult.success) {
    return failure("CONTENT_SCHEMA_INVALID", {
      issueCount: contentResult.error.issues.length,
    });
  }

  const specificationResult =
    mathVerificationSpecSchema.safeParse(specificationInput);
  if (!specificationResult.success) {
    return failure("VERIFICATION_SPEC_INVALID", {
      issueCount: specificationResult.error.issues.length,
    });
  }

  const content = contentResult.data;
  const specification = specificationResult.data;

  try {
    switch (specification.kind) {
      case "numeric_result":
        return validateNumericResult(
          content,
          evaluateRpn(specification.expression),
          specification.tolerance,
          specification,
        );
      case "data_result":
        return validateNumericResult(
          content,
          evaluateDataOperation(specification.operation, specification.values),
          specification.tolerance,
          specification,
        );
      case "choice_equivalence":
        return validateChoiceEquivalence(content, specification);
      case "ordered_values":
        return validateOrderedValues(content, specification);
    }
  } catch (error) {
    return failure("VERIFICATION_EVALUATION_ERROR", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function validateNumericResult(
  content: QuestionContent,
  expectedValue: number,
  tolerance: number,
  specification: MathVerificationSpec,
): DeterministicMathValidation {
  const keyedValue = getKeyedNumericValue(content);
  if (keyedValue === undefined) {
    return failure("KEYED_NUMERIC_VALUE_UNAVAILABLE", {
      answerType: content.answerSpec.type,
    });
  }

  const difference = Math.abs(keyedValue - expectedValue);
  const evidence = {
    method: "deterministic-verification-spec",
    specification,
    computedValue: expectedValue,
    keyedValue,
    tolerance,
    difference,
  };

  return difference <= tolerance
    ? { valid: true, evidence }
    : failure("KEYED_ANSWER_MISMATCH", evidence);
}

function validateChoiceEquivalence(
  content: QuestionContent,
  specification: Extract<MathVerificationSpec, { kind: "choice_equivalence" }>,
): DeterministicMathValidation {
  if (content.answerSpec.type !== "multiple_select") {
    return failure("ANSWER_TYPE_NOT_MULTIPLE_SELECT", {
      answerType: content.answerSpec.type,
    });
  }

  const target = evaluateRpn(specification.target);
  const computedChoiceIds = Object.entries(specification.candidates)
    .filter(
      ([, expression]) =>
        Math.abs(evaluateRpn(expression) - target) <= specification.tolerance,
    )
    .map(([choiceId]) => choiceId)
    .sort();
  const keyedChoiceIds = [...content.answerSpec.choiceIds].sort();
  const evidence = {
    method: "deterministic-choice-equivalence",
    target,
    computedChoiceIds,
    keyedChoiceIds,
    tolerance: specification.tolerance,
  };

  return equalOrdered(computedChoiceIds, keyedChoiceIds)
    ? { valid: true, evidence }
    : failure("KEYED_CHOICE_SET_MISMATCH", evidence);
}

function validateOrderedValues(
  content: QuestionContent,
  specification: Extract<MathVerificationSpec, { kind: "ordered_values" }>,
): DeterministicMathValidation {
  if (content.answerSpec.type !== "ordered_response") {
    return failure("ANSWER_TYPE_NOT_ORDERED", {
      answerType: content.answerSpec.type,
    });
  }

  const multiplier = specification.direction === "ascending" ? 1 : -1;
  const computedItemIds = Object.entries(specification.values)
    .sort((left, right) => multiplier * (left[1] - right[1]))
    .map(([itemId]) => itemId);
  const keyedItemIds = content.answerSpec.itemIds;
  const evidence = {
    method: "deterministic-ordering",
    direction: specification.direction,
    computedItemIds,
    keyedItemIds,
  };

  return equalOrdered(computedItemIds, keyedItemIds)
    ? { valid: true, evidence }
    : failure("KEYED_ORDER_MISMATCH", evidence);
}

function getKeyedNumericValue(content: QuestionContent) {
  if (content.answerSpec.type === "numeric") return content.answerSpec.value;
  if (content.answerSpec.type !== "single_choice") return undefined;

  const keyedChoiceId = content.answerSpec.choiceId;
  const keyedChoice = content.choices?.find(
    (choice) => choice.id === keyedChoiceId,
  );
  if (!keyedChoice) return undefined;

  const leadingNumber = keyedChoice.content.match(
    /^[\s]*([+-]?(?:(?:\d+\s+)?\d+\/\d+|(?:\d+\.?\d*|\.\d+)))/,
  )?.[1];
  return leadingNumber ? parseNumericInput(leadingNumber) : undefined;
}

function evaluateRpn(expression: RpnExpression) {
  const stack: number[] = [];
  for (const token of expression) {
    if (typeof token === "number") {
      stack.push(token);
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) {
      throw new Error("Arithmetic expression is missing an operand.");
    }

    if (token === "divide" && right === 0) {
      throw new Error("Arithmetic expression divides by zero.");
    }

    stack.push(
      token === "add"
        ? left + right
        : token === "subtract"
          ? left - right
          : token === "multiply"
            ? left * right
            : left / right,
    );
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) {
    throw new Error("Arithmetic expression does not resolve to one value.");
  }
  return stack[0];
}

function evaluateDataOperation(
  operation: "mean" | "median" | "range",
  values: number[],
) {
  const ordered = [...values].sort((left, right) => left - right);
  if (operation === "range") return ordered.at(-1)! - ordered[0];
  if (operation === "mean") {
    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function failure(
  failureCode: string,
  evidence: Record<string, unknown>,
): DeterministicMathValidation {
  return { valid: false, failureCode, evidence };
}

function equalOrdered(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
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
