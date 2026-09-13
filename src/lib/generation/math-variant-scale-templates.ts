import type { GeneratedCandidate } from "./contracts";
import type {
  DeterministicVariantTemplate,
  SeededRandom,
} from "./deterministic-variants";
import type { RpnExpression } from "@/lib/questions/contracts";

type PromptFrame = {
  key: string;
  render(values: Record<string, string | number>): string;
};

const percentContexts = [
  "training course",
  "textbook",
  "set of lab supplies",
  "study subscription",
  "piece of equipment",
] as const;

const percentFrames: readonly PromptFrame[] = [
  {
    key: "new-price",
    render: ({ context, base, percent, changeWord }) =>
      `A ${context} costs $${base}. Its price has a ${percent}% ${changeWord}. What is the new price?`,
  },
  {
    key: "apply-change",
    render: ({ context, base, percent, changeWord }) =>
      `Apply a ${percent}% ${changeWord} to the $${base} price of a ${context}. Find the resulting price.`,
  },
  {
    key: "two-step-percent",
    render: ({ context, base, percent, operationWord }) =>
      `The original price of a ${context} is $${base}. First find ${percent}% of the original price, then ${operationWord} that amount. What is the final price?`,
  },
  {
    key: "multiplicative-change",
    render: ({ context, base, percent, changeWord }) =>
      `A $${base} ${context} undergoes a ${percent}% price ${changeWord}. Which dollar amount represents the adjusted price?`,
  },
] as const;

const mixedUnitRelationships = [
  { key: "hours-minutes", major: "hours", minor: "minutes", factor: 60 },
  { key: "days-hours", major: "days", minor: "hours", factor: 24 },
  { key: "feet-inches", major: "feet", minor: "inches", factor: 12 },
  { key: "yards-feet", major: "yards", minor: "feet", factor: 3 },
  { key: "pounds-ounces", major: "pounds", minor: "ounces", factor: 16 },
  { key: "gallons-quarts", major: "gallons", minor: "quarts", factor: 4 },
  { key: "cups-fluid-ounces", major: "cups", minor: "fluid ounces", factor: 8 },
  {
    key: "liters-milliliters",
    major: "liters",
    minor: "milliliters",
    factor: 1000,
  },
  {
    key: "meters-centimeters",
    major: "meters",
    minor: "centimeters",
    factor: 100,
  },
  { key: "kilograms-grams", major: "kilograms", minor: "grams", factor: 1000 },
] as const;

const mixedUnitFrames: readonly PromptFrame[] = [
  {
    key: "combine-measures",
    render: ({ majorAmount, major, minorAmount, minor }) =>
      `Convert and combine ${majorAmount} ${major} and ${minorAmount} ${minor}. What is the total in ${minor}?`,
  },
  {
    key: "single-smaller-unit",
    render: ({ majorAmount, major, minorAmount, minor }) =>
      `Express ${majorAmount} ${major} ${minorAmount} ${minor} entirely in ${minor}.`,
  },
  {
    key: "mixed-measure-total",
    render: ({ majorAmount, major, minorAmount, minor }) =>
      `A measurement contains ${majorAmount} ${major} plus ${minorAmount} additional ${minor}. Find its total number of ${minor}.`,
  },
  {
    key: "conversion-expression",
    render: ({ majorAmount, factor, minorAmount, minor }) =>
      `Evaluate (${majorAmount} × ${factor}) + ${minorAmount} to rewrite a mixed measurement in ${minor}.`,
  },
] as const;

const inequalityContexts = [
  { thing: "practice problems", unit: "problem" },
  { thing: "study sessions", unit: "session" },
  { thing: "training modules", unit: "module" },
  { thing: "supply kits", unit: "kit" },
  { thing: "review chapters", unit: "chapter" },
] as const;

const inequalityFrames: readonly PromptFrame[] = [
  {
    key: "boundary-count",
    render: ({ fixed, unitAmount, thing, relation, target, boundary }) =>
      `A total starts at ${fixed} and changes by ${unitAmount} for each of several ${thing}. The total must be ${relation} ${target}. What is the ${boundary} whole-number count that meets the constraint?`,
  },
  {
    key: "write-and-solve",
    render: ({ fixed, unitAmount, relationSymbol, target, thing, boundary }) =>
      `Solve ${fixed} + ${unitAmount}x ${relationSymbol} ${target}, where x is a whole-number count of ${thing}. Select the ${boundary} permitted value of x.`,
  },
  {
    key: "practical-constraint",
    render: ({ fixed, unitAmount, thing, relation, target, boundary }) =>
      `After an initial amount of ${fixed}, each ${thing} adds ${unitAmount}. To keep the total ${relation} ${target}, find the ${boundary} whole-number count.`,
  },
  {
    key: "test-boundary",
    render: ({ fixed, unitAmount, unit, relation, target, boundary }) =>
      `The expression ${fixed} + ${unitAmount}x must be ${relation} ${target}, with x counting each ${unit}. Which value is the ${boundary} allowable boundary?`,
  },
] as const;

