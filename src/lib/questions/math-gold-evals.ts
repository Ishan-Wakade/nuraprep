import type { MathVerificationSpec, QuestionContent } from "./contracts";

export type MathGoldEvaluationCase = {
  id: string;
  skillCode: string;
  reviewStatus: "ENGINEERING_DRAFT";
  alignmentRationale: string;
  content: QuestionContent;
  verificationSpec: MathVerificationSpec;
};

function numericCase(input: {
  id: string;
  skillCode: string;
  prompt: string;
  value: number;
  expression?: MathVerificationSpec & { kind: "numeric_result" };
  data?: MathVerificationSpec & { kind: "data_result" };
  explanation: string;
  alignmentRationale: string;
  unit?: string;
}): MathGoldEvaluationCase {
  return {
    id: input.id,
    skillCode: input.skillCode,
    reviewStatus: "ENGINEERING_DRAFT",
    alignmentRationale: input.alignmentRationale,
    content: {
      questionType: "NUMERIC",
      prompt: input.prompt,
      answerSpec: {
        type: "numeric",
        value: input.value,
        tolerance: 0,
        toleranceMode: "absolute",
        unit: input.unit,
        acceptedUnits: [],
        unitRequired: Boolean(input.unit),
      },
      explanation: input.explanation,
      distractorRationales: {},
    },
    verificationSpec: input.expression ?? input.data!,
  };
}

