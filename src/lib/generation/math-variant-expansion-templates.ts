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

const triangleContexts = [
  "triangular garden bed",
  "triangular banner",
  "triangular floor panel",
  "triangular shade sail",
  "triangular display board",
] as const;

const triangleAreaFrames: readonly PromptFrame[] = [
  {
    key: "find-area",
    render: ({ context, base, height }) =>
      `A ${context} has a base of ${base} feet and a perpendicular height of ${height} feet. What is its area in square feet?`,
  },
  {
    key: "use-triangle-formula",
    render: ({ context, base, height }) =>
      `Use A = 1/2 × base × height for a ${context} with base ${base} feet and height ${height} feet. Which area is correct?`,
  },
  {
    key: "space-covered",
    render: ({ context, base, height }) =>
      `The perpendicular dimensions of a ${context} are base ${base} feet and height ${height} feet. How many square feet does it cover?`,
  },
  {
    key: "compare-to-rectangle",
    render: ({ context, base, height }) =>
      `A ${context} is half of a rectangle measuring ${base} feet by ${height} feet. Find the triangular area.`,
  },
] as const;

const rectangleContexts = [
  "notice board",
  "garden plot",
  "floor mat",
  "storage-room wall",
  "rectangular tabletop",
] as const;

const missingDimensionFrames: readonly PromptFrame[] = [
  {
    key: "missing-width",
    render: ({ context, area, known }) =>
      `A rectangular ${context} has an area of ${area} square feet and a length of ${known} feet. What is its width?`,
  },
  {
    key: "divide-area",
    render: ({ context, area, known }) =>
      `The area of a rectangular ${context} is ${area} square feet. One side is ${known} feet long. Find the other side length.`,
  },
  {
    key: "factor-pair",
    render: ({ context, area, known }) =>
      `A ${context} covers ${area} square feet and measures ${known} feet along one edge. Which measurement completes its dimensions?`,
  },
  {
    key: "reverse-area-formula",
    render: ({ context, area, known }) =>
      `For a rectangular ${context}, A = length × width. If A = ${area} square feet and one dimension is ${known} feet, determine the missing dimension.`,
  },
] as const;

const ratioContexts = [
  { item: "practice cards", group: "study sets" },
  { item: "supply bottles", group: "storage bins" },
  { item: "seedlings", group: "garden trays" },
  { item: "workbook pages", group: "review sessions" },
  { item: "meal containers", group: "delivery boxes" },
] as const;

const equivalentRatioFrames: readonly PromptFrame[] = [
  {
    key: "select-equivalent-ratios",
    render: ({ item, group, items, groups }) =>
      `The ratio of ${item} to ${group} is ${items}:${groups}. Select every ratio that represents the same rate.`,
  },
  {
    key: "constant-rate-forms",
    render: ({ item, group, items, groups }) =>
      `${items} ${item} are assigned to ${groups} ${group} at a constant rate. Which choices preserve that rate? Select all that apply.`,
  },
  {
    key: "equivalence-check",
    render: ({ item, group, items, groups }) =>
      `Use ${items}/${groups} ${item} per ${group} as the reference ratio. Identify every equivalent representation.`,
  },
  {
    key: "scale-both-terms",
    render: ({ item, group, items, groups }) =>
      `A plan uses ${items} ${item} for ${groups} ${group}. Select each option obtained by scaling both terms by the same nonzero factor.`,
  },
] as const;

const rationalOrderingContexts = [
  "number-line positions",
  "completion portions",
  "measurement factors",
  "relative frequencies",
  "data-table values",
] as const;

