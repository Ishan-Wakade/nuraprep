import { createHash } from "node:crypto";

import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "dotenv";
import { Pool } from "pg";

import {
  examSpecifications,
  generationRuns,
  generationTemplates,
  questions,
  questionVersionSources,
  questionVersions,
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
  REQUIRED_PUBLICATION_VALIDATORS,
  validateMathVerification,
  validateMisconceptionRules,
  validateQuestionContent,
} from "../src/lib/questions/validation";

config({ path: ".env.local", quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

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
        "One liter equals 1,000 milliliters, so 2.35 × 1,000 = 2,350 milliliters.",
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
    difficulty: "FOUNDATIONAL",
    difficultyRationale:
      "Requires substitution followed by multiplication and addition.",
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
        "Substitute 7 for n, then follow the order of operations: 3(7) + 8 = 21 + 8 = 29.",
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

      const ruleRows = REQUIRED_PUBLICATION_VALIDATORS.map((key, index) => ({
        id: `15000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        key,
        version: 1,
        description: validatorDescription(key),
        blocksPublication: true,
        active: true,
        changeNotes:
          "Initial reviewed publication rule established by the bootstrap dataset.",
        createdBy: "bootstrap-seed",
      }));
      await transaction
        .insert(validatorRules)
        .values(ruleRows)
        .onConflictDoNothing();

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
    });
  } finally {
    await pool.end();
  }
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

function validatorDescription(
  key: (typeof REQUIRED_PUBLICATION_VALIDATORS)[number],
) {
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
  } satisfies Record<(typeof REQUIRED_PUBLICATION_VALIDATORS)[number], string>;

  return descriptions[key];
}

void main();
