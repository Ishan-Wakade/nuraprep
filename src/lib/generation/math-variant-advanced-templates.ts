import type { GeneratedCandidate } from "./contracts";
import type {
  DeterministicVariantTemplate,
  SeededRandom,
} from "./deterministic-variants";
import type {
  QuestionStimulus,
  RpnExpression,
} from "@/lib/questions/contracts";

const orderOfOperationsContexts = [
  { key: "supply-packs", noun: "supply packs" },
  { key: "practice-blocks", noun: "practice blocks" },
  { key: "clinic-batches", noun: "clinic batches" },
  { key: "training-kits", noun: "training kits" },
  { key: "reading-bundles", noun: "reading bundles" },
] as const;

const orderOfOperationsFrames = [
  {
    key: "evaluate-expression",
    render: (expression: string, noun: string) =>
      `Evaluate ${expression} to find the number of ${noun}.`,
  },
  {
    key: "apply-operation-order",
    render: (expression: string, noun: string) =>
      `A count of ${noun} is represented by ${expression}. Which value follows the correct order of operations?`,
  },
  {
    key: "parentheses-first",
    render: (expression: string, noun: string) =>
      `Use the grouping symbols in ${expression} before calculating the final ${noun} count. What is the result?`,
  },
  {
    key: "compare-calculations",
    render: (expression: string, noun: string) =>
      `The expression ${expression} models a ${noun} total. Select its correctly evaluated value.`,
  },
] as const;

const proportionalTableContexts = [
  { key: "cards-sets", item: "Practice cards", group: "Study sets" },
  { key: "labels-bins", item: "Supply labels", group: "Storage bins" },
  { key: "pages-packets", item: "Workbook pages", group: "Packets" },
  { key: "seedlings-trays", item: "Seedlings", group: "Garden trays" },
  { key: "bottles-tables", item: "Water bottles", group: "Event tables" },
] as const;

const proportionalTableFrames = [
  {
    key: "complete-table",
    render: (item: string, group: string) =>
      `The table shows a constant ratio of ${item.toLocaleLowerCase("en-US")} to ${group.toLocaleLowerCase("en-US")}. Complete the missing table entry.`,
  },
  {
    key: "extend-pattern",
    render: (item: string, group: string) =>
      `Extend the proportional pattern between ${group.toLocaleLowerCase("en-US")} and ${item.toLocaleLowerCase("en-US")}. What number replaces the question mark?`,
  },
  {
    key: "use-unit-rate",
    render: (item: string, group: string) =>
      `Use the constant number of ${item.toLocaleLowerCase("en-US")} per ${singular(group).toLocaleLowerCase("en-US")} to find the missing value.`,
  },
  {
    key: "scale-table-row",
    render: (item: string, group: string) =>
      `Each row preserves the same ${item.toLocaleLowerCase("en-US")}-to-${group.toLocaleLowerCase("en-US")} rate. Calculate the final row's missing quantity.`,
  },
] as const;

const compositeAreaContexts = [
  "floor plan",
  "garden bed",
  "wall panel",
  "tabletop design",
  "fabric pattern",
] as const;

const compositeAreaFrames = [
  {
    key: "subtract-cutout",
    render: (
      context: string,
      length: number,
      width: number,
      cutLength: number,
      cutWidth: number,
    ) =>
      `A rectangular ${context} measures ${length} feet by ${width} feet. A ${cutLength}-foot by ${cutWidth}-foot rectangle is removed from one corner. What area remains?`,
  },
  {
    key: "outer-minus-inner",
    render: (
      context: string,
      length: number,
      width: number,
      cutLength: number,
      cutWidth: number,
    ) =>
      `Find the usable area of a ${context}: start with an outer ${length}-foot by ${width}-foot rectangle and exclude a ${cutLength}-foot by ${cutWidth}-foot rectangular cutout.`,
  },
  {
    key: "l-shaped-region",
    render: (
      context: string,
      length: number,
      width: number,
      cutLength: number,
      cutWidth: number,
    ) =>
      `An L-shaped ${context} is formed by removing a ${cutLength} ft × ${cutWidth} ft corner from a ${length} ft × ${width} ft rectangle. Determine its area in square feet.`,
  },
  {
    key: "difference-of-areas",
    render: (
      context: string,
      length: number,
      width: number,
      cutLength: number,
      cutWidth: number,
    ) =>
      `For a ${context}, subtract the area of a ${cutLength}-by-${cutWidth}-foot opening from a ${length}-by-${width}-foot rectangle. Which remaining area is correct?`,
  },
] as const;

const mixedLengthContexts = [
  "shelf measurements",
  "fabric lengths",
  "garden-row widths",
  "equipment dimensions",
  "display-board edges",
] as const;