const rationalOrderingFrames = [
  {
    key: "least-to-greatest",
    direction: "ascending" as const,
    render: (context: string) =>
      `Order the fraction, decimal, and percent values used as ${context} from least to greatest.`,
  },
  {
    key: "greatest-to-least",
    direction: "descending" as const,
    render: (context: string) =>
      `The ${context} are written in mixed numerical forms. Place each value from greatest to least.`,
  },
  {
    key: "ascending-number-line",
    direction: "ascending" as const,
    render: (context: string) =>
      `Imagine plotting these ${context} on one number line. Arrange the entries from left to right.`,
  },
  {
    key: "descending-value",
    direction: "descending" as const,
    render: (context: string) =>
      `Rank the listed ${context} in descending numerical order after converting them to a common form.`,
  },
] as const;

export const mathVariantExpansionTemplates: readonly DeterministicVariantTemplate[] =
  [
    {
      key: "math.geometry.triangle-area-choice",
      version: 1,
      targetSkillCode: "MATH.GEOMETRY",
      questionType: "SINGLE_CHOICE",
      difficulty: "DEVELOPING",
      structureCapacity: triangleContexts.length * triangleAreaFrames.length,
      generate(random) {
        const context = random.pick(triangleContexts);
        const frame = random.pick(triangleAreaFrames);
        const base = random.integer(3, 10) * 2;
        const height = random.integer(3, 15);
        const answer = (base * height) / 2;
        return {
          structureKey: `${slug(context)}.${frame.key}`,
          parameters: { base, height, answer },
          candidate: singleChoiceNumericCandidate(random, {
            prompt: frame.render({ context, base, height }),
            answer,
            wrongAnswers: [base * height, answer + base, answer / 2],
            verificationExpression: [base, height, "multiply", 2, "divide"],
            learningObjective:
              "Calculate the area of a triangle from its base and perpendicular height.",
            difficultyRationale:
              "The learner must identify the perpendicular height and apply the one-half factor in the triangle-area formula.",
            estimatedSeconds: 75,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `Triangle area is one-half of base times height: 1/2 × ${base} × ${height} = ${formatNumber(answer)} square feet.`,
            misconceptionCode: "OMITS_TRIANGLE_HALF_FACTOR",
            misconceptionMessage:
              "You found the area of the matching rectangle. A triangle with the same base and height has half that area.",
            distractorExplanations: [
              "This multiplies base by height but omits the one-half factor.",
              "This adds the base after finding the area; area requires multiplication, not an added side length.",
              "This applies the one-half factor twice.",
            ],
            tutorQuestion:
              "How does the triangle compare with a rectangle that has the same base and perpendicular height?",
            reflection:
              "How can doubling your triangular area help verify the calculation?",
          }),
        };
      },
    },
    {
      key: "math.measurement.missing-rectangle-dimension-choice",
      version: 1,
      targetSkillCode: "MATH.MEASUREMENT",
      questionType: "SINGLE_CHOICE",
      difficulty: "DEVELOPING",
      structureCapacity:
        rectangleContexts.length * missingDimensionFrames.length,
      generate(random) {
        const context = random.pick(rectangleContexts);
        const frame = random.pick(missingDimensionFrames);
        const known = random.integer(3, 12);
        const answer = random.integer(4, 16);
        const area = known * answer;
        return {
          structureKey: `${slug(context)}.${frame.key}`,
          parameters: { known, answer, area },
          candidate: singleChoiceNumericCandidate(random, {
            prompt: frame.render({ context, area, known }),
            answer,
            wrongAnswers: [area, answer + known, answer + known + 1],
            verificationExpression: [area, known, "divide"],
            learningObjective:
              "Recover a missing rectangle dimension from its area and one known side.",
            difficultyRationale:
              "The learner must reverse the area formula and distinguish a length from an area.",
            estimatedSeconds: 70,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `For a rectangle, area = length × width. Divide the area by the known side: ${area} ÷ ${known} = ${answer} feet.`,
            misconceptionCode: "AREA_NOT_DIVIDED_BY_KNOWN_SIDE",
            misconceptionMessage:
              "You used the area as a side length. Divide the square-unit area by the known linear dimension.",
            distractorExplanations: [
              "This repeats the area value without converting it to a side length.",
              "This adds the known side instead of reversing multiplication with division.",
              "This adds unrelated side lengths instead of using the rectangle's area relationship.",
            ],
            tutorQuestion:
              "Which inverse operation undoes multiplying the two side lengths?",
            reflection:
              "How can multiplying the two side lengths verify the original area?",
          }),
        };
      },
    },
    {
      key: "math.ratios.multiple-select-equivalence",
      version: 1,
      targetSkillCode: "MATH.RATIOS_PROPORTIONS",
      questionType: "MULTIPLE_SELECT",
      difficulty: "PROFICIENT",
      structureCapacity: ratioContexts.length * equivalentRatioFrames.length,
      generate(random) {
        const context = random.pick(ratioContexts);
        const frame = random.pick(equivalentRatioFrames);
        const groups = random.integer(2, 7);
        const unitRate = random.integer(3, 12);
        const items = groups * unitRate;
        const choices = random.shuffle([
          { id: "original", content: `${items}:${groups}` },
          { id: "scaled", content: `${items * 3}:${groups * 3}` },
          { id: "unit-rate", content: `${unitRate}:1` },
          { id: "additive", content: `${items + 3}:${groups + 3}` },
        ]);
        return {
          structureKey: `${slug(context.item)}.${frame.key}`,
          parameters: { groups, unitRate, items },
          candidate: {
            content: {
              questionType: "MULTIPLE_SELECT",
              prompt: frame.render({ ...context, items, groups }),
              choices,
              answerSpec: {
                type: "multiple_select",
                choiceIds: ["original", "scaled", "unit-rate"],
              },
              explanation: `${items}:${groups} simplifies to ${unitRate}:1. Multiplying both terms by 3 gives ${items * 3}:${groups * 3}, so all three forms preserve the same rate.`,
              distractorRationales: {
                additive:
                  "Adding the same number to both terms does not generally preserve a ratio; equivalent ratios multiply or divide both terms by the same nonzero factor.",
              },
            },
            verificationSpec: {
              kind: "choice_equivalence",
              target: [items, groups, "divide"],
              candidates: {
                original: [items, groups, "divide"],
                scaled: [items * 3, groups * 3, "divide"],
                "unit-rate": [unitRate, 1, "divide"],
                additive: [items + 3, groups + 3, "divide"],
              },
              tolerance: 1e-9,
            },
            learningObjective:
              "Recognize multiple ratios that preserve the same multiplicative relationship.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must test several representations, including a tempting additive transformation, and select every equivalent ratio.",
            estimatedSeconds: 95,
            calculatorPolicy: "NOT_NEEDED",
            commonMisconceptions: ["ADDS_BOTH_RATIO_TERMS"],
            misconceptionRules: [
              {
                id: "selects-additive-ratio",
                kind: "selected_choice",
                code: "ADDS_BOTH_RATIO_TERMS",
                choiceId: "additive",
                learnerMessage:
                  "You added the same amount to both terms. Preserve a ratio by multiplying or dividing both terms by the same nonzero factor.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "find-unit-rate",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "What unit rate results when the first term is divided by the second?",
                },
                {
                  id: "compare-quotients",
                  kind: "HINT",
                  content:
                    "Compute first term ÷ second term for each choice and compare it with the reference rate.",
                },
              ],
              reflectionPrompt:
                "Why does scaling both ratio terms preserve the quotient while adding to both usually does not?",
            },
          },
        };
      },
    },
    {
      key: "math.fractions.order-mixed-representations",
      version: 1,
      targetSkillCode: "MATH.FRACTIONS_DECIMALS_PERCENT",
      questionType: "ORDERED_RESPONSE",
      difficulty: "PROFICIENT",
      structureCapacity:
        rationalOrderingContexts.length * rationalOrderingFrames.length,
      generate(random) {
        const context = random.pick(rationalOrderingContexts);
        const frame = random.pick(rationalOrderingFrames);
        const denominator = random.pick([10, 20, 25, 40] as const);
        const start = random.integer(1, denominator - 7);
        const numerators = [start, start + 2, start + 4, start + 6] as const;
        const entries = [
          {
            id: "fraction",
            content: `${numerators[0]}/${denominator}`,
            value: numerators[0] / denominator,
          },
          {
            id: "decimal",
            content: formatNumber(numerators[1] / denominator),
            value: numerators[1] / denominator,
          },
          {
            id: "percent",
            content: `${formatNumber((numerators[2] / denominator) * 100)}%`,
            value: numerators[2] / denominator,
          },
          {
            id: "scaled-fraction",
            content: `${numerators[3] * 2}/${denominator * 2}`,
            value: numerators[3] / denominator,
          },
        ];
        const ordered = [...entries].sort((left, right) =>
          frame.direction === "ascending"
            ? left.value - right.value
            : right.value - left.value,
        );
        return {
          structureKey: `${slug(context)}.${frame.key}`,
          parameters: {
            denominator,
            numerators: [...numerators],
            direction: frame.direction,
          },
          candidate: {
            content: {
              questionType: "ORDERED_RESPONSE",
              prompt: frame.render(context),
              choices: random.shuffle(
                entries.map(({ id, content }) => ({ id, content })),
              ),
              answerSpec: {
                type: "ordered_response",
                itemIds: ordered.map((entry) => entry.id),
              },
              explanation: `In decimal form, the values are ${entries.map((entry) => `${entry.content} = ${formatNumber(entry.value)}`).join(", ")}. Their ${frame.direction} order is ${ordered.map((entry) => entry.content).join(", ")}.`,
              distractorRationales: {},
            },
            verificationSpec: {
              kind: "ordered_values",
              values: Object.fromEntries(
                entries.map((entry) => [entry.id, entry.value]),
              ),
              direction: frame.direction,
            },
            learningObjective:
              "Compare and order rational numbers written as fractions, decimals, and percentages.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must convert mixed representations to comparable values and preserve the requested order.",
            estimatedSeconds: 105,
            calculatorPolicy: "ALLOWED",
            commonMisconceptions: [],
            misconceptionRules: [],
            tutorGuidance: {
              steps: [
                {
                  id: "choose-common-form",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "Which common representation will make all four values easiest to compare?",
                },
                {
                  id: "convert-before-ordering",
                  kind: "HINT",
                  content:
                    "Convert every value to a decimal or every value to a percent before ordering them.",
                },
              ],
              reflectionPrompt:
                "How can checking adjacent pairs verify that the entire sequence is correctly ordered?",
            },
          },
        };
      },
    },
  ];