export const mathVariantScaleTemplates: readonly DeterministicVariantTemplate[] =
  [
    {
      key: "math.fractions.percent-change-depth-choice",
      version: 1,
      targetSkillCode: "MATH.FRACTIONS_DECIMALS_PERCENT",
      questionType: "SINGLE_CHOICE",
      difficulty: "PROFICIENT",
      structureCapacity: percentContexts.length * percentFrames.length * 2,
      generate(random) {
        const context = random.pick(percentContexts);
        const frame = random.pick(percentFrames);
        const increase = random.pick([true, false] as const);
        const base = random.integer(4, 20) * 20;
        const percent = random.pick([10, 15, 20, 25, 30, 40] as const);
        const change = (base * percent) / 100;
        const answer = increase ? base + change : base - change;
        const opposite = increase ? base - change : base + change;
        return {
          structureKey: `${slug(context)}.${frame.key}.${increase ? "increase" : "decrease"}`,
          parameters: { base, percent, change, answer, increase },
          candidate: singleChoiceCandidate(random, {
            prompt: frame.render({
              context,
              base,
              percent,
              changeWord: increase ? "increase" : "decrease",
              operationWord: increase ? "add" : "subtract",
            }),
            answer,
            wrongAnswers: [change, opposite, base],
            expression: increase
              ? [base, base, percent, 100, "divide", "multiply", "add"]
              : [base, base, percent, 100, "divide", "multiply", "subtract"],
            learningObjective:
              "Calculate a final amount after a percent increase or decrease.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must distinguish the change amount from the final amount and apply the direction of change.",
            estimatedSeconds: 90,
            calculatorPolicy: "ALLOWED",
            explanation: `${percent}% of $${base} is $${formatNumber(change)}. ${increase ? "Add" : "Subtract"} that change: $${base} ${increase ? "+" : "−"} $${formatNumber(change)} = $${formatNumber(answer)}.`,
            misconceptionCode: "REPORTS_PERCENT_CHANGE_ONLY",
            misconceptionMessage:
              "You reported only the amount of change. The question asks for the adjusted total.",
            distractorExplanations: [
              "This is only the percent change, not the final price.",
              "This applies the correct change in the opposite direction.",
              "This leaves the original amount unchanged.",
            ],
            tutorQuestion:
              "Does the question ask for the amount of change or the amount after the change?",
            tutorHint:
              "Find the percent of the original amount first, then add for an increase or subtract for a decrease.",
            reflection:
              "How could a multiplier such as 1.20 or 0.80 produce the same result?",
          }),
        };
      },
    },
    {
      key: "math.unit-conversions.mixed-measure-depth-numeric",
      version: 1,
      targetSkillCode: "MATH.UNIT_CONVERSIONS",
      questionType: "NUMERIC",
      difficulty: "DEVELOPING",
      structureCapacity: mixedUnitRelationships.length * mixedUnitFrames.length,
      generate(random) {
        const relationship = random.pick(mixedUnitRelationships);
        const frame = random.pick(mixedUnitFrames);
        const majorAmount = random.integer(2, 12);
        const minorAmount = random.integer(1, relationship.factor - 1);
        const answer = majorAmount * relationship.factor + minorAmount;
        return {
          structureKey: `${relationship.key}.${frame.key}`,
          parameters: { ...relationship, majorAmount, minorAmount, answer },
          candidate: numericCandidate({
            prompt: frame.render({
              ...relationship,
              majorAmount,
              minorAmount,
            }),
            answer,
            unit: relationship.minor,
            expression: [
              majorAmount,
              relationship.factor,
              "multiply",
              minorAmount,
              "add",
            ],
            learningObjective:
              "Convert a mixed-unit measurement entirely to its smaller unit.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must convert the major-unit portion and then combine it with the existing smaller units.",
            estimatedSeconds: 75,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `${majorAmount} ${relationship.major} equal ${majorAmount} × ${relationship.factor} = ${majorAmount * relationship.factor} ${relationship.minor}. Add ${minorAmount} to get ${answer} ${relationship.minor}.`,
            misconceptionCode: "MIXED_UNITS_ADDED_BEFORE_CONVERSION",
            misconceptionValue: majorAmount + minorAmount,
            misconceptionMessage:
              "You added quantities with different units. Convert the larger unit before combining them.",
            tutorQuestion:
              "How many smaller units are contained in one larger unit?",
            tutorHint:
              "Multiply the larger-unit count by the conversion factor, then add the smaller-unit remainder.",
            reflection:
              "Why must both quantities use the same unit before they are added?",
          }),
        };
      },
    },
    {
      key: "math.inequalities.boundary-depth-choice",
      version: 1,
      targetSkillCode: "MATH.INEQUALITIES",
      questionType: "SINGLE_CHOICE",
      difficulty: "PROFICIENT",
      structureCapacity:
        inequalityContexts.length * inequalityFrames.length * 2,
      generate(random) {
        const context = random.pick(inequalityContexts);
        const frame = random.pick(inequalityFrames);
        const minimum = random.pick([true, false] as const);
        const fixed = random.integer(2, 14);
        const unitAmount = random.integer(3, 9);
        const answer = random.integer(5, 18);
        const remainder = random.integer(1, unitAmount - 1);
        const target = minimum
          ? fixed + unitAmount * (answer - 1) + remainder
          : fixed + unitAmount * answer + remainder;
        const candidateValues = minimum
          ? {
              correct: answer,
              boundary: answer - 1,
              direction: answer - 2,
              operation: answer - 3,
            }
          : {
              correct: answer,
              boundary: answer + 1,
              direction: answer + 2,
              operation: answer + 3,
            };
        const relation = minimum ? "at least" : "no more than";
        return {
          structureKey: `${slug(context.thing)}.${frame.key}.${minimum ? "minimum" : "maximum"}`,
          parameters: {
            fixed,
            unitAmount,
            answer,
            target,
            minimum,
          },
          candidate: inequalityCandidate(random, {
            prompt: frame.render({
              ...context,
              fixed,
              unitAmount,
              target,
              relation,
              relationSymbol: minimum ? "≥" : "≤",
              boundary: minimum ? "least" : "greatest",
            }),
            candidateValues,
            explanation: minimum
              ? `Solve ${fixed} + ${unitAmount}x ≥ ${target}. After subtracting ${fixed}, x must be at least ${(target - fixed) / unitAmount}. The least whole number that works is ${answer}.`
              : `Solve ${fixed} + ${unitAmount}x ≤ ${target}. After subtracting ${fixed}, x must be no more than ${(target - fixed) / unitAmount}. The greatest whole number that works is ${answer}.`,
            misconceptionMessage: minimum
              ? "You rounded down even though the minimum target would not be reached."
              : "You rounded up even though that count exceeds the maximum target.",
          }),
        };
      },
    },
  ];

