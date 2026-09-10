import { createHash } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "dotenv";
import { Pool } from "pg";

import reviewedMathBankJson from "../src/content/reviewed-math-bank.json";
import {
  examSpecifications,
  generationRuns,
  generationTemplates,
  questionPublications,
  questions,
  questionVersionSources,
  questionVersions,
  reviewDecisions,
  skillPrerequisites,
  skills,
  sourceArtifacts,
  validationRuns,
  validatorRules,
} from "../src/db/schema";
import {
  tutorGuidanceSchema,
  type MathVerificationSpec,
  type MisconceptionRule,
  type QuestionContent,
  type TutorGuidance,
} from "../src/lib/questions/contracts";
import {
  ALL_QUESTION_VALIDATORS,
  REQUIRED_PUBLICATION_VALIDATORS,
  validateMathVerification,
  validateMisconceptionRules,
  validateQuestionContent,
} from "../src/lib/questions/validation";
import {
  DIFFICULTY_RUBRIC_VERSION,
  EXPLANATION_RUBRIC,
  EXPLANATION_RUBRIC_VERSION,
  INTERNAL_DIFFICULTY_RUBRIC,
} from "../src/lib/questions/review-rubrics";
import { reviewedMathBankSnapshotSchema } from "../src/lib/questions/reviewed-bank-snapshot";