const mixedLengthFrames = [
  {
    key: "least-to-greatest",
    direction: "ascending" as const,
    render: (context: string) =>
      `Convert the ${context} to a common unit, then order them from shortest to longest.`,
  },
  {
    key: "greatest-to-least",
    direction: "descending" as const,
    render: (context: string) =>
      `The ${context} use centimeters, meters, and millimeters. Arrange them from longest to shortest.`,
  },
  {
    key: "ascending-common-unit",
    direction: "ascending" as const,
    render: (context: string) =>
      `Compare these ${context} after rewriting each in centimeters. Place them in ascending order.`,
  },
  {
    key: "descending-conversion",
    direction: "descending" as const,
    render: (context: string) =>
      `Order the mixed-unit ${context} in descending length without changing their physical sizes.`,
  },
] as const;

export const mathVariantAdvancedTemplates: readonly DeterministicVariantTemplate[] =
  [
    {
      key: "math.arithmetic.grouped-order-of-operations",
      version: 1,
      targetSkillCode: "MATH.ARITHMETIC",
      questionType: "SINGLE_CHOICE",
      difficulty: "PROFICIENT",
      structureCapacity:
        orderOfOperationsContexts.length * orderOfOperationsFrames.length,
      generate(random) {
        const context = random.pick(orderOfOperationsContexts);
        const frame = random.pick(orderOfOperationsFrames);
        const initial = random.integer(3, 12);
        const multiplier = random.integer(2, 7);
        const difference = random.integer(2, 6);
        const proposedRemoved = random.integer(1, 5);
        const removed =
          initial * (difference - 1) === proposedRemoved * (multiplier - 1)
            ? proposedRemoved === 5
              ? 4
              : proposedRemoved + 1
            : proposedRemoved;
        const added = removed + difference;
        const expression = `${initial} + ${multiplier} × (${added} - ${removed})`;
        const answer = initial + multiplier * difference;
        const leftToRight = (initial + multiplier) * difference;
        const ignoresGrouping = initial + multiplier * added - removed;
        const multipliesEarlySum = (initial + multiplier) * added - removed;

        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: {
            initial,
            multiplier,
            added,
            removed,
            answer,
          },
          candidate: singleChoiceNumericCandidate(random, {
            prompt: frame.render(expression, context.noun),
            answer,
            wrongAnswers: [leftToRight, ignoresGrouping, multipliesEarlySum],
            verificationExpression: [
              initial,
              multiplier,
              added,
              removed,
              "subtract",
              "multiply",
              "add",
            ],
            learningObjective:
              "Evaluate a numerical expression using grouping symbols, multiplication, and addition in the correct order.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must preserve parentheses and multiplication precedence while resisting plausible left-to-right calculations.",
            estimatedSeconds: 80,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `Evaluate the parentheses first: ${added} - ${removed} = ${difference}. Multiply next: ${multiplier} × ${difference} = ${multiplier * difference}. Add ${initial}: ${initial} + ${multiplier * difference} = ${answer}.`,
            misconceptionCode: "CALCULATES_STRICTLY_LEFT_TO_RIGHT",
            misconceptionMessage:
              "You combined the first two numbers before evaluating the grouped subtraction. Start inside parentheses, then multiply, then add.",
            distractorExplanations: [
              "This calculates from left to right and ignores operation precedence.",
              "This performs multiplication before resolving the entire parenthetical difference.",
              "This adds before multiplying and also loses the intended grouping.",
            ],
            tutorQuestion:
              "Which operation is enclosed by grouping symbols, and what must happen immediately after it?",
            reflection:
              "How can writing one simplified expression per line prevent an order-of-operations error?",
          }),
        };
      },
    },
    {
      key: "math.ratios.proportional-table-missing-value",
      version: 1,
      targetSkillCode: "MATH.RATIOS_PROPORTIONS",
      questionType: "NUMERIC",
      difficulty: "DEVELOPING",
      structureCapacity:
        proportionalTableContexts.length * proportionalTableFrames.length,
      generate(random) {
        const context = random.pick(proportionalTableContexts);
        const frame = random.pick(proportionalTableFrames);
        const unitRate = random.integer(3, 12);
        const targetGroups = random.integer(5, 9);
        const answer = unitRate * targetGroups;
        const stimulus: QuestionStimulus = {
          type: "table",
          caption: `${context.item} by ${context.group}`,
          columns: [context.group, context.item],
          rows: [
            ["2", String(2 * unitRate)],
            ["4", String(4 * unitRate)],
            [String(targetGroups), "?"],
          ],
        };

        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { unitRate, targetGroups, answer },
          candidate: numericCandidate({
            stimulus,
            prompt: frame.render(context.item, context.group),
            answer,
            verificationExpression: [targetGroups, unitRate, "multiply"],
            learningObjective:
              "Find a unit rate from a proportional table and use it to complete a missing row.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must recognize the table's constant multiplicative relationship and extend it to a new row.",
            estimatedSeconds: 75,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `The table uses ${unitRate} ${context.item.toLocaleLowerCase("en-US")} per ${singular(context.group).toLocaleLowerCase("en-US")}. For ${targetGroups} ${context.group.toLocaleLowerCase("en-US")}, multiply ${targetGroups} × ${unitRate} = ${answer}.`,
            misconception: {
              code: "USES_ADDITIVE_TABLE_PATTERN",
              value: targetGroups + unitRate,
              message:
                "You added the row values. A proportional table preserves a multiplication rate, so multiply the group count by the unit rate.",
            },
            tutorQuestion:
              "How many items correspond to one group in each completed row?",
            reflection:
              "How can dividing the completed quantity by its group count verify the same unit rate in every row?",
          }),
        };
      },
    },
    {
      key: "math.geometry.composite-rectangle-area",
      version: 1,
      targetSkillCode: "MATH.GEOMETRY",
      questionType: "SINGLE_CHOICE",
      difficulty: "PROFICIENT",
      structureCapacity:
        compositeAreaContexts.length * compositeAreaFrames.length,
      generate(random) {
        const context = random.pick(compositeAreaContexts);
        const frame = random.pick(compositeAreaFrames);
        const length = random.integer(12, 24);
        const width = random.integer(9, 18);
        const cutLength = random.integer(2, Math.floor(length / 3));
        const cutWidth = random.integer(2, Math.floor(width / 3));
        const outerArea = length * width;
        const cutoutArea = cutLength * cutWidth;
        const answer = outerArea - cutoutArea;
        const remainingSidesArea = (length - cutLength) * (width - cutWidth);

        return {
          structureKey: `${slug(context)}.${frame.key}`,
          parameters: {
            length,
            width,
            cutLength,
            cutWidth,
            answer,
          },
          candidate: singleChoiceNumericCandidate(random, {
            prompt: frame.render(context, length, width, cutLength, cutWidth),
            answer,
            wrongAnswers: [
              outerArea,
              remainingSidesArea,
              outerArea + cutoutArea,
            ],
            verificationExpression: [
              length,
              width,
              "multiply",
              cutLength,
              cutWidth,
              "multiply",
              "subtract",
            ],
            learningObjective:
              "Find the area of a composite region by subtracting a rectangular cutout from an outer rectangle.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must decompose an L-shaped region, calculate two areas, and subtract the excluded portion.",
            estimatedSeconds: 95,
            calculatorPolicy: "ALLOWED",
            explanation: `The outer rectangle has area ${length} × ${width} = ${outerArea} square feet. The cutout has area ${cutLength} × ${cutWidth} = ${cutoutArea} square feet. The remaining area is ${outerArea} - ${cutoutArea} = ${answer} square feet.`,
            misconceptionCode: "DOES_NOT_SUBTRACT_CUTOUT",
            misconceptionMessage:
              "You found the full outer rectangle but did not remove the missing corner's area.",
            distractorExplanations: [
              "This is the complete outer rectangle before the corner is removed.",
              "This subtracts both cutout dimensions from the outer dimensions and loses two valid rectangular strips.",
              "This adds the cutout even though that region is excluded.",
            ],
            tutorQuestion:
              "What two rectangular areas can you calculate before finding their difference?",
            reflection:
              "Why does subtracting the cutout preserve the other two arms of the L-shaped region?",
          }),
        };
      },
    },
    {
      key: "math.unit-conversions.order-mixed-lengths",
      version: 1,
      targetSkillCode: "MATH.UNIT_CONVERSIONS",
      questionType: "ORDERED_RESPONSE",
      difficulty: "PROFICIENT",
      structureCapacity: mixedLengthContexts.length * mixedLengthFrames.length,
      generate(random) {
        const context = random.pick(mixedLengthContexts);
        const frame = random.pick(mixedLengthFrames);
        const base = random.integer(30, 70);
        const centimeterValues = [base, base + 5, base + 11, base + 18];
        const entries = [
          {
            id: "centimeters",
            content: `${centimeterValues[0]} cm`,
            centimeters: centimeterValues[0]!,
          },
          {
            id: "first-meters",
            content: `${formatNumber(centimeterValues[1]! / 100)} m`,
            centimeters: centimeterValues[1]!,
          },
          {
            id: "millimeters",
            content: `${centimeterValues[2]! * 10} mm`,
            centimeters: centimeterValues[2]!,
          },
          {
            id: "second-meters",
            content: `${formatNumber(centimeterValues[3]! / 100)} m`,
            centimeters: centimeterValues[3]!,
          },
        ];
        const ordered = [...entries].sort((left, right) =>
          frame.direction === "ascending"
            ? left.centimeters - right.centimeters
            : right.centimeters - left.centimeters,
        );

        return {
          structureKey: `${slug(context)}.${frame.key}`,
          parameters: {
            centimeterValues,
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
              explanation: `In centimeters, the measurements are ${entries.map((entry) => `${entry.content} = ${entry.centimeters} cm`).join(", ")}. The ${frame.direction} order is ${ordered.map((entry) => entry.content).join(", ")}.`,
              distractorRationales: {},
            },
            verificationSpec: {
              kind: "ordered_values",
              values: Object.fromEntries(
                entries.map((entry) => [entry.id, entry.centimeters]),
              ),
              direction: frame.direction,
            },
            learningObjective:
              "Convert metric lengths to a common unit and order the measurements by physical size.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must coordinate meter, centimeter, and millimeter conversions before preserving the requested order.",
            estimatedSeconds: 100,
            calculatorPolicy: "NOT_NEEDED",
            commonMisconceptions: ["COMPARES_DIGITS_WITHOUT_CONVERTING"],
            misconceptionRules: [
              {
                id: "reverses-first-converted-pair",
                kind: "reversed_pair",
                code: "COMPARES_DIGITS_WITHOUT_CONVERTING",
                earlierItemId: ordered[0]!.id,
                laterItemId: ordered[1]!.id,
                learnerMessage:
                  "Two mixed-unit measurements are reversed. Convert both to the same unit before comparing their digits.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "choose-common-unit",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "Which one unit could represent all four lengths without changing their physical sizes?",
                },
                {
                  id: "convert-every-entry",
                  kind: "HINT",
                  content:
                    "Use 1 meter = 100 centimeters and 1 centimeter = 10 millimeters, then compare the converted values.",
                },
              ],
              reflectionPrompt:
                "How can adjacent comparisons in one common unit verify the complete order?",
            },
          } satisfies GeneratedCandidate,
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
    difficulty: GeneratedCandidate["difficulty"];
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
  return {
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: input.prompt,
      choices: random.shuffle([
        { id: "correct", content: formatNumber(input.answer) },
        { id: "misconception", content: formatNumber(input.wrongAnswers[0]) },
        { id: "secondary-error", content: formatNumber(input.wrongAnswers[1]) },
        { id: "operation-error", content: formatNumber(input.wrongAnswers[2]) },
      ]),
      answerSpec: { type: "single_choice", choiceId: "correct" },
      explanation: input.explanation,
      distractorRationales: {
        misconception: input.distractorExplanations[0],
        "secondary-error": input.distractorExplanations[1],
        "operation-error": input.distractorExplanations[2],
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: input.verificationExpression,
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
        {
          id: "verify-result",
          kind: "HINT",
          content:
            "Write each intermediate value on its own line, then substitute the result into the original relationship.",
        },
      ],
      reflectionPrompt: input.reflection,
    },
  };
}