function singleChoiceCandidate(
  random: SeededRandom,
  input: {
    prompt: string;
    answer: number;
    wrongAnswers: readonly [number, number, number];
    expression: RpnExpression;
    learningObjective: string;
    difficulty: GeneratedCandidate["difficulty"];
    difficultyRationale: string;
    estimatedSeconds: number;
    calculatorPolicy: GeneratedCandidate["calculatorPolicy"];
    explanation: string;
    misconceptionCode: string;
    misconceptionMessage: string;
    distractorExplanations: readonly [string, string, string];
    tutorQuestion: string;
    tutorHint: string;
    reflection: string;
  },
): GeneratedCandidate {
  const values = [input.answer, ...input.wrongAnswers];
  if (new Set(values.map(formatNumber)).size !== values.length) {
    throw new Error("Single-choice template produced duplicate choices.");
  }
  return {
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: input.prompt,
      choices: random.shuffle([
        { id: "correct", content: formatNumber(input.answer) },
        { id: "misconception", content: formatNumber(input.wrongAnswers[0]) },
        { id: "nearby", content: formatNumber(input.wrongAnswers[1]) },
        { id: "operation-error", content: formatNumber(input.wrongAnswers[2]) },
      ]),
      answerSpec: { type: "single_choice", choiceId: "correct" },
      explanation: input.explanation,
      distractorRationales: {
        misconception: input.distractorExplanations[0],
        nearby: input.distractorExplanations[1],
        "operation-error": input.distractorExplanations[2],
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: input.expression,
      tolerance: 1e-9,
    },
    learningObjective: input.learningObjective,
    difficulty: input.difficulty,
    difficultyRationale: input.difficultyRationale,
    estimatedSeconds: input.estimatedSeconds,
    calculatorPolicy: input.calculatorPolicy,
    commonMisconceptions: [input.misconceptionCode],
    misconceptionRules: [
      {
        id: "selects-primary-misconception",
        kind: "selected_choice",
        code: input.misconceptionCode,
        choiceId: "misconception",
        learnerMessage: input.misconceptionMessage,
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "identify-relationship",
          kind: "SOCRATIC_QUESTION",
          content: input.tutorQuestion,
        },
        { id: "apply-relationship", kind: "HINT", content: input.tutorHint },
      ],
      reflectionPrompt: input.reflection,
    },
  };
}