function singleChoiceNumericCandidate(
  random: SeededRandom,
  input: {
    prompt: string;
    answer: number;
    wrongAnswers: readonly [number, number, number];
    verificationExpression: RpnExpression;
    learningObjective: string;
    difficultyRationale: string;
    estimatedSeconds: number;
    calculatorPolicy: GeneratedCandidate["calculatorPolicy"];
    explanation: string;
    misconceptionCode: string;
    misconceptionMessage: string;
    distractorExplanations: readonly [string, string, string];
    tutorQuestion: string;
    reflection: string;
  },
): GeneratedCandidate {
  const choices = random.shuffle([
    { id: "correct", content: formatNumber(input.answer) },
    { id: "misconception", content: formatNumber(input.wrongAnswers[0]) },
    { id: "nearby", content: formatNumber(input.wrongAnswers[1]) },
    { id: "operation-error", content: formatNumber(input.wrongAnswers[2]) },
  ]);
  return {
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: input.prompt,
      choices,
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
      expression: input.verificationExpression,
      tolerance: 1e-9,
    },
    learningObjective: input.learningObjective,
    difficulty: "DEVELOPING",
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
        {
          id: "check-units",
          kind: "HINT",
          content:
            "Write the governing relationship first, substitute each given value, and check that the answer has the requested units.",
        },
      ],
      reflectionPrompt: input.reflection,
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