config({ path: ".env.local", quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const reviewedMathBank =
  reviewedMathBankSnapshotSchema.parse(reviewedMathBankJson);

const ids = {
  examSpecification: "10000000-0000-4000-8000-000000000001",
  numbersAlgebra: "11000000-0000-4000-8000-000000000001",
  measurementData: "11000000-0000-4000-8000-000000000002",
  arithmetic: "11000000-0000-4000-8000-000000000010",
  fractionsDecimalsPercent: "11000000-0000-4000-8000-000000000011",
  ratiosProportions: "11000000-0000-4000-8000-000000000012",
  conversions: "11000000-0000-4000-8000-000000000013",
  algebraicExpressions: "11000000-0000-4000-8000-000000000014",
  linearEquations: "11000000-0000-4000-8000-000000000015",
  inequalities: "11000000-0000-4000-8000-000000000016",
  wordProblems: "11000000-0000-4000-8000-000000000017",
  measurement: "11000000-0000-4000-8000-000000000020",
  geometry: "11000000-0000-4000-8000-000000000021",
  dataInterpretation: "11000000-0000-4000-8000-000000000022",
  probabilityStatistics: "11000000-0000-4000-8000-000000000023",
  examDetailsSource: "12000000-0000-4000-8000-000000000001",
  contentOutlineSource: "12000000-0000-4000-8000-000000000002",
  atiPracticeTestSource: "12000000-0000-4000-8000-000000000003",
  mometrixPracticeSource: "12000000-0000-4000-8000-000000000004",
  unionPracticeSource: "12000000-0000-4000-8000-000000000005",
  teasPracticeTestSource: "12000000-0000-4000-8000-000000000006",
} as const;

type SeedQuestion = {
  questionId: string;
  versionId: string;
  slug: string;
  primarySkillId: string;
  learningObjective: string;
  difficulty: "FOUNDATIONAL" | "DEVELOPING" | "PROFICIENT" | "ADVANCED";
  difficultyRationale: string;
  estimatedSeconds: number;
  calculatorPolicy: "ALLOWED" | "NOT_ALLOWED" | "NOT_NEEDED";
  misconceptions: string[];
  misconceptionRules?: MisconceptionRule[];
  tutorGuidance?: TutorGuidance;
  content: QuestionContent;
  verificationSpec: MathVerificationSpec;
};

const seedQuestions: SeedQuestion[] = [
  {
    questionId: "13000000-0000-4000-8000-000000000001",
    versionId: "14000000-0000-4000-8000-000000000001",
    slug: "whole-number-groups-001",
    primarySkillId: ids.arithmetic,
    learningObjective: "Multiply whole numbers in a one-step context.",
    difficulty: "FOUNDATIONAL",
    difficultyRationale:
      "Requires one direct whole-number multiplication step.",
    estimatedSeconds: 55,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["ADDS_INSTEAD_OF_MULTIPLIES", "PLACE_VALUE_ERROR"],
    misconceptionRules: [
      {
        id: "adds-groups-and-size",
        code: "ADDS_INSTEAD_OF_MULTIPLIES",
        learnerMessage:
          "You may have added the number of groups and the amount in each group. Reframe the situation as equal groups and multiply.",
        kind: "selected_choice",
        choiceId: "a",
      },
      {
        id: "place-value-product-error",
        code: "PLACE_VALUE_ERROR",
        learnerMessage:
          "Your choice is close to the product, which can signal a place-value error. Check each partial product by place.",
        kind: "selected_choice",
        choiceId: "d",
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "identify-structure",
          kind: "SOCRATIC_QUESTION",
          content:
            "What operation represents several equal groups of the same size?",
        },
        {
          id: "name-factors",
          kind: "HINT",
          content:
            "Treat the number of cartons and notebooks per carton as the two factors, then multiply carefully by place value.",
        },
      ],
      reflectionPrompt:
        "How would your setup change if one more carton were added while the number of notebooks per carton stayed the same?",
    },
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "A community center packs 24 supply boxes with 18 notebooks in each box. How many notebooks are packed in all?",
      choices: [
        { id: "a", content: "42" },
        { id: "b", content: "192" },
        { id: "c", content: "432" },
        { id: "d", content: "442" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "The total is the number of boxes multiplied by the notebooks per box: 24 × 18 = 432.",
      distractorRationales: {
        a: "This adds the two quantities instead of multiplying them.",
        b: "This uses 8 rather than 18 notebooks per box.",
        d: "This reflects a place-value error in the multiplication.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [24, 18, "multiply"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000002",
    versionId: "14000000-0000-4000-8000-000000000002",
    slug: "fraction-to-decimal-001",
    primarySkillId: ids.fractionsDecimalsPercent,
    learningObjective: "Convert a fraction to its decimal equivalent.",
    difficulty: "FOUNDATIONAL",
    difficultyRationale: "Uses a familiar fraction and direct division.",
    estimatedSeconds: 45,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["DIVIDES_NUMERATOR_INCORRECTLY"],
    tutorGuidance: tutorGuidance(
      "What operation converts a fraction into a decimal?",
      "Divide 7 by 8; an equivalent-denominator method can also rewrite the fraction in thousandths.",
      "How can multiplying your decimal by 8 check the conversion?",
    ),
    content: {
      questionType: "NUMERIC",
      prompt: "Write 7/8 as a decimal.",
      answerSpec: {
        type: "numeric",
        value: 0.875,
        tolerance: 0,
        toleranceMode: "absolute",
        acceptedUnits: [],
        unitRequired: false,
      },
      explanation: "Divide the numerator by the denominator: 7 ÷ 8 = 0.875.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [7, 8, "divide"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000003",
    versionId: "14000000-0000-4000-8000-000000000003",
    slug: "equivalent-ratios-001",
    primarySkillId: ids.ratiosProportions,
    learningObjective: "Identify ratios equivalent to a given ratio.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires checking several ratios and selecting every valid result.",
    estimatedSeconds: 75,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: [
      "ADDS_SAME_AMOUNT_TO_BOTH_TERMS",
      "SELECTS_ONLY_ONE_VALID_RATIO",
    ],
    tutorGuidance: tutorGuidance(
      "What must happen to both terms for a ratio to remain equivalent?",
      "Simplify each option or compare each quotient with 3 divided by 5.",
      "Why does adding the same number to both terms usually change a ratio?",
    ),
    content: {
      questionType: "MULTIPLE_SELECT",
      prompt: "Which ratios are equivalent to 3:5? Select all that apply.",
      choices: [
        { id: "a", content: "6:10" },
        { id: "b", content: "9:12" },
        { id: "c", content: "12:20" },
        { id: "d", content: "15:30" },
      ],
      answerSpec: { type: "multiple_select", choiceIds: ["a", "c"] },
      explanation:
        "Multiplying both terms of 3:5 by the same number gives 6:10 and 12:20. The other ratios simplify to different values.",
      distractorRationales: {
        b: "9:12 simplifies to 3:4, not 3:5.",
        d: "15:30 simplifies to 1:2, not 3:5.",
      },
    },
    verificationSpec: {
      kind: "choice_equivalence",
      target: [3, 5, "divide"],
      candidates: {
        a: [6, 10, "divide"],
        b: [9, 12, "divide"],
        c: [12, 20, "divide"],
        d: [15, 30, "divide"],
      },
      tolerance: 1e-9,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000004",
    versionId: "14000000-0000-4000-8000-000000000004",
    slug: "decimal-order-001",
    primarySkillId: ids.fractionsDecimalsPercent,
    learningObjective: "Order decimal values from least to greatest.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires comparing decimals with different numbers of written places.",
    estimatedSeconds: 65,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["COMPARES_DIGIT_COUNT_INSTEAD_OF_PLACE_VALUE"],
    tutorGuidance: tutorGuidance(
      "How could writing every decimal to the thousandths place make comparison easier?",
      "Compare the tenths first, then hundredths, then thousandths.",
      "Why do trailing zeros to the right of a decimal not change its value?",
    ),
    content: {
      questionType: "ORDERED_RESPONSE",
      prompt: "Arrange the values from least to greatest.",
      choices: [
        { id: "a", content: "0.62" },
        { id: "b", content: "0.602" },
        { id: "c", content: "0.206" },
        { id: "d", content: "0.26" },
      ],
      answerSpec: { type: "ordered_response", itemIds: ["c", "d", "b", "a"] },
      explanation:
        "Write each value to the thousandths place: 0.620, 0.602, 0.206, and 0.260. Then compare from left to right.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "ordered_values",
      values: { a: 0.62, b: 0.602, c: 0.206, d: 0.26 },
      direction: "ascending",
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000005",
    versionId: "14000000-0000-4000-8000-000000000005",
    slug: "table-median-001",
    primarySkillId: ids.dataInterpretation,
    learningObjective: "Read a table and determine the median of a data set.",
    difficulty: "PROFICIENT",
    difficultyRationale:
      "Requires extracting five values, ordering them, and identifying the middle value.",
    estimatedSeconds: 90,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["COMPUTES_MEAN_INSTEAD_OF_MEDIAN", "DOES_NOT_ORDER_DATA"],
    tutorGuidance: tutorGuidance(
      "What should you do to the five counts before locating their middle value?",
      "Order the counts from least to greatest and select the third value.",
      "Why is the median unchanged by how the rows were originally arranged?",
    ),
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: "What is the median number of books returned per hour?",
      stimulus: {
        type: "table",
        caption: "Books returned to a library drop box",
        columns: ["Hour", "Books returned"],
        rows: [
          ["1", "14"],
          ["2", "9"],
          ["3", "18"],
          ["4", "11"],
          ["5", "13"],
        ],
      },
      choices: [
        { id: "a", content: "11" },
        { id: "b", content: "13" },
        { id: "c", content: "14" },
        { id: "d", content: "15" },
      ],
      answerSpec: { type: "single_choice", choiceId: "b" },
      explanation:
        "Order the counts: 9, 11, 13, 14, 18. The middle value is 13.",
      distractorRationales: {
        a: "11 is below the middle value after the data are ordered.",
        c: "14 is above the middle value after the data are ordered.",
        d: "15 does not represent the middle value and may result from an averaging error.",
      },
    },
    verificationSpec: {
      kind: "data_result",
      operation: "median",
      values: [14, 9, 18, 11, 13],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000006",
    versionId: "14000000-0000-4000-8000-000000000006",
    slug: "rectangle-perimeter-001",
    primarySkillId: ids.geometry,
    learningObjective: "Find a missing rectangle dimension from its perimeter.",
    difficulty: "PROFICIENT",
    difficultyRationale:
      "Requires translating a perimeter statement and solving for an unknown dimension.",
    estimatedSeconds: 95,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["USES_AREA_FORMULA", "FORGETS_PAIRED_SIDES"],
    tutorGuidance: tutorGuidance(
      "How does the perimeter account for both lengths and both widths?",
      "Subtract twice the length from 54, then divide the remaining paired-width total by 2.",
      "How can adding all four side lengths verify the width?",
    ),
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "A rectangular garden has a perimeter of 54 feet and a length of 16 feet. What is the garden's width?",
      choices: [
        { id: "a", content: "11 feet" },
        { id: "b", content: "19 feet" },
        { id: "c", content: "22 feet" },
        { id: "d", content: "38 feet" },
      ],
      answerSpec: { type: "single_choice", choiceId: "a" },
      explanation:
        "Use 54 = 2(16) + 2w. Subtract 32 to get 22 = 2w, then divide by 2: w = 11 feet.",
      distractorRationales: {
        b: "This subtracts one length from the perimeter before dividing, but both lengths must be removed.",
        c: "This is the combined length of the two width sides, not one width.",
        d: "This subtracts one length from the perimeter and stops before accounting for paired sides.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [54, 2, 16, "multiply", "subtract", 2, "divide"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000007",
    versionId: "14000000-0000-4000-8000-000000000007",
    slug: "metric-volume-conversion-001",
    primarySkillId: ids.conversions,
    learningObjective: "Convert liters to milliliters.",
    difficulty: "FOUNDATIONAL",
    difficultyRationale:
      "Requires one direct metric conversion using a stated base relationship.",
    estimatedSeconds: 55,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["DIVIDES_WHEN_CONVERTING_TO_SMALLER_UNITS"],
    misconceptionRules: [
      {
        id: "divides-liters-by-thousand",
        code: "DIVIDES_WHEN_CONVERTING_TO_SMALLER_UNITS",
        learnerMessage:
          "You may have divided by 1,000. A liter contains many milliliters, so converting liters to the smaller unit makes the number larger.",
        kind: "selected_choice",
        choiceId: "a",
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "recall-liter-relationship",
          kind: "SOCRATIC_QUESTION",
          content: "How many milliliters are in 1 liter?",
        },
        {
          id: "scale-by-thousand",
          kind: "HINT",
          content:
            "Because milliliters are smaller units, multiply the number of liters by 1,000.",
        },
      ],
      reflectionPrompt:
        "Why should the numerical value increase when the same volume is expressed in milliliters?",
    },
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "A dispenser contains 2.35 liters of cleaning solution. How many milliliters of solution does it contain?",
      choices: [
        { id: "a", content: "0.00235 mL" },
        { id: "b", content: "235 mL" },
        { id: "c", content: "2,350 mL" },
        { id: "d", content: "23,500 mL" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "Use the conversion factor 1,000 mL/1 L: 2.35 L × (1,000 mL/1 L) = 2,350 mL. The liter units cancel, leaving milliliters.",
      distractorRationales: {
        a: "This divides by 1,000 instead of multiplying by 1,000.",
        b: "This moves the decimal only two places rather than three.",
        d: "This multiplies by 10,000 rather than 1,000.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [2.35, 1_000, "multiply"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000008",
    versionId: "14000000-0000-4000-8000-000000000008",
    slug: "evaluate-linear-expression-001",
    primarySkillId: ids.algebraicExpressions,
    learningObjective:
      "Evaluate a linear algebraic expression for a given variable value.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires substituting a value and then applying the order of operations across two linked calculations.",
    estimatedSeconds: 55,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["ADDS_BEFORE_MULTIPLYING", "OMITS_CONSTANT_TERM"],
    misconceptionRules: [
      {
        id: "adds-n-and-constant-first",
        code: "ADDS_BEFORE_MULTIPLYING",
        learnerMessage:
          "You may have added 7 and 8 before multiplying. After substituting, multiplication comes before addition.",
        kind: "selected_choice",
        choiceId: "d",
      },
      {
        id: "omits-expression-constant",
        code: "OMITS_CONSTANT_TERM",
        learnerMessage:
          "You found the product but may have stopped before adding the constant term.",
        kind: "selected_choice",
        choiceId: "b",
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "substitute-variable",
          kind: "SOCRATIC_QUESTION",
          content: "What expression results when 7 replaces n?",
        },
        {
          id: "apply-operation-order",
          kind: "HINT",
          content: "Complete the multiplication before adding 8.",
        },
      ],
      reflectionPrompt:
        "Which part of the expression changes when the value of n changes?",
    },
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: "What is the value of 3n + 8 when n = 7?",
      choices: [
        { id: "a", content: "18" },
        { id: "b", content: "21" },
        { id: "c", content: "29" },
        { id: "d", content: "45" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "Evaluating an expression means replacing the variable with its given value. Substitute 7 for n, then follow the order of operations: multiply before adding. This gives 3(7) + 8 = 21 + 8 = 29.",
      distractorRationales: {
        a: "This does not correctly evaluate both terms after substitution.",
        b: "This calculates 3 × 7 but omits the added 8.",
        d: "This adds 7 and 8 before multiplying by 3.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [3, 7, "multiply", 8, "add"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000009",
    versionId: "14000000-0000-4000-8000-000000000009",
    slug: "solve-two-step-equation-001",
    primarySkillId: ids.linearEquations,
    learningObjective: "Solve a two-step linear equation in one variable.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires reversing two operations while preserving equality.",
    estimatedSeconds: 70,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["REVERSES_OPERATIONS_IN_WRONG_ORDER"],
    misconceptionRules: [
      {
        id: "divides-before-removing-constant",
        code: "REVERSES_OPERATIONS_IN_WRONG_ORDER",
        learnerMessage:
          "You may have divided before removing the added constant. Undo the +7 first, then undo multiplication by 5.",
        kind: "numeric_value",
        value: 1.4,
        tolerance: 0,
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "isolate-variable-term",
          kind: "SOCRATIC_QUESTION",
          content: "What operation will remove 7 from the left side?",
        },
        {
          id: "undo-coefficient",
          kind: "HINT",
          content:
            "After subtracting 7 from both sides, divide both sides by the coefficient of x.",
        },
      ],
      reflectionPrompt:
        "How can substituting your result back into the original equation verify it?",
    },
    content: {
      questionType: "NUMERIC",
      prompt: "Solve 5x + 7 = 42 for x.",
      answerSpec: {
        type: "numeric",
        value: 7,
        tolerance: 0,
        toleranceMode: "absolute",
        acceptedUnits: [],
        unitRequired: false,
      },
      explanation:
        "Subtract 7 from both sides to get 5x = 35. Divide both sides by 5, so x = 7.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [42, 7, "subtract", 5, "divide"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000010",
    versionId: "14000000-0000-4000-8000-000000000010",
    slug: "test-linear-inequality-value-001",
    primarySkillId: ids.inequalities,
    learningObjective: "Determine which value satisfies a linear inequality.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires evaluating the inequality for candidate values and interpreting a strict comparison.",
    estimatedSeconds: 75,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["TREATS_STRICT_INEQUALITY_AS_EQUALITY"],
    misconceptionRules: [
      {
        id: "selects-equality-boundary",
        code: "TREATS_STRICT_INEQUALITY_AS_EQUALITY",
        learnerMessage:
          "You selected the boundary value, but the symbol < excludes values that make the two sides equal.",
        kind: "selected_choice",
        choiceId: "b",
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "find-boundary-value",
          kind: "SOCRATIC_QUESTION",
          content: "What value of x makes 3x + 2 exactly equal to 17?",
        },
        {
          id: "interpret-strict-symbol",
          kind: "HINT",
          content:
            "The expression must be less than 17, so test a choice below the equality boundary.",
        },
      ],
      reflectionPrompt:
        "How would the set of valid values change if the symbol were less than or equal to?",
    },
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: "Which value of x makes 3x + 2 < 17 true?",
      choices: [
        { id: "a", content: "4" },
        { id: "b", content: "5" },
        { id: "c", content: "6" },
        { id: "d", content: "7" },
      ],
      answerSpec: { type: "single_choice", choiceId: "a" },
      explanation:
        "Substitute each value. When x = 4, 3(4) + 2 = 14, and 14 < 17. The other choices produce 17 or more.",
      distractorRationales: {
        b: "This gives 3(5) + 2 = 17, but 17 is not less than 17.",
        c: "This gives 20, which is greater than 17.",
        d: "This gives 23, which is greater than 17.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [4],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000011",
    versionId: "14000000-0000-4000-8000-000000000011",
    slug: "constant-rate-distance-001",
    primarySkillId: ids.wordProblems,
    learningObjective:
      "Solve a multistep constant-rate word problem using a unit rate.",
    difficulty: "PROFICIENT",
    difficultyRationale:
      "Requires identifying a constant rate, finding a unit rate, and applying it to a new quantity.",
    estimatedSeconds: 95,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["ADDS_QUANTITIES_INSTEAD_OF_SCALING"],
    misconceptionRules: [
      {
        id: "adds-extra-gallons-to-distance",
        code: "ADDS_QUANTITIES_INSTEAD_OF_SCALING",
        learnerMessage:
          "You may have added the change in gallons to the distance. Find miles per gallon first, then scale that rate to 9 gallons.",
        kind: "selected_choice",
        choiceId: "a",
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "find-unit-rate",
          kind: "SOCRATIC_QUESTION",
          content: "How many miles does the shuttle travel per gallon?",
        },
        {
          id: "scale-rate",
          kind: "HINT",
          content: "Multiply the miles-per-gallon rate by 9 gallons.",
        },
      ],
      reflectionPrompt:
        "What assumption about the shuttle's fuel use allows the unit rate to be reused?",
    },
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "A shuttle travels 156 miles using 6 gallons of fuel. At the same rate, how far will it travel using 9 gallons?",
      choices: [
        { id: "a", content: "159 miles" },
        { id: "b", content: "208 miles" },
        { id: "c", content: "234 miles" },
        { id: "d", content: "1,404 miles" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "First find the unit rate: 156 ÷ 6 = 26 miles per gallon. Then multiply: 26 × 9 = 234 miles.",
      distractorRationales: {
        a: "This adds the 3 extra gallons to 156 miles instead of using a constant rate.",
        b: "This does not scale the 6-gallon distance by the factor 9/6.",
        d: "This multiplies 156 directly by 9 without first finding the per-gallon rate.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [156, 6, "divide", 9, "multiply"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000012",
    versionId: "14000000-0000-4000-8000-000000000012",
    slug: "rectangle-area-decimals-001",
    primarySkillId: ids.measurement,
    learningObjective: "Calculate rectangular area from decimal measurements.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires selecting the area relationship, multiplying decimals, and retaining square units.",
    estimatedSeconds: 75,
    calculatorPolicy: "ALLOWED",
    misconceptions: ["ADDS_DIMENSIONS_FOR_AREA", "OMITS_SQUARE_UNITS"],
    misconceptionRules: [
      {
        id: "adds-length-and-width",
        code: "ADDS_DIMENSIONS_FOR_AREA",
        learnerMessage:
          "You may have added the dimensions. Area measures the rectangular surface, so multiply length by width.",
        kind: "selected_choice",
        choiceId: "c",
      },
      {
        id: "reports-linear-unit",
        code: "OMITS_SQUARE_UNITS",
        learnerMessage:
          "Your numerical result is correct, but area must be expressed in square units.",
        kind: "selected_choice",
        choiceId: "b",
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "choose-area-operation",
          kind: "SOCRATIC_QUESTION",
          content: "Which operation combines length and width to find area?",
        },
        {
          id: "track-area-units",
          kind: "HINT",
          content:
            "Multiply 1.8 by 0.75, then label the result in square meters because two lengths were multiplied.",
        },
      ],
      reflectionPrompt:
        "Why are square meters appropriate for area instead of meters?",
    },
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "The rectangular base of a storage bin is 1.8 meters long and 0.75 meter wide. What is the area of the base?",
      choices: [
        { id: "a", content: "0.135 square meter" },
        { id: "b", content: "1.35 meters" },
        { id: "c", content: "2.55 square meters" },
        { id: "d", content: "1.35 square meters" },
      ],
      answerSpec: { type: "single_choice", choiceId: "d" },
      explanation:
        "Area equals length times width: 1.8 × 0.75 = 1.35. Because area covers a surface, the unit is square meters.",
      distractorRationales: {
        a: "This places the decimal one position too far left in the product.",
        b: "The numerical product is correct, but meters are linear units rather than area units.",
        c: "This adds the dimensions instead of multiplying them.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [1.8, 0.75, "multiply"],
      tolerance: 1e-12,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000013",
    versionId: "14000000-0000-4000-8000-000000000013",
    slug: "simple-event-probability-001",
    primarySkillId: ids.probabilityStatistics,
    learningObjective:
      "Calculate the probability of a simple event from equally likely outcomes.",
    difficulty: "FOUNDATIONAL",
    difficultyRationale:
      "Requires identifying favorable and total outcomes and writing their ratio as a decimal.",
    estimatedSeconds: 65,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["USES_NONFAVORABLE_OUTCOMES_AS_NUMERATOR"],
    misconceptionRules: [
      {
        id: "uses-nongreen-count",
        code: "USES_NONFAVORABLE_OUTCOMES_AS_NUMERATOR",
        learnerMessage:
          "You may have counted outcomes that are not green. The numerator should count only the favorable green outcomes.",
        kind: "numeric_value",
        value: 0.7,
        tolerance: 0,
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "count-total-items",
          kind: "SOCRATIC_QUESTION",
          content: "How many tokens are in the bag altogether?",
        },
        {
          id: "form-favorable-ratio",
          kind: "HINT",
          content:
            "Place the number of green tokens over the total number of tokens, then convert the fraction to a decimal.",
        },
      ],
      reflectionPrompt:
        "How can you use the probability of not selecting green to check your answer?",
    },
    content: {
      questionType: "NUMERIC",
      prompt:
        "A bag contains 5 blue tokens, 3 green tokens, and 2 yellow tokens. If one token is selected at random, what is the probability of selecting a green token? Enter the answer as a decimal.",
      answerSpec: {
        type: "numeric",
        value: 0.3,
        tolerance: 0,
        toleranceMode: "absolute",
        acceptedUnits: [],
        unitRequired: false,
      },
      explanation:
        "There are 5 + 3 + 2 = 10 tokens, and 3 are green. The probability is 3/10 = 0.3.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [3, 10, "divide"],
      tolerance: 1e-12,
    },
  },
];

const numbersAndAlgebraExpansion: SeedQuestion[] = [
  {
    questionId: "13000000-0000-4000-8000-000000000014",
    versionId: "14000000-0000-4000-8000-000000000014",
    slug: "order-of-operations-001",
    primarySkillId: ids.arithmetic,
    learningObjective:
      "Evaluate a numerical expression using the order of operations.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires completing division and multiplication before addition.",
    estimatedSeconds: 65,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["EVALUATES_LEFT_TO_RIGHT_ONLY"],
    misconceptionRules: [
      {
        id: "left-to-right-operation-order",
        code: "EVALUATES_LEFT_TO_RIGHT_ONLY",
        learnerMessage:
          "You may have worked strictly from left to right. Complete division and multiplication before addition.",
        kind: "numeric_value",
        value: 45,
        tolerance: 0,
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "identify-priority-operations",
          kind: "SOCRATIC_QUESTION",
          content:
            "Which operations in the expression must be completed before addition?",
        },
        {
          id: "evaluate-products-quotients",
          kind: "HINT",
          content:
            "Evaluate 48 ÷ 6 and 7 × 3 separately, then add those results.",
        },
      ],
      reflectionPrompt:
        "Why does multiplication not automatically come before division when both appear?",
    },
    content: {
      questionType: "NUMERIC",
      prompt: "Evaluate 48 ÷ 6 + 7 × 3.",
      answerSpec: {
        type: "numeric",
        value: 29,
        tolerance: 0,
        toleranceMode: "absolute",
        acceptedUnits: [],
        unitRequired: false,
      },
      explanation:
        "Complete division and multiplication first: 48 ÷ 6 = 8 and 7 × 3 = 21. Then add: 8 + 21 = 29.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [48, 6, "divide", 7, 3, "multiply", "add"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000015",
    versionId: "14000000-0000-4000-8000-000000000015",
    slug: "integer-temperature-change-001",
    primarySkillId: ids.arithmetic,
    learningObjective: "Add a positive change to a negative integer.",
    difficulty: "FOUNDATIONAL",
    difficultyRationale:
      "Requires one signed-number addition in a familiar temperature context.",
    estimatedSeconds: 50,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["IGNORES_NEGATIVE_STARTING_VALUE"],
    misconceptionRules: [
      {
        id: "treats-start-as-positive",
        code: "IGNORES_NEGATIVE_STARTING_VALUE",
        learnerMessage:
          "You may have treated the starting temperature as positive. Begin at −4 on a number line, then move 11 units upward.",
        kind: "selected_choice",
        choiceId: "d",
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "model-on-number-line",
          kind: "SOCRATIC_QUESTION",
          content:
            "If you begin at −4 on a number line, in which direction does an increase move?",
        },
        {
          id: "cross-zero",
          kind: "HINT",
          content:
            "It takes 4 degrees of the increase to reach 0; apply the remaining increase from there.",
        },
      ],
      reflectionPrompt:
        "How much would the temperature need to rise to end at exactly 0°C?",
    },
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "At sunrise, the temperature was −4°C. By noon, it had risen 11°C. What was the temperature at noon?",
      choices: [
        { id: "a", content: "−15 degrees Celsius" },
        { id: "b", content: "−7 degrees Celsius" },
        { id: "c", content: "7 degrees Celsius" },
        { id: "d", content: "15 degrees Celsius" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "An increase of 11°C means add 11: −4 + 11 = 7. The noon temperature was 7°C.",
      distractorRationales: {
        a: "This subtracts the increase from the negative starting value.",
        b: "This reverses the subtraction order and keeps a negative sign.",
        d: "This treats the starting temperature as positive 4°C.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [-4, 11, "add"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000016",
    versionId: "14000000-0000-4000-8000-000000000016",
    slug: "percent-of-quantity-001",
    primarySkillId: ids.fractionsDecimalsPercent,
    learningObjective: "Find a percent of a whole-number quantity.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires converting a percent to a decimal and multiplying.",
    estimatedSeconds: 70,
    calculatorPolicy: "ALLOWED",
    misconceptions: ["USES_PERCENT_AS_WHOLE_NUMBER"],
    misconceptionRules: [
      {
        id: "multiplies-by-thirty-five",
        code: "USES_PERCENT_AS_WHOLE_NUMBER",
        learnerMessage:
          "Convert 35% to 0.35 before multiplying. Percent means per hundred.",
        kind: "numeric_value",
        value: 8400,
        tolerance: 0,
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "convert-percent-decimal",
          kind: "SOCRATIC_QUESTION",
          content: "What decimal is equivalent to 35%?",
        },
        {
          id: "multiply-whole",
          kind: "HINT",
          content: "Multiply 240 by the decimal equivalent of 35%.",
        },
      ],
      reflectionPrompt:
        "How can estimating one third of 240 help you check whether your result is reasonable?",
    },
    content: {
      questionType: "NUMERIC",
      prompt: "What is 35% of 240?",
      answerSpec: {
        type: "numeric",
        value: 84,
        tolerance: 0,
        toleranceMode: "absolute",
        acceptedUnits: [],
        unitRequired: false,
      },
      explanation: "Convert 35% to 0.35, then multiply: 0.35 × 240 = 84.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [35, 100, "divide", 240, "multiply"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000017",
    versionId: "14000000-0000-4000-8000-000000000017",
    slug: "add-mixed-numbers-001",
    primarySkillId: ids.fractionsDecimalsPercent,
    learningObjective: "Add mixed numbers with unlike denominators.",
    difficulty: "PROFICIENT",
    difficultyRationale:
      "Requires finding a common denominator and combining whole and fractional parts.",
    estimatedSeconds: 90,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["ADDS_DENOMINATORS"],
    misconceptionRules: [
      {
        id: "adds-fraction-denominators",
        code: "ADDS_DENOMINATORS",
        learnerMessage:
          "You may have added denominators. Rewrite both fractions with a common denominator before adding their numerators.",
        kind: "selected_choice",
        choiceId: "b",
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "find-common-denominator",
          kind: "SOCRATIC_QUESTION",
          content: "What is the least common denominator of 4 and 3?",
        },
        {
          id: "rewrite-fractions",
          kind: "HINT",
          content:
            "Rewrite 1/4 and 2/3 in twelfths, then add the whole-number and fraction parts.",
        },
      ],
      reflectionPrompt:
        "Why must the fractional parts refer to equal-size pieces before their numerators can be added?",
    },
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: "What is 2 1/4 + 1 2/3?",
      choices: [
        { id: "a", content: "3 3/7" },
        { id: "b", content: "3 3/12" },
        { id: "c", content: "3 11/12" },
        { id: "d", content: "4 1/12" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "The least common denominator of 4 and 3 is 12, so rewrite the fractions in twelfths: 1/4 = 3/12 and 2/3 = 8/12. Then 2 + 1 + 3/12 + 8/12 = 3 11/12.",
      distractorRationales: {
        a: "This adds the numerators and denominators directly.",
        b: "This changes the denominator but does not create equivalent fractions.",
        d: "The fractional parts total 11/12, which is less than one whole.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [2.25, 1, 2, 3, "divide", "add", "add"],
      tolerance: 1e-12,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000018",
    versionId: "14000000-0000-4000-8000-000000000018",
    slug: "solve-proportion-001",
    primarySkillId: ids.ratiosProportions,
    learningObjective: "Solve for a missing value in an equivalent proportion.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires recognizing a scale factor or solving one multiplication-division relationship.",
    estimatedSeconds: 65,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["SCALES_ONLY_ONE_TERM_INCONSISTENTLY"],
    misconceptionRules: [
      {
        id: "adds-denominator-change",
        code: "SCALES_ONLY_ONE_TERM_INCONSISTENTLY",
        learnerMessage:
          "Equivalent ratios multiply both corresponding terms by the same scale factor. Determine how 7 became 35 first.",
        kind: "numeric_value",
        value: 32,
        tolerance: 0,
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "identify-scale-factor",
          kind: "SOCRATIC_QUESTION",
          content: "What number multiplies 7 to produce 35?",
        },
        {
          id: "apply-scale-factor",
          kind: "HINT",
          content:
            "Multiply the corresponding numerator, 4, by that same factor.",
        },
      ],
      reflectionPrompt:
        "How could cross multiplication confirm the value you found?",
    },
    content: {
      questionType: "NUMERIC",
      prompt: "Solve the proportion 4/7 = x/35 for x.",
      answerSpec: {
        type: "numeric",
        value: 20,
        tolerance: 0,
        toleranceMode: "absolute",
        acceptedUnits: [],
        unitRequired: false,
      },
      explanation:
        "Because 7 × 5 = 35, multiply the numerator by the same factor: 4 × 5 = 20. Therefore, x = 20.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [4, 35, "multiply", 7, "divide"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000019",
    versionId: "14000000-0000-4000-8000-000000000019",
    slug: "unit-price-scale-001",
    primarySkillId: ids.ratiosProportions,
    learningObjective: "Use a unit price to scale a proportional cost.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires finding cost per item and scaling it to a new item count.",
    estimatedSeconds: 75,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["MULTIPLIES_TOTAL_COST_WITHOUT_UNIT_RATE"],
    misconceptionRules: [
      {
        id: "multiplies-total-by-new-count",
        code: "MULTIPLIES_TOTAL_COST_WITHOUT_UNIT_RATE",
        learnerMessage:
          "The $18 price covers six items, not one. Find the price of one item before scaling to eleven.",
        kind: "selected_choice",
        choiceId: "d",
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "find-price-per-item",
          kind: "SOCRATIC_QUESTION",
          content: "What is the cost of one filter if six cost $18?",
        },
        {
          id: "scale-to-eleven",
          kind: "HINT",
          content: "Multiply the unit price by 11 filters.",
        },
      ],
      reflectionPrompt:
        "How can you compare your answer with the cost of 12 filters to check it?",
    },
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "Six replacement filters cost $18 at a constant unit price. How much do 11 filters cost?",
      choices: [
        { id: "a", content: "23 dollars" },
        { id: "b", content: "29 dollars" },
        { id: "c", content: "33 dollars" },
        { id: "d", content: "198 dollars" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "The unit price is $18 ÷ 6 = $3 per filter. For 11 filters, $3 × 11 = $33.",
      distractorRationales: {
        a: "This adds the five additional filters to the original total cost.",
        b: "This adds the new item count to the original total cost.",
        d: "This multiplies the six-filter price directly by 11.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [18, 6, "divide", 11, "multiply"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000020",
    versionId: "14000000-0000-4000-8000-000000000020",
    slug: "minutes-to-hours-001",
    primarySkillId: ids.conversions,
    learningObjective: "Convert a duration from minutes to hours.",
    difficulty: "FOUNDATIONAL",
    difficultyRationale:
      "Requires dividing by the familiar relationship of 60 minutes per hour.",
    estimatedSeconds: 55,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["TREATS_BASE_SIXTY_AS_BASE_TEN"],
    misconceptionRules: [
      {
        id: "moves-decimal-for-time",
        code: "TREATS_BASE_SIXTY_AS_BASE_TEN",
        learnerMessage:
          "Time conversion uses 60 minutes per hour, not a decimal-place shift. Divide the minutes by 60.",
        kind: "selected_choice",
        choiceId: "b",
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "recall-minutes-per-hour",
          kind: "SOCRATIC_QUESTION",
          content: "How many minutes make one hour?",
        },
        {
          id: "divide-by-sixty",
          kind: "HINT",
          content: "Divide 150 by 60 to express the duration in hours.",
        },
      ],
      reflectionPrompt:
        "How can 2 hours 30 minutes confirm the decimal-hour result?",
    },
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: "A workshop lasts 150 minutes. How long is it in hours?",
      choices: [
        { id: "a", content: "1.5 hours" },
        { id: "b", content: "2.05 hours" },
        { id: "c", content: "2.5 hours" },
        { id: "d", content: "3.0 hours" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "Use the conversion factor 1 hour/60 minutes: 150 min × (1 hr/60 min) = 2.5 hr. The minute units cancel, and 2.5 hours is 2 hours 30 minutes.",
      distractorRationales: {
        a: "This treats the conversion as a decimal-place change rather than division by 60.",
        b: "This treats 30 minutes as 0.05 hour instead of one-half hour.",
        d: "This rounds up to the next whole hour instead of retaining the half hour.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [150, 60, "divide"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000021",
    versionId: "14000000-0000-4000-8000-000000000021",
    slug: "evaluate-parenthesized-expression-001",
    primarySkillId: ids.algebraicExpressions,
    learningObjective:
      "Evaluate an algebraic expression containing parentheses.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires substitution and correct evaluation of grouping, multiplication, and subtraction.",
    estimatedSeconds: 70,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["IGNORES_GROUPING_SYMBOLS"],
    misconceptionRules: [
      {
        id: "multiplies-only-variable",
        code: "IGNORES_GROUPING_SYMBOLS",
        learnerMessage:
          "The 2 applies to the entire quantity inside parentheses. Evaluate the grouped sum before multiplying.",
        kind: "numeric_value",
        value: 10,
        tolerance: 0,
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "substitute-and-group",
          kind: "SOCRATIC_QUESTION",
          content:
            "After replacing a with 4, what is the value inside parentheses?",
        },
        {
          id: "finish-expression",
          kind: "HINT",
          content: "Multiply the grouped result by 2, then subtract 3.",
        },
      ],
      reflectionPrompt:
        "How would the result differ if the expression were 2a + 5 − 3 instead?",
    },
    content: {
      questionType: "NUMERIC",
      prompt: "Evaluate 2(a + 5) − 3 when a = 4.",
      answerSpec: {
        type: "numeric",
        value: 15,
        tolerance: 0,
        toleranceMode: "absolute",
        acceptedUnits: [],
        unitRequired: false,
      },
      explanation:
        "Substitute 4 for a and evaluate the parentheses first: 2(4 + 5) − 3 = 2(9) − 3 = 15.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [4, 5, "add", 2, "multiply", 3, "subtract"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000022",
    versionId: "14000000-0000-4000-8000-000000000022",
    slug: "solve-linear-equation-subtraction-001",
    primarySkillId: ids.linearEquations,
    learningObjective:
      "Solve a two-step linear equation involving subtraction.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires undoing subtraction and then a whole-number coefficient.",
    estimatedSeconds: 70,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["SUBTRACTS_CONSTANT_FROM_WRONG_SIDE"],
    misconceptionRules: [
      {
        id: "subtracts-six-from-thirty",
        code: "SUBTRACTS_CONSTANT_FROM_WRONG_SIDE",
        learnerMessage:
          "To undo −6, add 6 to both sides. Subtracting 6 again moves farther from isolating the variable term.",
        kind: "numeric_value",
        value: 6,
        tolerance: 0,
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "undo-subtracted-constant",
          kind: "SOCRATIC_QUESTION",
          content: "What inverse operation will undo the −6?",
        },
        {
          id: "divide-coefficient-four",
          kind: "HINT",
          content: "After obtaining 4y = 36, divide both sides by 4.",
        },
      ],
      reflectionPrompt:
        "What value results when your answer is substituted into 4y − 6?",
    },
    content: {
      questionType: "NUMERIC",
      prompt: "Solve 4y − 6 = 30 for y.",
      answerSpec: {
        type: "numeric",
        value: 9,
        tolerance: 0,
        toleranceMode: "absolute",
        acceptedUnits: [],
        unitRequired: false,
      },
      explanation:
        "Add 6 to both sides to get 4y = 36. Divide both sides by 4, so y = 9.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [30, 6, "add", 4, "divide"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000023",
    versionId: "14000000-0000-4000-8000-000000000023",
    slug: "budget-inequality-001",
    primarySkillId: ids.inequalities,
    learningObjective:
      "Interpret a budget constraint as an inequality and identify its greatest whole-number solution.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires translating at most into 7n ≤ 49 and completing one exact division to identify the greatest whole-number solution.",
    estimatedSeconds: 70,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["REVERSES_AT_MOST_INEQUALITY"],
    misconceptionRules: [
      {
        id: "selects-one-above-budget",
        code: "REVERSES_AT_MOST_INEQUALITY",
        learnerMessage:
          "At most means the total cannot exceed the budget. Check the cost of the selected number against $49.",
        kind: "selected_choice",
        choiceId: "c",
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "write-budget-constraint",
          kind: "SOCRATIC_QUESTION",
          content:
            "If n is the number of notebooks, what expression gives their total cost?",
        },
        {
          id: "find-whole-boundary",
          kind: "HINT",
          content:
            "Solve 7n ≤ 49, then choose the greatest whole number that remains within the limit.",
        },
      ],
      reflectionPrompt:
        "Why would one additional notebook violate the budget constraint?",
    },
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "Notebooks cost $7 each. A student can spend at most $49. What is the greatest number of notebooks the student can buy?",
      choices: [
        { id: "a", content: "6 notebooks" },
        { id: "b", content: "7 notebooks" },
        { id: "c", content: "8 notebooks" },
        { id: "d", content: "42 notebooks" },
      ],
      answerSpec: { type: "single_choice", choiceId: "b" },
      explanation:
        "The constraint is 7n ≤ 49. Dividing both sides by 7 gives n ≤ 7, so the greatest possible whole number is 7.",
      distractorRationales: {
        a: "Six notebooks fit the budget, but it is not the greatest possible number.",
        c: "Eight notebooks cost $56, which exceeds the budget.",
        d: "This is the cost of six notebooks, not a number of notebooks that can be bought.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [49, 7, "divide"],
      tolerance: 0,
    },
  },
  {
    questionId: "13000000-0000-4000-8000-000000000024",
    versionId: "14000000-0000-4000-8000-000000000024",
    slug: "sale-price-word-problem-001",
    primarySkillId: ids.wordProblems,
    learningObjective:
      "Solve a percent-discount word problem by subtracting the discount from the original price.",
    difficulty: "PROFICIENT",
    difficultyRationale:
      "Requires finding a percentage amount and distinguishing discount from final price.",
    estimatedSeconds: 90,
    calculatorPolicy: "ALLOWED",
    misconceptions: ["REPORTS_DISCOUNT_AS_FINAL_PRICE"],
    misconceptionRules: [
      {
        id: "returns-discount-amount",
        code: "REPORTS_DISCOUNT_AS_FINAL_PRICE",
        learnerMessage:
          "You found the amount saved. Subtract that discount from the original price to find the sale price.",
        kind: "selected_choice",
        choiceId: "a",
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "find-discount-amount",
          kind: "SOCRATIC_QUESTION",
          content: "How many dollars is 15% of $80?",
        },
        {
          id: "subtract-discount",
          kind: "HINT",
          content:
            "The sale price is the original $80 minus the discount amount.",
        },
      ],
      reflectionPrompt:
        "Why should a 15% discount leave a price that is 85% of the original?",
    },
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "A study lamp originally costs $80 and is discounted by 15%. What is the sale price before tax?",
      choices: [
        { id: "a", content: "12 dollars" },
        { id: "b", content: "65 dollars" },
        { id: "c", content: "68 dollars" },
        { id: "d", content: "92 dollars" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "The discount is 0.15 × $80 = $12. Subtract it from the original price: $80 − $12 = $68.",
      distractorRationales: {
        a: "This is the discount amount, not the sale price.",
        b: "This subtracts 15 dollars rather than 15% of $80.",
        d: "This adds the discount amount instead of subtracting it.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [80, 15, 100, "divide", 80, "multiply", "subtract"],
      tolerance: 0,
    },
  },
];

seedQuestions.push(...numbersAndAlgebraExpansion);

const measurementDataExpansion: SeedQuestion[] = [
  {
    questionId: seedId("13", 25),
    versionId: seedId("14", 25),
    slug: "remaining-length-decimals-001",
    primarySkillId: ids.measurement,
    learningObjective: "Subtract decimal measurements in the same unit.",
    difficulty: "FOUNDATIONAL",
    difficultyRationale:
      "Requires one decimal subtraction after identifying the remaining length.",
    estimatedSeconds: 55,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["ADDS_REMOVED_LENGTH"],
    misconceptionRules: numericMisconception(
      "adds-removed-length",
      "ADDS_REMOVED_LENGTH",
      3.25,
      "Remaining length requires subtraction, not adding the removed piece.",
    ),
    tutorGuidance: tutorGuidance(
      "Which operation finds what remains after a piece is removed?",
      "Align the decimal points in 2.40 − 0.85.",
      "How can adding the removed and remaining lengths check your result?",
    ),
    content: {
      questionType: "NUMERIC",
      prompt:
        "A board is 2.4 meters long. A 0.85-meter piece is cut off. How many meters remain?",
      answerSpec: numericAnswer(1.55, "meters", ["meter", "m"]),
      explanation: "Subtract the removed length: 2.40 − 0.85 = 1.55 meters.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [2.4, 0.85, "subtract"],
      tolerance: 1e-12,
    },
  },
  {
    questionId: seedId("13", 26),
    versionId: seedId("14", 26),
    slug: "combine-liquid-volumes-001",
    primarySkillId: ids.measurement,
    learningObjective: "Add decimal liquid volumes expressed in liters.",
    difficulty: "FOUNDATIONAL",
    difficultyRationale:
      "Requires adding two decimal measurements with the same unit.",
    estimatedSeconds: 50,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["MISALIGNS_DECIMAL_PLACES"],
    misconceptionRules: selectedMisconception(
      "misaligns-volume-decimals",
      "MISALIGNS_DECIMAL_PLACES",
      "b",
      "Align tenths with tenths and hundredths with hundredths before adding.",
    ),
    tutorGuidance: tutorGuidance(
      "Are both quantities already expressed in the same unit?",
      "Write 0.6 as 0.60, align decimal points, and add.",
      "Why is a result smaller than 1.25 liters impossible here?",
    ),
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "A container holds 1.25 liters of water. Another 0.6 liter is added. What is the new volume?",
      choices: [
        { id: "a", content: "1.31 liters" },
        { id: "b", content: "1.45 liters" },
        { id: "c", content: "1.85 liters" },
        { id: "d", content: "7.25 liters" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation: "Write 0.6 as 0.60, then add: 1.25 + 0.60 = 1.85 liters.",
      distractorRationales: {
        a: "This adds the 6 in the hundredths place instead of the tenths place.",
        b: "This does not add six tenths to 1.25 correctly.",
        d: "This treats 0.6 as 6 whole liters.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [1.25, 0.6, "add"],
      tolerance: 1e-12,
    },
  },
  {
    questionId: seedId("13", 27),
    versionId: seedId("14", 27),
    slug: "elapsed-time-001",
    primarySkillId: ids.measurement,
    learningObjective: "Determine elapsed time across an hour boundary.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires decomposing elapsed time across two clock-hour intervals.",
    estimatedSeconds: 70,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["SUBTRACTS_CLOCK_DIGITS_DIRECTLY"],
    misconceptionRules: selectedMisconception(
      "subtracts-time-as-decimal",
      "SUBTRACTS_CLOCK_DIGITS_DIRECTLY",
      "a",
      "Clock minutes use groups of 60, so subtracting the displayed digits as decimals does not measure elapsed time.",
    ),
    tutorGuidance: tutorGuidance(
      "How many minutes pass from 9:35 a.m. to 10:00 a.m.?",
      "Add that interval to the 65 minutes from 10:00 a.m. to 11:05 a.m.",
      "How can 1 hour 30 minutes confirm your answer in minutes?",
    ),
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "A class begins at 9:35 a.m. and ends at 11:05 a.m. How many minutes does the class last?",
      choices: [
        { id: "a", content: "70 minutes" },
        { id: "b", content: "80 minutes" },
        { id: "c", content: "90 minutes" },
        { id: "d", content: "130 minutes" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "From 9:35 to 10:00 is 25 minutes, and from 10:00 to 11:05 is 65 minutes. The total is 90 minutes.",
      distractorRationales: {
        a: "This subtracts the displayed clock digits without accounting for 60 minutes per hour.",
        b: "This omits 10 minutes from the full interval.",
        d: "This treats 1 hour 30 minutes as 130 minutes.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [
        11,
        60,
        "multiply",
        5,
        "add",
        9,
        60,
        "multiply",
        35,
        "add",
        "subtract",
      ],
      tolerance: 0,
    },
  },
  {
    questionId: seedId("13", 28),
    versionId: seedId("14", 28),
    slug: "drawing-scale-distance-001",
    primarySkillId: ids.measurement,
    learningObjective: "Use a drawing scale to determine an actual distance.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires interpreting a scale and multiplying a decimal drawing length.",
    estimatedSeconds: 75,
    calculatorPolicy: "ALLOWED",
    misconceptions: ["DIVIDES_BY_SCALE_FACTOR"],
    misconceptionRules: selectedMisconception(
      "divides-drawing-scale",
      "DIVIDES_BY_SCALE_FACTOR",
      "a",
      "Each drawing centimeter represents 4 actual meters, so multiply the drawing length by 4.",
    ),
    tutorGuidance: tutorGuidance(
      "What actual distance does one centimeter represent?",
      "Multiply 6.5 drawing centimeters by 4 meters per centimeter.",
      "Why should the actual numerical distance be larger than the drawing length?",
    ),
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "On a floor plan, 1 centimeter represents 4 meters. A hallway measures 6.5 centimeters on the plan. What is its actual length?",
      choices: [
        { id: "a", content: "1.625 meters" },
        { id: "b", content: "10.5 meters" },
        { id: "c", content: "24 meters" },
        { id: "d", content: "26 meters" },
      ],
      answerSpec: { type: "single_choice", choiceId: "d" },
      explanation:
        "The scale is 4 actual meters for each 1 drawing centimeter. Multiply by that scale factor: 6.5 cm × (4 m/1 cm) = 26 m. The drawing-centimeter units cancel, leaving actual meters.",
      distractorRationales: {
        a: "This divides by the scale factor instead of multiplying.",
        b: "This adds the scale factor to the drawing length.",
        c: "This uses 6 centimeters and ignores the remaining 0.5 centimeter.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [6.5, 4, "multiply"],
      tolerance: 0,
    },
  },
  {
    questionId: seedId("13", 29),
    versionId: seedId("14", 29),
    slug: "triangle-area-001",
    primarySkillId: ids.geometry,
    learningObjective:
      "Calculate the area of a triangle from its base and height.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires selecting and applying the triangle-area relationship.",
    estimatedSeconds: 65,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["OMITS_ONE_HALF_FACTOR"],
    misconceptionRules: numericMisconception(
      "uses-rectangle-area",
      "OMITS_ONE_HALF_FACTOR",
      84,
      "A triangle with the same base and height has half the area of the corresponding rectangle.",
    ),
    tutorGuidance: tutorGuidance(
      "How does a triangle's area compare with a rectangle having the same base and height?",
      "Multiply 12 by 7, then divide that product by 2.",
      "How would doubling the height affect the area?",
    ),
    content: {
      questionType: "NUMERIC",
      prompt:
        "A triangle has a base of 12 centimeters and a perpendicular height of 7 centimeters. What is its area in square centimeters?",
      answerSpec: numericAnswer(42, "square centimeters", [
        "square centimeter",
        "cm2",
      ]),
      explanation:
        "Use A = 1/2 × base × height: 1/2 × 12 × 7 = 42 square centimeters.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [12, 7, "multiply", 2, "divide"],
      tolerance: 0,
    },
  },
  {
    questionId: seedId("13", 30),
    versionId: seedId("14", 30),
    slug: "circle-circumference-001",
    primarySkillId: ids.geometry,
    learningObjective: "Calculate circumference from a circle's diameter.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires distinguishing diameter from radius and applying a provided approximation for π.",
    estimatedSeconds: 70,
    calculatorPolicy: "ALLOWED",
    misconceptions: ["USES_RADIUS_WITH_DIAMETER_FORMULA"],
    misconceptionRules: selectedMisconception(
      "halves-diameter-before-pi",
      "USES_RADIUS_WITH_DIAMETER_FORMULA",
      "a",
      "The circumference formula C = πd already uses the full diameter; do not halve it first.",
    ),
    tutorGuidance: tutorGuidance(
      "Which circumference formula uses diameter directly?",
      "Use C = πd, where C is circumference and d is diameter, then substitute π ≈ 3.14 and d = 10.",
      "Why is the circumference a little more than three times the diameter?",
    ),
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "A circular lid has a diameter of 10 inches. Using π ≈ 3.14, what is its circumference?",
      choices: [
        { id: "a", content: "15.7 inches" },
        { id: "b", content: "20 inches" },
        { id: "c", content: "31.4 inches" },
        { id: "d", content: "78.5 inches" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "Use C = πd, where C represents circumference and d represents diameter. Substitute π ≈ 3.14 and d = 10 inches: C = 3.14 × 10 = 31.4 inches.",
      distractorRationales: {
        a: "This uses half the diameter and therefore finds only half the circumference.",
        b: "This doubles the diameter but does not apply π.",
        d: "This applies an area calculation rather than circumference.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [3.14, 10, "multiply"],
      tolerance: 1e-12,
    },
  },
  {
    questionId: seedId("13", 31),
    versionId: seedId("14", 31),
    slug: "rectangular-prism-volume-001",
    primarySkillId: ids.geometry,
    learningObjective: "Calculate the volume of a rectangular prism.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires multiplying three dimensions and reporting cubic units.",
    estimatedSeconds: 70,
    calculatorPolicy: "ALLOWED",
    misconceptions: ["OMITS_ONE_DIMENSION"],
    misconceptionRules: numericMisconception(
      "uses-base-area-only",
      "OMITS_ONE_DIMENSION",
      24,
      "Volume requires all three dimensions. A length-times-width product gives only the base area.",
    ),
    tutorGuidance: tutorGuidance(
      "Which three dimensions determine the volume of a rectangular prism?",
      "Multiply 8 × 3 × 2.5 and report cubic units.",
      "How does the unit show that three dimensions were multiplied?",
    ),
    content: {
      questionType: "NUMERIC",
      prompt:
        "A rectangular container is 8 inches long, 3 inches wide, and 2.5 inches high. What is its volume in cubic inches?",
      answerSpec: numericAnswer(60, "cubic inches", ["cubic inch", "in3"]),
      explanation:
        "Volume is length × width × height: 8 × 3 × 2.5 = 60 cubic inches.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [8, 3, "multiply", 2.5, "multiply"],
      tolerance: 0,
    },
  },
  {
    questionId: seedId("13", 32),
    versionId: seedId("14", 32),
    slug: "supplementary-angle-001",
    primarySkillId: ids.geometry,
    learningObjective: "Find an angle supplementary to a given angle.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires identifying the straight-line relationship as supplementary and then subtracting from 180 degrees.",
    estimatedSeconds: 55,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["USES_COMPLEMENTARY_TOTAL"],
    misconceptionRules: selectedMisconception(
      "uses-ninety-degree-total",
      "USES_COMPLEMENTARY_TOTAL",
      "a",
      "Supplementary angles total 180 degrees; 90 degrees is the total for complementary angles.",
    ),
    tutorGuidance: tutorGuidance(
      "What total measure do supplementary angles form?",
      "Subtract 128 degrees from 180 degrees.",
      "How can adding the two angle measures verify that they are supplementary?",
    ),
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "Two angles form a straight line. One angle measures 128 degrees. What is the measure of the other angle?",
      choices: [
        { id: "a", content: "38 degrees" },
        { id: "b", content: "52 degrees" },
        { id: "c", content: "62 degrees" },
        { id: "d", content: "128 degrees" },
      ],
      answerSpec: { type: "single_choice", choiceId: "b" },
      explanation:
        "Angles on a straight line total 180 degrees, so 180 − 128 = 52 degrees.",
      distractorRationales: {
        a: "This incorrectly starts from 90 degrees instead of 180 degrees.",
        c: "This subtraction does not produce a 180-degree total with 128 degrees.",
        d: "The two angles are not necessarily equal; they must total 180 degrees.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [180, 128, "subtract"],
      tolerance: 0,
    },
  },
  {
    questionId: seedId("13", 33),
    versionId: seedId("14", 33),
    slug: "table-mean-001",
    primarySkillId: ids.dataInterpretation,
    learningObjective: "Read a table and calculate the mean of its values.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires reading five values from a simple table and completing the two linked mean steps: sum, then divide by the count.",
    estimatedSeconds: 90,
    calculatorPolicy: "ALLOWED",
    misconceptions: ["DIVIDES_BY_WRONG_OBSERVATION_COUNT"],
    misconceptionRules: selectedMisconception(
      "divides-by-four-rows",
      "DIVIDES_BY_WRONG_OBSERVATION_COUNT",
      "d",
      "The table contains five daily observations, so divide the total by 5.",
    ),
    tutorGuidance: tutorGuidance(
      "How many daily values appear in the table?",
      "Add all five values, then divide the total by 5.",
      "How does comparing your mean with the smallest and largest values help check it?",
    ),
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: "What is the mean number of calls answered per day?",
      stimulus: {
        type: "table",
        caption: "Calls answered by a support desk",
        columns: ["Day", "Calls answered"],
        rows: [
          ["Monday", "12"],
          ["Tuesday", "15"],
          ["Wednesday", "9"],
          ["Thursday", "16"],
          ["Friday", "8"],
        ],
      },
      choices: [
        { id: "a", content: "10 calls" },
        { id: "b", content: "11 calls" },
        { id: "c", content: "12 calls" },
        { id: "d", content: "15 calls" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "The mean is the equal-share average: the value each day would have if the total were distributed evenly. Add the five daily counts to get 60, then divide by the 5 days: 60 ÷ 5 = 12 calls per day. The result is reasonable because it falls between the smallest value, 8, and the largest, 16.",
      distractorRationales: {
        a: "This does not use the total of all five values divided by 5.",
        b: "This is one below the calculated mean.",
        d: "This divides the total by 4 instead of the five observations.",
      },
    },
    verificationSpec: {
      kind: "data_result",
      operation: "mean",
      values: [12, 15, 9, 16, 8],
      tolerance: 0,
    },
  },
  {
    questionId: seedId("13", 34),
    versionId: seedId("14", 34),
    slug: "table-range-001",
    primarySkillId: ids.dataInterpretation,
    learningObjective: "Determine the range of values shown in a table.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires locating the largest and smallest table values and finding their difference.",
    estimatedSeconds: 70,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["REPORTS_MAXIMUM_AS_RANGE"],
    misconceptionRules: selectedMisconception(
      "returns-table-maximum",
      "REPORTS_MAXIMUM_AS_RANGE",
      "d",
      "The range is the maximum minus the minimum, not the maximum alone.",
    ),
    tutorGuidance: tutorGuidance(
      "What are the greatest and least values in the table?",
      "Subtract the least value from the greatest value.",
      "Why does the range describe spread rather than a typical value?",
    ),
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: "What is the range of the recorded wait times?",
      stimulus: {
        type: "table",
        caption: "Customer wait times",
        columns: ["Customer", "Wait time (minutes)"],
        rows: [
          ["A", "18"],
          ["B", "24"],
          ["C", "15"],
          ["D", "27"],
        ],
      },
      choices: [
        { id: "a", content: "3 minutes" },
        { id: "b", content: "9 minutes" },
        { id: "c", content: "12 minutes" },
        { id: "d", content: "27 minutes" },
      ],
      answerSpec: { type: "single_choice", choiceId: "c" },
      explanation:
        "The maximum is 27 and the minimum is 15, so the range is 27 − 15 = 12 minutes.",
      distractorRationales: {
        a: "This is the difference between 27 and 24, not the full range.",
        b: "This is the difference between 24 and 15, not the maximum-minus-minimum difference.",
        d: "This reports the maximum value instead of subtracting the minimum.",
      },
    },
    verificationSpec: {
      kind: "data_result",
      operation: "range",
      values: [18, 24, 15, 27],
      tolerance: 0,
    },
  },
  {
    questionId: seedId("13", 35),
    versionId: seedId("14", 35),
    slug: "order-data-values-001",
    primarySkillId: ids.dataInterpretation,
    learningObjective:
      "Order quantitative table entries from greatest to least.",
    difficulty: "FOUNDATIONAL",
    difficultyRationale:
      "Requires reading four labeled values and ordering them without additional calculation.",
    estimatedSeconds: 60,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["ORDERS_LABELS_ALPHABETICALLY"],
    tutorGuidance: tutorGuidance(
      "Which category has the largest numerical value?",
      "Compare the counts, not the alphabetical order of the category labels.",
      "Which adjacent pair in your order has the smallest difference?",
    ),
    content: {
      questionType: "ORDERED_RESPONSE",
      prompt: "Arrange the routes from greatest to least number of riders.",
      stimulus: {
        type: "table",
        caption: "Morning bus ridership",
        columns: ["Route", "Riders"],
        rows: [
          ["North", "42"],
          ["East", "37"],
          ["South", "51"],
          ["West", "46"],
        ],
      },
      choices: [
        { id: "north", content: "North: 42" },
        { id: "east", content: "East: 37" },
        { id: "south", content: "South: 51" },
        { id: "west", content: "West: 46" },
      ],
      answerSpec: {
        type: "ordered_response",
        itemIds: ["south", "west", "north", "east"],
      },
      explanation:
        "Compare the rider counts: 51 > 46 > 42 > 37, so the order is South, West, North, East.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "ordered_values",
      values: { north: 42, east: 37, south: 51, west: 46 },
      direction: "descending",
    },
  },
  {
    questionId: seedId("13", 36),
    versionId: seedId("14", 36),
    slug: "fraction-probability-001",
    primarySkillId: ids.probabilityStatistics,
    learningObjective:
      "Express a simple event probability as a reduced fraction.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires counting total outcomes, forming a probability, and reducing the fraction.",
    estimatedSeconds: 70,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["USES_NONFAVORABLE_COUNT"],
    misconceptionRules: selectedMisconception(
      "counts-not-red-marbles",
      "USES_NONFAVORABLE_COUNT",
      "c",
      "The numerator counts favorable red marbles, not all marbles that are not red.",
    ),
    tutorGuidance: tutorGuidance(
      "How many marbles are in the bag in total?",
      "Place the 4 favorable red outcomes over the 12 total outcomes, then reduce.",
      "How can the probability of not drawing red help verify your fraction?",
    ),
    content: {
      questionType: "SINGLE_CHOICE",
      prompt:
        "A bag contains 4 red marbles, 5 blue marbles, and 3 white marbles. What is the probability of selecting a red marble at random?",
      choices: [
        { id: "a", content: "1/4" },
        { id: "b", content: "1/3" },
        { id: "c", content: "2/3" },
        { id: "d", content: "3/4" },
      ],
      answerSpec: { type: "single_choice", choiceId: "b" },
      explanation:
        "There are 12 marbles total and 4 are red. The probability is 4/12 = 1/3.",
      distractorRationales: {
        a: "This uses the number of red marbles over an incorrect total of 16.",
        c: "This is the probability of selecting a marble that is not red.",
        d: "This does not represent 4 favorable outcomes out of 12 total outcomes.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [4, 12, "divide"],
      tolerance: 1e-12,
    },
  },
  {
    questionId: seedId("13", 37),
    versionId: seedId("14", 37),
    slug: "calculate-mean-001",
    primarySkillId: ids.probabilityStatistics,
    learningObjective: "Calculate the arithmetic mean of a small data set.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires summing five values and dividing by the correct observation count.",
    estimatedSeconds: 75,
    calculatorPolicy: "ALLOWED",
    misconceptions: ["DIVIDES_BY_SUM_INSTEAD_OF_COUNT"],
    tutorGuidance: tutorGuidance(
      "What is the sum of all five values?",
      "Divide the sum by the number of values, which is 5.",
      "Why must the mean fall between the smallest and largest values?",
    ),
    content: {
      questionType: "NUMERIC",
      prompt: "What is the mean of 7, 10, 13, 6, and 9?",
      answerSpec: numericAnswer(9),
      explanation:
        "The arithmetic mean is the average found by adding all values and dividing by the number of values. Add the five values to get 45, then divide by 5: 45 ÷ 5 = 9. The result is reasonable because 9 falls between the smallest value, 6, and the largest, 13.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "data_result",
      operation: "mean",
      values: [7, 10, 13, 6, 9],
      tolerance: 0,
    },
  },
  {
    questionId: seedId("13", 38),
    versionId: seedId("14", 38),
    slug: "even-set-median-001",
    primarySkillId: ids.probabilityStatistics,
    learningObjective:
      "Calculate the median of a data set with an even number of values.",
    difficulty: "DEVELOPING",
    difficultyRationale:
      "Requires two familiar linked steps: order four values, then average the two middle values.",
    estimatedSeconds: 70,
    calculatorPolicy: "NOT_NEEDED",
    misconceptions: ["SELECTS_ONE_MIDDLE_VALUE"],
    misconceptionRules: numericMisconception(
      "selects-lower-middle",
      "SELECTS_ONE_MIDDLE_VALUE",
      7,
      "An even-sized set has two middle values; average both rather than selecting one.",
    ),
    tutorGuidance: tutorGuidance(
      "What is the ordered form of the four values?",
      "Average the two middle values after ordering the set.",
      "How would adding a fifth value change the way the median is identified?",
    ),
    content: {
      questionType: "NUMERIC",
      prompt: "What is the median of 4, 11, 7, and 14?",
      answerSpec: numericAnswer(9),
      explanation:
        "Order the values: 4, 7, 11, 14. Average the two middle values: (7 + 11) ÷ 2 = 9.",
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "data_result",
      operation: "median",
      values: [4, 11, 7, 14],
      tolerance: 0,
    },
  },
];

seedQuestions.push(...measurementDataExpansion);

const requiredLeafSkillIds = [
  ids.arithmetic,
  ids.fractionsDecimalsPercent,
  ids.ratiosProportions,
  ids.conversions,
  ids.algebraicExpressions,
  ids.linearEquations,
  ids.inequalities,
  ids.wordProblems,
  ids.measurement,
  ids.geometry,
  ids.dataInterpretation,
  ids.probabilityStatistics,
] as const;

function seedId(prefix: "13" | "14", sequence: number) {
  return `${prefix}000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

function numericAnswer(
  value: number,
  unit?: string,
  acceptedUnits: string[] = [],
): Extract<QuestionContent["answerSpec"], { type: "numeric" }> {
  return {
    type: "numeric",
    value,
    tolerance: 0,
    toleranceMode: "absolute",
    unit,
    acceptedUnits,
    unitRequired: false,
  };
}

function tutorGuidance(
  question: string,
  hint: string,
  reflectionPrompt: string,
): TutorGuidance {
  return {
    steps: [
      { id: "plan-solution", kind: "SOCRATIC_QUESTION", content: question },
      { id: "apply-plan", kind: "HINT", content: hint },
    ],
    reflectionPrompt,
  };
}

function selectedMisconception(
  id: string,
  code: string,
  choiceId: string,
  learnerMessage: string,
): MisconceptionRule[] {
  return [{ id, code, learnerMessage, kind: "selected_choice", choiceId }];
}

function numericMisconception(
  id: string,
  code: string,
  value: number,
  learnerMessage: string,
): MisconceptionRule[] {
  return [
    {
      id,
      code,
      learnerMessage,
      kind: "numeric_value",
      value,
      tolerance: 0,
    },
  ];
}

async function main() {
  assertSeedDatasetIntegrity();

  const pool = new Pool({ connectionString: databaseUrl });
  const database = drizzle({ client: pool });

  try {
    for (const candidate of seedQuestions) {
      const validation = validateQuestionContent(candidate.content);
      if (!validation.valid) {
        throw new Error(
          `Seed question ${candidate.slug} is invalid: ${validation.issues
            .map((issue) => issue.code)
            .join(", ")}`,
        );
      }

      const mathValidation = validateMathVerification(
        candidate.content,
        candidate.verificationSpec,
      );
      if (!mathValidation.valid) {
        throw new Error(
          `Seed question ${candidate.slug} has an invalid verification specification: ${mathValidation.failureCode}`,
        );
      }

      const misconceptionIssues = validateMisconceptionRules(
        candidate.content,
        candidate.misconceptions,
        candidate.misconceptionRules ?? [],
      );
      if (misconceptionIssues.length > 0) {
        throw new Error(
          `Seed question ${candidate.slug} has invalid misconception rules: ${misconceptionIssues
            .map((issue) => issue.code)
            .join(", ")}`,
        );
      }
      if (
        candidate.tutorGuidance &&
        !tutorGuidanceSchema.safeParse(candidate.tutorGuidance).success
      ) {
        throw new Error(
          `Seed question ${candidate.slug} has invalid tutor guidance.`,
        );
      }
    }

    await database.transaction(async (transaction) => {
      await transaction
        .insert(examSpecifications)
        .values({
          id: ids.examSpecification,
          owner: "Assessment Technologies Institute, LLC",
          examName: "ATI TEAS",
          examVersion: "7",
          section: "MATH",
          sourceUrl: "https://www.atitesting.com/teas/exam-details",
          lastVerifiedAt: new Date("2026-09-05T00:00:00Z"),
          verifiedBy: "engineering-source-review",
          verificationStatus: "VERIFIED",
          totalQuestions: 38,
          scoredQuestions: 34,
          unscoredQuestions: 4,
          durationMinutes: 57,
          domainDistribution: {
            "Numbers and Algebra": 18,
            "Measurement and Data": 16,
          },
          notes:
            "Independent metadata record. Distribution counts refer to scored questions; this is not an ATI endorsement.",
        })
        .onConflictDoNothing();

      const rootSkills = [
        {
          id: ids.numbersAlgebra,
          code: "MATH.NUMBERS_ALGEBRA",
          section: "MATH" as const,
          title: "Numbers and Algebra",
          learningObjective: "Apply number operations and algebraic reasoning.",
          alignmentNotes:
            "Internal domain mapped to the public TEAS Version 7 content outline.",
        },
        {
          id: ids.measurementData,
          code: "MATH.MEASUREMENT_DATA",
          section: "MATH" as const,
          title: "Measurement and Data",
          learningObjective:
            "Apply measurement, geometry, data, and statistical reasoning.",
          alignmentNotes:
            "Internal domain mapped to the public TEAS Version 7 content outline.",
        },
      ];
      await transaction.insert(skills).values(rootSkills).onConflictDoNothing();

      await transaction
        .insert(skills)
        .values([
          skill(ids.arithmetic, "ARITHMETIC", "Arithmetic", ids.numbersAlgebra),
          skill(
            ids.fractionsDecimalsPercent,
            "FRACTIONS_DECIMALS_PERCENT",
            "Fractions, decimals, and percentages",
            ids.numbersAlgebra,
          ),
          skill(
            ids.ratiosProportions,
            "RATIOS_PROPORTIONS",
            "Ratios and proportions",
            ids.numbersAlgebra,
          ),
          skill(
            ids.conversions,
            "UNIT_CONVERSIONS",
            "Unit conversions",
            ids.numbersAlgebra,
          ),
          skill(
            ids.algebraicExpressions,
            "ALGEBRAIC_EXPRESSIONS",
            "Algebraic expressions",
            ids.numbersAlgebra,
          ),
          skill(
            ids.linearEquations,
            "LINEAR_EQUATIONS",
            "Linear equations",
            ids.numbersAlgebra,
          ),
          skill(
            ids.inequalities,
            "INEQUALITIES",
            "Inequalities",
            ids.numbersAlgebra,
          ),
          skill(
            ids.wordProblems,
            "WORD_PROBLEMS",
            "Word problems",
            ids.numbersAlgebra,
          ),
          skill(
            ids.measurement,
            "MEASUREMENT",
            "Measurement",
            ids.measurementData,
          ),
          skill(ids.geometry, "GEOMETRY", "Geometry", ids.measurementData),
          skill(
            ids.dataInterpretation,
            "DATA_INTERPRETATION",
            "Data interpretation",
            ids.measurementData,
          ),
          skill(
            ids.probabilityStatistics,
            "PROBABILITY_STATISTICS",
            "Basic probability and statistics",
            ids.measurementData,
          ),
        ])
        .onConflictDoNothing();

      await transaction
        .insert(skillPrerequisites)
        .values([
          prerequisite(
            ids.fractionsDecimalsPercent,
            ids.arithmetic,
            3,
            "Internal learning hypothesis: arithmetic fluency supports fraction and decimal conversion.",
          ),
          prerequisite(
            ids.ratiosProportions,
            ids.fractionsDecimalsPercent,
            2,
            "Internal learning hypothesis: equivalent fractions support proportional reasoning.",
          ),
          prerequisite(
            ids.conversions,
            ids.ratiosProportions,
            2,
            "Internal learning hypothesis: proportional reasoning supports unit-conversion factors.",
          ),
          prerequisite(
            ids.algebraicExpressions,
            ids.arithmetic,
            2,
            "Internal learning hypothesis: arithmetic fluency supports simplifying expressions.",
          ),
          prerequisite(
            ids.linearEquations,
            ids.algebraicExpressions,
            3,
            "Internal learning hypothesis: expression fluency supports solving linear equations.",
          ),
          prerequisite(
            ids.inequalities,
            ids.linearEquations,
            2,
            "Internal learning hypothesis: equation-solving steps support inequality solving.",
          ),
          prerequisite(
            ids.wordProblems,
            ids.arithmetic,
            2,
            "Internal learning hypothesis: arithmetic fluency supports quantitative word problems.",
          ),
          prerequisite(
            ids.measurement,
            ids.conversions,
            2,
            "Internal learning hypothesis: unit conversion supports measurement reasoning.",
          ),
          prerequisite(
            ids.geometry,
            ids.arithmetic,
            2,
            "Internal learning hypothesis: arithmetic fluency supports geometric calculation.",
          ),
          prerequisite(
            ids.dataInterpretation,
            ids.arithmetic,
            1,
            "Internal learning hypothesis: basic operations support interpreting quantitative displays.",
          ),
          prerequisite(
            ids.probabilityStatistics,
            ids.fractionsDecimalsPercent,
            2,
            "Internal learning hypothesis: fraction and percent reasoning supports probability.",
          ),
          prerequisite(
            ids.probabilityStatistics,
            ids.dataInterpretation,
            1,
            "Internal learning hypothesis: data interpretation supports introductory statistics.",
          ),
        ])
        .onConflictDoNothing();

      await transaction
        .insert(sourceArtifacts)
        .values([
          {
            id: ids.examDetailsSource,
            canonicalUrl: "https://www.atitesting.com/teas/exam-details",
            publisher: "Assessment Technologies Institute, LLC",
            title: "ATI TEAS exam details",
            artifactType: "OFFICIAL_WEB_PAGE",
            accessedAt: new Date("2026-09-05T00:00:00Z"),
            accessClass: "PUBLIC",
            decision: "METADATA_ONLY",
            allowMetadata: true,
            decisionRationale:
              "Retain section timing and count metadata only; do not store or send question content to a model.",
            reviewedBy: "engineering-source-review",
          },
          {
            id: ids.contentOutlineSource,
            canonicalUrl:
              "https://www.atitesting.com/docs/default-source/teas-resources/ati_teas7_content_outline.pdf",
            publisher: "Assessment Technologies Institute, LLC",
            title: "ATI TEAS Version 7 content outline",
            artifactType: "OFFICIAL_CONTENT_OUTLINE",
            accessedAt: new Date("2026-09-05T00:00:00Z"),
            accessClass: "PUBLIC",
            decision: "COVERAGE_ANALYSIS",
            allowMetadata: true,
            allowCoverageAnalysis: true,
            allowQuotation: false,
            allowStorage: false,
            allowModelInput: false,
            decisionRationale:
              "Use only high-level public objectives for taxonomy alignment; do not reproduce or retain source questions.",
            reviewedBy: "engineering-source-review",
          },
          {
            id: ids.atiPracticeTestSource,
            canonicalUrl:
              "https://help.atitesting.com/teas/teas-prep/teas-practice-test/",
            publisher: "Assessment Technologies Institute, LLC",
            title: "ATI TEAS practice-test access information",
            artifactType: "OFFICIAL_PRACTICE_TEST_PORTAL",
            accessedAt: new Date("2026-09-05T00:00:00Z"),
            accessClass: "ACCOUNT_GATED",
            decision: "EXCLUDED",
            allowMetadata: false,
            allowCoverageAnalysis: false,
            allowQuotation: false,
            allowStorage: false,
            allowModelInput: false,
            decisionRationale:
              "The official practice-test content requires an ATI account and product access. Do not access, inspect, retain, summarize, or send its question content to a model.",
            reviewedBy: "engineering-source-review",
            recheckAt: new Date("2026-12-05T00:00:00Z"),
          },
          {
            id: ids.mometrixPracticeSource,
            canonicalUrl:
              "https://www.mometrix.com/academy/teas-math-practice-test/",
            publisher: "Mometrix Test Preparation",
            title: "Mometrix TEAS Math practice-test landing page",
            artifactType: "COMMERCIAL_PRACTICE_SITE",
            accessedAt: new Date("2026-09-05T00:00:00Z"),
            statedLicense: "All rights reserved; no reuse permission recorded.",
            termsUrl: "https://www.mometrix.com/termsofuse.htm",
            accessClass: "PUBLIC",
            decision: "METADATA_ONLY",
            allowMetadata: true,
            allowCoverageAnalysis: false,
            allowQuotation: false,
            allowStorage: false,
            allowModelInput: false,
            decisionRationale:
              "Record only the publisher, canonical URL, access state, and terms decision. The terms prohibit reproduction, so question text and distinctive structures are outside the pipeline.",
            reviewedBy: "engineering-source-review",
            recheckAt: new Date("2026-12-05T00:00:00Z"),
          },
          {
            id: ids.unionPracticeSource,
            canonicalUrl: "https://uniontestprep.com/teas/practice-test",
            publisher: "Union Media LLC",
            title: "Union Test Prep TEAS practice-test landing page",
            artifactType: "COMMERCIAL_PRACTICE_SITE",
            accessedAt: new Date("2026-09-05T00:00:00Z"),
            statedLicense: "All rights reserved; no reuse permission recorded.",
            termsUrl: "https://uniontestprep.com/legal/terms",
            accessClass: "PUBLIC",
            decision: "METADATA_ONLY",
            allowMetadata: true,
            allowCoverageAnalysis: false,
            allowQuotation: false,
            allowStorage: false,
            allowModelInput: false,
            decisionRationale:
              "Record only source metadata and the rights decision. The current terms restrict commercial reproduction or exploitation, so no question content enters analysis, storage, or model input.",
            reviewedBy: "engineering-source-review",
            recheckAt: new Date("2026-12-05T00:00:00Z"),
          },
          {
            id: ids.teasPracticeTestSource,
            canonicalUrl: "https://www.teaspracticetest.com/teas-math/",
            publisher: "TEAS Practice Test",
            title: "TEAS Practice Test Math landing page",
            artifactType: "INDEPENDENT_PRACTICE_SITE",
            accessedAt: new Date("2026-09-05T00:00:00Z"),
            accessClass: "PUBLIC",
            decision: "QUARANTINED",
            allowMetadata: true,
            allowCoverageAnalysis: false,
            allowQuotation: false,
            allowStorage: false,
            allowModelInput: false,
            decisionRationale:
              "A clear content-reuse license or terms page was not established during the desk review. Keep this discovery record quarantined and do not inspect or retain question bodies.",
            reviewedBy: "engineering-source-review",
            recheckAt: new Date("2026-10-05T00:00:00Z"),
          },
        ])
        .onConflictDoNothing();

      const ruleRows = ALL_QUESTION_VALIDATORS.map((key, index) => ({
        id: `15000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        key,
        version: 1,
        description: validatorDescription(key),
        blocksPublication: (
          REQUIRED_PUBLICATION_VALIDATORS as readonly string[]
        ).includes(key),
        active: true,
        changeNotes:
          "Initial reviewed publication rule established by the bootstrap dataset.",
        createdBy: "bootstrap-seed",
      }));
      await transaction
        .insert(validatorRules)
        .values(ruleRows)
        .onConflictDoNothing();

      const reviewerRuleRevisions = [
        {
          id: "1a000000-0000-4000-8000-000000000001",
          key: "difficulty-calibration",
          version: DIFFICULTY_RUBRIC_VERSION,
          description: `Apply NuraPrep's internal difficulty rubric v${DIFFICULTY_RUBRIC_VERSION}. ${Object.values(
            INTERNAL_DIFFICULTY_RUBRIC,
          )
            .map((band) => `${band.label}: ${band.summary}`)
            .join(" ")}`,
          changeNotes:
            "Representative owner review found inconsistent labels, so this revision defines each band by reasoning and representation demands rather than arithmetic size.",
        },
        {
          id: "1a000000-0000-4000-8000-000000000002",
          key: "explanation-consistency",
          version: EXPLANATION_RUBRIC_VERSION,
          description: `Apply NuraPrep's explanation rubric v${EXPLANATION_RUBRIC_VERSION}. ${EXPLANATION_RUBRIC.join(
            " ",
          )}`,
          changeNotes:
            "Representative owner review found mathematically correct explanations that did not teach the underlying concept, so this revision requires conceptual framing and setup rationale.",
        },
      ] as const;

      for (const revision of reviewerRuleRevisions) {
        const existing = await transaction
          .select({ id: validatorRules.id })
          .from(validatorRules)
          .where(
            and(
              eq(validatorRules.key, revision.key),
              eq(validatorRules.version, revision.version),
            ),
          )
          .limit(1);
        if (existing[0]) continue;

        const activatedAt = new Date("2026-09-07T22:00:00Z");
        await transaction
          .update(validatorRules)
          .set({
            active: false,
            retiredAt: activatedAt,
            retiredBy: "owner-review-2026-09-07",
          })
          .where(
            and(
              eq(validatorRules.key, revision.key),
              eq(validatorRules.active, true),
            ),
          );
        await transaction.insert(validatorRules).values({
          ...revision,
          blocksPublication: false,
          active: true,
          createdBy: "owner-feedback-implementation",
          activatedAt,
        });
      }

      for (const [index, candidate] of seedQuestions.entries()) {
        const templateId = `17000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
        const runId = `18000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
        const instructions =
          `Draft one original ${candidate.difficulty.toLocaleLowerCase("en-US")} ` +
          `${candidate.content.questionType.toLocaleLowerCase("en-US")} development candidate for ${candidate.learningObjective} ` +
          "Do not use source-question wording, values, choices, or distinctive structures.";

        await transaction
          .insert(generationTemplates)
          .values({
            id: templateId,
            templateKey: `bootstrap.${candidate.slug}`,
            version: 1,
            status: "DRAFT",
            targetSkillId: candidate.primarySkillId,
            questionType: candidate.content.questionType,
            difficulty: candidate.difficulty,
            instructions,
            parameterConstraints: {
              candidatePurpose: "development-fixture",
              sourceQuestionTextProvided: false,
            },
            prohibitedPatterns: [
              "copied wording",
              "numbers-only variation",
              "unreviewed production publication",
            ],
            validatorContract: {
              required: REQUIRED_PUBLICATION_VALIDATORS,
            },
            authoredBy: "codex-engineering-session",
          })
          .onConflictDoNothing();

        await transaction
          .insert(generationRuns)
          .values({
            id: runId,
            idempotencyKey: `bootstrap-${candidate.slug}-v1`,
            templateId,
            requestKind: "NEW_QUESTION",
            requestedBy: "codex-engineering-session",
            provider: "OpenAI",
            model: "codex-session-model-not-exported",
            promptHash: createHash("sha256").update(instructions).digest("hex"),
            parameters: {
              provenanceNotice:
                "The exact runtime model identifier was unavailable to the repository process.",
              sourceQuestionTextProvided: false,
            },
            requestPayload: {
              purpose: "bootstrap-development-candidate",
              sourceQuestionTextProvided: false,
            },
            randomSeed: `bootstrap-${index + 1}`,
            status: "SUCCEEDED",
            maxCostMicros: 0,
            completedAt: new Date("2026-09-05T00:00:00Z"),
          })
          .onConflictDoNothing();
      }

      for (const [index, candidate] of seedQuestions.entries()) {
        await transaction
          .insert(questions)
          .values({
            id: candidate.questionId,
            internalSlug: candidate.slug,
            section: "MATH",
            lifecycle: "DRAFT",
          })
          .onConflictDoNothing();

        await transaction
          .insert(questionVersions)
          .values({
            id: candidate.versionId,
            questionId: candidate.questionId,
            version: 1,
            questionType: candidate.content.questionType,
            prompt: candidate.content.prompt,
            stimulus: candidate.content.stimulus,
            choices: candidate.content.choices,
            answerSpec: candidate.content.answerSpec,
            explanation: candidate.content.explanation,
            distractorRationales: candidate.content.distractorRationales,
            verificationSpec: candidate.verificationSpec,
            primarySkillId: candidate.primarySkillId,
            learningObjective: candidate.learningObjective,
            difficulty: candidate.difficulty,
            difficultyRationale: candidate.difficultyRationale,
            estimatedSeconds: candidate.estimatedSeconds,
            calculatorPolicy: candidate.calculatorPolicy,
            commonMisconceptions: candidate.misconceptions,
            misconceptionRules: candidate.misconceptionRules ?? [],
            tutorGuidance: candidate.tutorGuidance,
            authoringMode: "GENERATED",
            generationRunId: `18000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
            provenanceSummary:
              "Original NuraPrep development candidate created without source-question text and aligned only to high-level public objectives. Exact runtime model metadata was unavailable. Not human-reviewed or production-approved.",
          })
          .onConflictDoNothing();

        await transaction
          .insert(questionVersionSources)
          .values({
            questionVersionId: candidate.versionId,
            sourceArtifactId: ids.contentOutlineSource,
            relationship: "SPECIFICATION",
            transformationNotes:
              "High-level objective alignment only; no source question wording, values, choices, or structure was used.",
          })
          .onConflictDoNothing();

        await transaction
          .insert(validationRuns)
          .values({
            id: `16000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
            questionVersionId: candidate.versionId,
            validatorRuleId: ruleRows[0].id,
            outcome: "PASS",
            evidence: {
              validator: "validateQuestionContent",
              note: "Deterministic schema and identifier checks passed during seed.",
            },
          })
          .onConflictDoNothing();
      }

      const skillCodeRows = await transaction
        .select({ id: skills.id, code: skills.code })
        .from(skills);
      const skillIdByCode = new Map(
        skillCodeRows.map((skillRow) => [skillRow.code, skillRow.id]),
      );
      const sourceRows = await transaction
        .select({
          id: sourceArtifacts.id,
          canonicalUrl: sourceArtifacts.canonicalUrl,
        })
        .from(sourceArtifacts);
      const sourceIdByUrl = new Map(
        sourceRows.map((sourceRow) => [sourceRow.canonicalUrl, sourceRow.id]),
      );
      const ruleIdByKey = new Map(
        ruleRows.map((ruleRow) => [ruleRow.key, ruleRow.id]),
      );

      for (const [index, reviewed] of reviewedMathBank.questions.entries()) {
        const skillId = skillIdByCode.get(reviewed.skillCode);
        const answerRuleId = ruleIdByKey.get("answer-contract");
        const mathRuleId = ruleIdByKey.get("mathematical-correctness");
        if (!skillId || !answerRuleId || !mathRuleId) {
          throw new Error(
            `Reviewed bank prerequisites are missing for ${reviewed.slug}.`,
          );
        }
        const contentResult = validateQuestionContent(reviewed.content);
        const mathResult = validateMathVerification(
          reviewed.content,
          reviewed.verificationSpec,
        );
        const misconceptionIssues = validateMisconceptionRules(
          reviewed.content,
          reviewed.commonMisconceptions,
          reviewed.misconceptionRules,
        );
        if (
          !contentResult.valid ||
          !mathResult.valid ||
          misconceptionIssues.length > 0
        ) {
          throw new Error(
            `Reviewed bank snapshot no longer validates for ${reviewed.slug}.`,
          );
        }

        await transaction
          .insert(questionVersions)
          .values({
            id: reviewed.versionId,
            questionId: reviewed.questionId,
            version: reviewed.originalVersionNumber,
            questionType: reviewed.content.questionType,
            prompt: reviewed.content.prompt,
            stimulus: reviewed.content.stimulus,
            choices: reviewed.content.choices,
            answerSpec: reviewed.content.answerSpec,
            explanation: reviewed.content.explanation,
            distractorRationales: reviewed.content.distractorRationales,
            verificationSpec: reviewed.verificationSpec,
            primarySkillId: skillId,
            learningObjective: reviewed.learningObjective,
            difficulty: reviewed.difficulty,
            difficultyRationale: reviewed.difficultyRationale,
            estimatedSeconds: reviewed.estimatedSeconds,
            calculatorPolicy: reviewed.calculatorPolicy,
            commonMisconceptions: reviewed.commonMisconceptions,
            misconceptionRules: reviewed.misconceptionRules,
            tutorGuidance: reviewed.tutorGuidance,
            authoringMode: "HUMAN",
            authorId: reviewed.ownerDecision.reviewerId,
            provenanceSummary: `${reviewed.provenanceSummary} Preserved in source control as reviewed-math-bank-v1; operational history remains in the verified database backup.`,
          })
          .onConflictDoNothing();

        for (const source of reviewed.sources) {
          const sourceArtifactId = sourceIdByUrl.get(source.canonicalUrl);
          if (!sourceArtifactId) {
            throw new Error(
              `Reviewed source is not governed in seed data: ${source.canonicalUrl}.`,
            );
          }
          await transaction
            .insert(questionVersionSources)
            .values({
              questionVersionId: reviewed.versionId,
              sourceArtifactId,
              relationship: source.relationship,
              transformationNotes: source.transformationNotes,
            })
            .onConflictDoNothing();
        }

        await transaction
          .insert(validationRuns)
          .values([
            {
              id: reviewedSnapshotId("21", index * 2 + 1),
              questionVersionId: reviewed.versionId,
              validatorRuleId: answerRuleId,
              outcome: "PASS",
              evidence: {
                context: "REVIEWED_BANK_SNAPSHOT",
                method: "deterministic-reviewed-snapshot-import",
                snapshotVersion: reviewedMathBank.schemaVersion,
                issues: [],
                note: "Typed content, answer, misconception, and tutor contracts were recomputed during seed.",
              },
            },
            {
              id: reviewedSnapshotId("21", index * 2 + 2),
              questionVersionId: reviewed.versionId,
              validatorRuleId: mathRuleId,
              outcome: "PASS",
              evidence: {
                context: "REVIEWED_BANK_SNAPSHOT",
                ...mathResult.evidence,
                snapshotVersion: reviewedMathBank.schemaVersion,
              },
            },
          ])
          .onConflictDoNothing();

        await transaction
          .insert(reviewDecisions)
          .values({
            id: reviewedSnapshotId("22", index + 1),
            questionVersionId: reviewed.versionId,
            reviewerId: reviewed.ownerDecision.reviewerId,
            decision: reviewed.ownerDecision.decision,
            rubricScores: reviewed.ownerDecision.rubricScores,
            notes: reviewed.ownerDecision.notes,
            decidedAt: new Date(reviewed.ownerDecision.decidedAt),
          })
          .onConflictDoNothing();

        await transaction
          .insert(questionPublications)
          .values({
            id: reviewedSnapshotId("23", index + 1),
            questionId: reviewed.questionId,
            questionVersionId: reviewed.versionId,
            publishedBy: reviewed.ownerDecision.reviewerId,
            publishedAt: new Date(reviewed.ownerDecision.decidedAt),
          })
          .onConflictDoNothing();

        await transaction
          .update(questions)
          .set({ lifecycle: "ACTIVE", retractionReason: null })
          .where(eq(questions.id, reviewed.questionId));
      }
    });
  } finally {
    await pool.end();
  }
}

function reviewedSnapshotId(prefix: "21" | "22" | "23", index: number) {
  return `${prefix}000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function assertSeedDatasetIntegrity() {
  for (const [field, values] of [
    ["question IDs", seedQuestions.map((candidate) => candidate.questionId)],
    ["version IDs", seedQuestions.map((candidate) => candidate.versionId)],
    ["slugs", seedQuestions.map((candidate) => candidate.slug)],
  ] as const) {
    if (new Set(values).size !== values.length) {
      throw new Error(`Seed questions contain duplicate ${field}.`);
    }
  }

  const coveredSkillIds = new Set(
    seedQuestions.map((candidate) => candidate.primarySkillId),
  );
  const missingSkillIds = requiredLeafSkillIds.filter(
    (skillId) => !coveredSkillIds.has(skillId),
  );
  if (missingSkillIds.length > 0) {
    throw new Error(
      `Seed questions do not cover Math leaf skills: ${missingSkillIds.join(", ")}.`,
    );
  }

  const numbersAndAlgebraSkillIds = new Set<string>([
    ids.arithmetic,
    ids.fractionsDecimalsPercent,
    ids.ratiosProportions,
    ids.conversions,
    ids.algebraicExpressions,
    ids.linearEquations,
    ids.inequalities,
    ids.wordProblems,
  ]);
  const numbersAndAlgebraCount = seedQuestions.filter((candidate) =>
    numbersAndAlgebraSkillIds.has(candidate.primarySkillId),
  ).length;
  const measurementDataCount = seedQuestions.length - numbersAndAlgebraCount;
  if (numbersAndAlgebraCount !== 20 || measurementDataCount !== 18) {
    throw new Error(
      `Seed blueprint requires 20 Numbers and Algebra and 18 Measurement and Data families; found ${numbersAndAlgebraCount} and ${measurementDataCount}.`,
    );
  }

  const missingTutorGuidance = seedQuestions
    .filter((candidate) => !candidate.tutorGuidance)
    .map((candidate) => candidate.slug);
  if (missingTutorGuidance.length > 0) {
    throw new Error(
      `Seed questions missing tutor guidance: ${missingTutorGuidance.join(", ")}.`,
    );
  }
}

function skill(id: string, code: string, title: string, parentSkillId: string) {
  return {
    id,
    code: `MATH.${code}`,
    section: "MATH" as const,
    parentSkillId,
    title,
    learningObjective: `Apply ${title.toLocaleLowerCase("en-US")} concepts to solve TEAS-aligned math problems.`,
    alignmentNotes:
      "Internal taxonomy label; alignment requires documented review against public objectives.",
  };
}

function prerequisite(
  skillId: string,
  prerequisiteSkillId: string,
  strength: number,
  rationale: string,
) {
  return { skillId, prerequisiteSkillId, strength, rationale };
}

function validatorDescription(key: (typeof ALL_QUESTION_VALIDATORS)[number]) {
  const descriptions = {
    "answer-contract":
      "Stored response shape, choice identifiers, and distractor mappings are internally valid.",
    "mathematical-correctness":
      "The keyed answer is recomputed deterministically or symbolically.",
    "difficulty-calibration":
      "A reviewer confirms the assigned internal difficulty band against the documented reasoning-step and prerequisite rubric.",
    "reading-level":
      "A reviewer confirms the language is concise, necessary to the skill, and appropriate for an adult pre-nursing learner.",
    "calculator-policy":
      "A reviewer confirms the calculator designation matches the arithmetic load and the documented exam-mode assumptions.",
    "explanation-consistency":
      "The explanation reaches and supports the keyed answer.",
    accessibility:
      "The prompt, controls, stimulus, and alternative text meet accessibility requirements.",
    "topic-alignment":
      "A reviewer confirms the intended skill and public-outline alignment.",
    originality:
      "Similarity checks and human review find no accidental copying or distinctive imitation.",
  } satisfies Record<(typeof ALL_QUESTION_VALIDATORS)[number], string>;

  return descriptions[key];
}

void main();