function numericCandidate(input: {
  stimulus?: QuestionStimulus;
  prompt: string;
  answer: number;
  verificationExpression: RpnExpression;
  learningObjective: string;
  difficulty: GeneratedCandidate["difficulty"];
  difficultyRationale: string;
  estimatedSeconds: number;
  calculatorPolicy: GeneratedCandidate["calculatorPolicy"];
  explanation: string;
  misconception: { code: string; value: number; message: string };
  tutorQuestion: string;
  reflection: string;
}): GeneratedCandidate {
  return {
    content: {
      questionType: "NUMERIC",
      prompt: input.prompt,
      stimulus: input.stimulus,
      answerSpec: {
        type: "numeric",
        value: input.answer,
        tolerance: 0,
        toleranceMode: "absolute",
        acceptedUnits: [],
        unitRequired: false,
      },
      explanation: input.explanation,
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: input.verificationExpression,
      tolerance: 0,
    },
    learningObjective: input.learningObjective,
    difficulty: input.difficulty,
    difficultyRationale: input.difficultyRationale,
    estimatedSeconds: input.estimatedSeconds,
    calculatorPolicy: input.calculatorPolicy,
    commonMisconceptions: [input.misconception.code],
    misconceptionRules: [
      {
        id: "targeted-numeric-misconception",
        kind: "numeric_value",
        code: input.misconception.code,
        value: input.misconception.value,
        tolerance: 0,
        learnerMessage: input.misconception.message,
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
          id: "verify-result",
          kind: "HINT",
          content:
            "Use a completed row to verify the constant relationship before calculating the missing value.",
        },
      ],
      reflectionPrompt: input.reflection,
    },
  };
}

function singular(value: string) {
  return value.endsWith("s") ? value.slice(0, -1) : value;
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