function numericCandidate(input: {
  prompt: string;
  answer: number;
  unit: string;
  expression: RpnExpression;
  learningObjective: string;
  difficulty: GeneratedCandidate["difficulty"];
  difficultyRationale: string;
  estimatedSeconds: number;
  calculatorPolicy: GeneratedCandidate["calculatorPolicy"];
  explanation: string;
  misconceptionCode: string;
  misconceptionValue: number;
  misconceptionMessage: string;
  tutorQuestion: string;
  tutorHint: string;
  reflection: string;
}): GeneratedCandidate {
  return {
    content: {
      questionType: "NUMERIC",
      prompt: input.prompt,
      answerSpec: {
        type: "numeric",
        value: input.answer,
        tolerance: 1e-9,
        toleranceMode: "absolute",
        unit: input.unit,
        acceptedUnits: [],
        unitRequired: true,
      },
      explanation: input.explanation,
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: input.expression,
      tolerance: 1e-9,
    },
    learningObjective: input.learningObjective,
    difficulty: input.difficulty,
    difficultyRationale: input.difficultyRationale,
    estimatedSeconds: input.estimatedSeconds,
    calculatorPolicy: input.calculatorPolicy,
    commonMisconceptions: [input.misconceptionCode],
    misconceptionRules: [
      {
        id: "primary-numeric-misconception",
        kind: "numeric_value",
        code: input.misconceptionCode,
        value: input.misconceptionValue,
        tolerance: 1e-9,
        learnerMessage: input.misconceptionMessage,
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "identify-relationship",
          kind: "SOCRATIC_QUESTION",
          content: input.tutorQuestion,
        },
        { id: "apply-relationship", kind: "HINT", content: input.tutorHint },
      ],
      reflectionPrompt: input.reflection,
    },
  };
}

function inequalityCandidate(
  random: SeededRandom,
  input: {
    prompt: string;
    candidateValues: Record<
      "correct" | "boundary" | "direction" | "operation",
      number
    >;
    explanation: string;
    misconceptionMessage: string;
  },
): GeneratedCandidate {
  return {
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: input.prompt,
      choices: random.shuffle(
        Object.entries(input.candidateValues).map(([id, value]) => ({
          id,
          content: String(value),
        })),
      ),
      answerSpec: { type: "single_choice", choiceId: "correct" },
      explanation: input.explanation,
      distractorRationales: {
        boundary:
          "This adjacent whole number falls on the wrong side of the practical boundary.",
        direction:
          "This moves farther in the direction that violates the inequality.",
        operation:
          "This value does not satisfy the original inequality when substituted.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [input.candidateValues.correct],
      tolerance: 0,
    },
    learningObjective:
      "Interpret the whole-number boundary of a one-variable inequality in context.",
    difficulty: "PROFICIENT",
    difficultyRationale:
      "The learner must solve an inequality and round in the direction required by a practical minimum or maximum.",
    estimatedSeconds: 100,
    calculatorPolicy: "NOT_NEEDED",
    commonMisconceptions: ["INEQUALITY_BOUNDARY_ROUNDED_WRONG"],
    misconceptionRules: [
      {
        id: "selects-adjacent-boundary",
        kind: "selected_choice",
        code: "INEQUALITY_BOUNDARY_ROUNDED_WRONG",
        choiceId: "boundary",
        learnerMessage: input.misconceptionMessage,
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "interpret-boundary",
          kind: "SOCRATIC_QUESTION",
          content:
            "Does the context require the first whole number that reaches a minimum or the last whole number below a maximum?",
        },
        {
          id: "test-neighbors",
          kind: "HINT",
          content:
            "Substitute the boundary candidate and its adjacent whole number into the original inequality.",
        },
      ],
      reflectionPrompt:
        "How does testing the boundary and the adjacent whole number prove the answer?",
    },
  };
}

function formatNumber(value: number) {
  return Number.parseFloat(value.toFixed(6)).toString();
}

function slug(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}