export const mathGoldEvaluationCases: MathGoldEvaluationCase[] = [
  numericCase({
    id: "gold-arithmetic-addition-v1",
    skillCode: "MATH.ARITHMETIC",
    prompt:
      "A supply cabinet holds 37 sealed dressings. A delivery adds 28 more. How many sealed dressings are now in the cabinet?",
    value: 65,
    expression: {
      kind: "numeric_result",
      expression: [37, 28, "add"],
      tolerance: 0,
    },
    explanation: "Add the existing and delivered quantities: 37 + 28 = 65.",
    alignmentRationale:
      "Exercises whole-number addition in a direct one-step context.",
  }),
  numericCase({
    id: "gold-fraction-decimal-v1",
    skillCode: "MATH.FRACTIONS_DECIMALS_PERCENT",
    prompt: "Write 3/8 as a decimal.",
    value: 0.375,
    expression: {
      kind: "numeric_result",
      expression: [3, 8, "divide"],
      tolerance: 0,
    },
    explanation: "Divide the numerator by the denominator: 3 ÷ 8 = 0.375.",
    alignmentRationale:
      "Exercises conversion from a proper fraction to a terminating decimal.",
  }),
  numericCase({
    id: "gold-ratio-proportion-v1",
    skillCode: "MATH.RATIOS_PROPORTIONS",
    prompt:
      "A mixture uses 5 milliliters of concentrate for every 8 milliliters of water. How many milliliters of concentrate correspond to 40 milliliters of water?",
    value: 25,
    expression: {
      kind: "numeric_result",
      expression: [40, 5, "multiply", 8, "divide"],
      tolerance: 0,
    },
    explanation:
      "Scale 8 milliliters of water to 40 by a factor of 5, then scale 5 milliliters of concentrate by 5: 25 milliliters.",
    alignmentRationale:
      "Exercises a proportional scale factor with whole-number results.",
    unit: "mL",
  }),
  numericCase({
    id: "gold-unit-conversion-v1",
    skillCode: "MATH.UNIT_CONVERSIONS",
    prompt: "Convert 2.4 liters to milliliters.",
    value: 2400,
    expression: {
      kind: "numeric_result",
      expression: [2.4, 1000, "multiply"],
      tolerance: 0,
    },
    explanation:
      "One liter is 1,000 milliliters, so 2.4 × 1,000 = 2,400 milliliters.",
    alignmentRationale:
      "Exercises a metric volume conversion using a known conversion factor.",
    unit: "mL",
  }),
  numericCase({
    id: "gold-algebraic-expression-v1",
    skillCode: "MATH.ALGEBRAIC_EXPRESSIONS",
    prompt: "Evaluate 3x + 5 when x = 4.",
    value: 17,
    expression: {
      kind: "numeric_result",
      expression: [3, 4, "multiply", 5, "add"],
      tolerance: 0,
    },
    explanation:
      "Substitute 4 for x, multiply first, and add: 3(4) + 5 = 12 + 5 = 17.",
    alignmentRationale:
      "Exercises substitution and order of operations in a linear expression.",
  }),
  numericCase({
    id: "gold-linear-equation-v1",
    skillCode: "MATH.LINEAR_EQUATIONS",
    prompt: "Solve 4x + 6 = 30 for x.",
    value: 6,
    expression: {
      kind: "numeric_result",
      expression: [30, 6, "subtract", 4, "divide"],
      tolerance: 0,
    },
    explanation:
      "Subtract 6 from both sides to get 4x = 24, then divide by 4: x = 6.",
    alignmentRationale:
      "Exercises a two-step linear equation with one variable.",
  }),
  numericCase({
    id: "gold-inequality-v1",
    skillCode: "MATH.INEQUALITIES",
    prompt: "What is the least integer x that satisfies 2x + 3 > 9?",
    value: 4,
    expression: { kind: "numeric_result", expression: [4], tolerance: 0 },
    explanation:
      "Subtract 3 to get 2x > 6, then divide by 2 to get x > 3. The least integer greater than 3 is 4.",
    alignmentRationale:
      "Exercises solving and interpreting a one-variable inequality over integers.",
  }),
  numericCase({
    id: "gold-word-problem-v1",
    skillCode: "MATH.WORD_PROBLEMS",
    prompt:
      "Three identical notebooks cost $7.50 each. What is the total cost before tax?",
    value: 22.5,
    expression: {
      kind: "numeric_result",
      expression: [3, 7.5, "multiply"],
      tolerance: 0,
    },
    explanation:
      "Multiply the number of notebooks by the price of each notebook: 3 × $7.50 = $22.50.",
    alignmentRationale:
      "Exercises translating a purchase context into multiplication with money.",
  }),
  numericCase({
    id: "gold-measurement-elapsed-time-v1",
    skillCode: "MATH.MEASUREMENT",
    prompt:
      "A study session begins at 1:35 p.m. and ends at 3:10 p.m. How many minutes does it last?",
    value: 95,
    expression: {
      kind: "numeric_result",
      expression: [
        3,
        60,
        "multiply",
        10,
        "add",
        1,
        60,
        "multiply",
        35,
        "add",
        "subtract",
      ],
      tolerance: 0,
    },
    explanation:
      "From 1:35 to 2:35 is 60 minutes, and from 2:35 to 3:10 is 35 minutes, for 95 minutes total.",
    alignmentRationale:
      "Exercises elapsed-time measurement across an hour boundary.",
    unit: "minutes",
  }),
  numericCase({
    id: "gold-geometry-triangle-area-v1",
    skillCode: "MATH.GEOMETRY",
    prompt:
      "A triangle has a base of 12 centimeters and a perpendicular height of 9 centimeters. What is its area?",
    value: 54,
    expression: {
      kind: "numeric_result",
      expression: [12, 9, "multiply", 2, "divide"],
      tolerance: 0,
    },
    explanation:
      "Use A = one-half × base × height: (12 × 9) ÷ 2 = 54 square centimeters.",
    alignmentRationale:
      "Exercises area of a triangle using a stated base and perpendicular height.",
    unit: "cm²",
  }),
  numericCase({
    id: "gold-data-median-v1",
    skillCode: "MATH.DATA_INTERPRETATION",
    prompt: "Find the median of the values 8, 11, 9, 14, and 10.",
    value: 10,
    data: {
      kind: "data_result",
      operation: "median",
      values: [8, 11, 9, 14, 10],
      tolerance: 0,
    },
    explanation:
      "Order the values as 8, 9, 10, 11, 14. The middle value is 10.",
    alignmentRationale:
      "Exercises ordering a small data set and identifying its median.",
  }),
  numericCase({
    id: "gold-probability-v1",
    skillCode: "MATH.PROBABILITY_STATISTICS",
    prompt:
      "A container holds 24 tokens, and 6 are green. If one token is chosen at random, what is the probability of choosing a green token? Enter a decimal.",
    value: 0.25,
    expression: {
      kind: "numeric_result",
      expression: [6, 24, "divide"],
      tolerance: 0,
    },
    explanation:
      "The probability is favorable outcomes divided by total outcomes: 6/24 = 1/4 = 0.25.",
    alignmentRationale: "Exercises simple probability as a ratio and decimal.",
  }),
];
