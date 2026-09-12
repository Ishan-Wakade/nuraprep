import type { GeneratedCandidate } from "./contracts";
import type {
  DeterministicVariantTemplate,
  SeededRandom,
} from "./deterministic-variants";
import type {
  QuestionStimulus,
  RpnExpression,
} from "@/lib/questions/contracts";

const estimationContexts = [
  { key: "supply-order", noun: "supply items" },
  { key: "event-attendance", noun: "event attendees" },
  { key: "meal-count", noun: "prepared meals" },
  { key: "library-checkouts", noun: "library checkouts" },
  { key: "clinic-forms", noun: "completed forms" },
] as const;

const estimationFrames = [
  {
    key: "round-each-add",
    render: (first: number, second: number, noun: string) =>
      `A record lists ${first} ${noun} in one group and ${second} in another. Estimate the combined count by rounding each number to the nearest ten before adding.`,
  },
  {
    key: "nearest-ten-total",
    render: (first: number, second: number, noun: string) =>
      `Estimate ${first} + ${second} ${noun}. Round both quantities to the nearest ten, then add the rounded values.`,
  },
  {
    key: "reasonable-estimate",
    render: (first: number, second: number, noun: string) =>
      `Two groups contain ${first} and ${second} ${noun}. Which total is the estimate produced by rounding each group to the nearest ten?`,
  },
  {
    key: "planned-total",
    render: (first: number, second: number, noun: string) =>
      `For a quick plan, a coordinator rounds ${first} ${noun} and ${second} ${noun} to the nearest ten. What estimated total should the coordinator use?`,
  },
] as const;

const tableMaximumContexts = [
  {
    key: "appointments",
    caption: "Appointments by weekday",
    categoryHeader: "Weekday",
    valueHeader: "Appointments",
    categories: ["Monday", "Tuesday", "Wednesday", "Thursday"],
  },
  {
    key: "training-minutes",
    caption: "Training minutes by group",
    categoryHeader: "Group",
    valueHeader: "Minutes",
    categories: ["North", "South", "East", "West"],
  },
  {
    key: "book-donations",
    caption: "Book donations by site",
    categoryHeader: "Site",
    valueHeader: "Books",
    categories: ["Aster", "Birch", "Cedar", "Dove"],
  },
  {
    key: "water-use",
    caption: "Water use by station",
    categoryHeader: "Station",
    valueHeader: "Liters",
    categories: ["One", "Two", "Three", "Four"],
  },
  {
    key: "practice-sets",
    caption: "Practice sets by team",
    categoryHeader: "Team",
    valueHeader: "Sets",
    categories: ["Amber", "Blue", "Coral", "Green"],
  },
] as const;

const tableMaximumFrames = [
  {
    key: "greatest-value",
    render: (valueHeader: string) =>
      `Which number is greatest in the ${valueHeader} column?`,
  },
  {
    key: "maximum-recorded",
    render: (valueHeader: string) =>
      `What is the maximum value recorded in the ${valueHeader} column?`,
  },
  {
    key: "highest-entry",
    render: (valueHeader: string) =>
      `Identify the highest number listed under ${valueHeader}.`,
  },
  {
    key: "compare-table-values",
    render: (valueHeader: string) =>
      `Compare all four entries under ${valueHeader}. Which value is largest?`,
  },
] as const;

const rateTableContexts = [
  {
    key: "boxes-packed",
    caption: "Time and boxes packed",
    input: "Hours",
    output: "Boxes",
  },
  {
    key: "distance-traveled",
    caption: "Time and distance traveled",
    input: "Hours",
    output: "Miles",
  },
  {
    key: "pages-reviewed",
    caption: "Sessions and pages reviewed",
    input: "Sessions",
    output: "Pages",
  },
  {
    key: "containers-filled",
    caption: "Minutes and containers filled",
    input: "Minutes",
    output: "Containers",
  },
  {
    key: "plants-watered",
    caption: "Rounds and plants watered",
    input: "Rounds",
    output: "Plants",
  },
] as const;

const rateTableFrames = [
  {
    key: "change-per-unit",
    render: (input: string, output: string) =>
      `According to the table, how much does ${output.toLocaleLowerCase("en-US")} increase for each additional ${singular(input).toLocaleLowerCase("en-US")}?`,
  },
  {
    key: "constant-rate",
    render: (input: string, output: string) =>
      `Find the constant rate of change in ${output.toLocaleLowerCase("en-US")} per ${singular(input).toLocaleLowerCase("en-US")}.`,
  },
  {
    key: "difference-quotient",
    render: (input: string, output: string) =>
      `Use two rows to calculate the change in ${output.toLocaleLowerCase("en-US")} divided by the change in ${input.toLocaleLowerCase("en-US")}.`,
  },
  {
    key: "relationship-rate",
    render: (input: string, output: string) =>
      `What numerical rate describes the linear relationship between ${input.toLocaleLowerCase("en-US")} and ${output.toLocaleLowerCase("en-US")} in the table?`,
  },
] as const;

const circularRouteContexts = [
  "walking path",
  "cycling loop",
  "training track",
  "garden border route",
  "exhibit route",
  "courtyard loop",
] as const;

const circularRouteFrames = [
  {
    key: "multiple-laps",
    render: (context: string, radius: number, laps: number) =>
      `A circular ${context} has a radius of ${radius} meters. A participant completes ${laps} full laps. Using 3.14 for π, how many meters does the participant travel?`,
  },
  {
    key: "circumference-then-scale",
    render: (context: string, radius: number, laps: number) =>
      `The radius of a circular ${context} is ${radius} meters. Find one circumference using π = 3.14, then find the total distance for ${laps} laps. Enter the total number of meters.`,
  },
  {
    key: "repeated-circuit",
    render: (context: string, radius: number, laps: number) =>
      `A ${context} forms a circle with radius ${radius} meters. What total distance is covered by going around the circle ${laps} times? Use π = 3.14.`,
  },
  {
    key: "route-distance",
    render: (context: string, radius: number, laps: number) =>
      `For a circular ${context}, r = ${radius} meters. Calculate ${laps}(2πr) with π = 3.14 to determine the route distance in meters.`,
  },
] as const;

export const mathVariantOutlineDepthTemplates: readonly DeterministicVariantTemplate[] =
  [
    {
      key: "math.arithmetic.round-each-estimate",
      version: 1,
      targetSkillCode: "MATH.ARITHMETIC",
      questionType: "SINGLE_CHOICE",
      difficulty: "FOUNDATIONAL",
      structureCapacity: estimationContexts.length * estimationFrames.length,
      generate(random) {
        const context = random.pick(estimationContexts);
        const frame = random.pick(estimationFrames);
        const firstOnes = random.pick([1, 2, 3, 4] as const);
        let secondOnes = random.pick([6, 7, 8, 9] as const);
        if (firstOnes + secondOnes === 10) {
          secondOnes = secondOnes === 9 ? 8 : 9;
        }
        const first = random.integer(2, 8) * 10 + firstOnes;
        const second = random.integer(2, 8) * 10 + secondOnes;
        const roundedFirst = Math.round(first / 10) * 10;
        const roundedSecond = Math.round(second / 10) * 10;
        const answer = roundedFirst + roundedSecond;
        const exact = first + second;
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: {
            first,
            second,
            roundedFirst,
            roundedSecond,
            answer,
          },
          candidate: singleChoiceNumericCandidate(random, {
            prompt: frame.render(first, second, context.noun),
            answer,
            distractors: [
              {
                id: "exact",
                value: exact,
                rationale:
                  "This is the exact sum. The prompt asks for the result after rounding each quantity first.",
              },
              {
                id: "both-down",
                value: roundedFirst + (roundedSecond - 10),
                rationale:
                  "This rounds both quantities down instead of rounding the second quantity to the nearest ten.",
              },
              {
                id: "both-up",
                value: roundedFirst + 10 + roundedSecond,
                rationale:
                  "This rounds both quantities up instead of rounding the first quantity to the nearest ten.",
              },
            ],
            verificationExpression: [roundedFirst, roundedSecond, "add"],
            learningObjective:
              "Estimate a real-world total by rounding each quantity to the nearest ten before adding.",
            difficulty: "FOUNDATIONAL",
            difficultyRationale:
              "The rounding place is given, and the learner applies one familiar estimation strategy to two whole numbers.",
            estimatedSeconds: 65,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `${first} rounds to ${roundedFirst}, and ${second} rounds to ${roundedSecond}. Add the rounded values: ${roundedFirst} + ${roundedSecond} = ${answer}.`,
            misconceptionCode: "COMPUTES_EXACT_TOTAL_INSTEAD_OF_ESTIMATE",
            misconceptionChoiceId: "exact",
            misconceptionMessage:
              "The exact sum does not answer a prompt that explicitly asks you to round each quantity first.",
            tutorQuestion:
              "What is the nearest multiple of ten for each quantity?",
            tutorHint:
              "Round each number separately; then add the two rounded values.",
            reflection:
              "When might an estimate be more useful than an exact total?",
          }),
        };
      },
    },
    {
      key: "math.data-interpretation.table-maximum",
      version: 1,
      targetSkillCode: "MATH.DATA_INTERPRETATION",
      questionType: "SINGLE_CHOICE",
      difficulty: "FOUNDATIONAL",
      structureCapacity:
        tableMaximumContexts.length * tableMaximumFrames.length,
      generate(random) {
        const context = random.pick(tableMaximumContexts);
        const frame = random.pick(tableMaximumFrames);
        const base = random.integer(8, 24);
        const values = random.shuffle([base, base + 3, base + 7, base + 12]);
        const rows = context.categories.map((category, index) => [
          category,
          String(values[index]),
        ]);
        const answer = Math.max(...values);
        const minimum = Math.min(...values);
        const distractorValues = values.filter((value) => value !== answer);
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { values, answer },
          candidate: singleChoiceNumericCandidate(random, {
            stimulus: {
              type: "table",
              caption: context.caption,
              columns: [context.categoryHeader, context.valueHeader],
              rows,
            },
            prompt: frame.render(context.valueHeader),
            answer,
            distractors: distractorValues.map((value, index) => ({
              id: value === minimum ? "minimum" : `other-${index}`,
              value,
              rationale:
                value === minimum
                  ? "This is the smallest table value, not the greatest."
                  : "This value appears in the table but another row contains a larger number.",
            })),
            verificationExpression: [answer],
            learningObjective:
              "Compare numerical values in a table and identify the maximum.",
            difficulty: "FOUNDATIONAL",
            difficultyRationale:
              "The learner reads one numeric column and makes a direct whole-number comparison without calculation.",
            estimatedSeconds: 45,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `The values are ${values.join(", ")}. The greatest of these is ${answer}.`,
            misconceptionCode: "SELECTS_TABLE_MINIMUM",
            misconceptionChoiceId: "minimum",
            misconceptionMessage:
              "The minimum is the smallest value. Scan for the value greater than every other entry.",
            tutorQuestion:
              "Which table value is greater than each of the other three values?",
            tutorHint:
              "Compare the tens digits first, then the ones digits when needed.",
            reflection:
              "How would you identify the minimum from the same table?",
          }),
        };
      },
    },
    {
      key: "math.data-interpretation.linear-rate-table",
      version: 1,
      targetSkillCode: "MATH.DATA_INTERPRETATION",
      questionType: "NUMERIC",
      difficulty: "PROFICIENT",
      structureCapacity: rateTableContexts.length * rateTableFrames.length,
      generate(random) {
        const context = random.pick(rateTableContexts);
        const frame = random.pick(rateTableFrames);
        const rate = random.integer(3, 12);
        let initial = random.integer(1, 8);
        if (initial === rate) initial += 1;
        const start = random.integer(1, 4);
        const inputs = [start, start + 2, start + 5];
        const outputs = inputs.map((value) => initial + rate * value);
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { rate, initial, inputs, outputs },
          candidate: numericCandidate({
            stimulus: {
              type: "table",
              caption: context.caption,
              columns: [context.input, context.output],
              rows: inputs.map((value, index) => [
                String(value),
                String(outputs[index]),
              ]),
            },
            prompt: frame.render(context.input, context.output),
            answer: rate,
            verificationSpec: {
              kind: "numeric_result",
              expression: [
                outputs[1]!,
                outputs[0]!,
                "subtract",
                inputs[1]!,
                inputs[0]!,
                "subtract",
                "divide",
              ],
              tolerance: 0,
            },
            learningObjective:
              "Determine a constant rate of change from paired values in a table.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must coordinate two table columns and divide output change by input change rather than read a value directly.",
            estimatedSeconds: 90,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `Using the first two rows, the output changes by ${outputs[1]! - outputs[0]!} while the input changes by ${inputs[1]! - inputs[0]!}. The rate is ${outputs[1]! - outputs[0]!} ÷ ${inputs[1]! - inputs[0]!} = ${rate} per input unit.`,
            misconception: {
              code: "USES_STARTING_VALUE_AS_RATE",
              value: initial,
              message:
                "The starting amount is not the rate. Compare changes in both columns between two rows.",
            },
            tutorQuestion:
              "Between two rows, how much does each column change?",
            tutorHint: "Compute change in output divided by change in input.",
            reflection:
              "How can a third row confirm that the rate is constant?",
          }),
        };
      },
    },
    {
      key: "math.geometry.circular-route-laps",
      version: 1,
      targetSkillCode: "MATH.GEOMETRY",
      questionType: "NUMERIC",
      difficulty: "ADVANCED",
      structureCapacity: 20,
      generate(random) {
        const context = random.pick(circularRouteContexts);
        const frame = random.pick(circularRouteFrames);
        const radius = random.integer(3, 15);
        const laps = random.integer(2, 6);
        const oneLap = roundHundredth(2 * 3.14 * radius);
        const answer = roundHundredth(oneLap * laps);
        return {
          structureKey: `${slug(context)}.${frame.key}`,
          parameters: { radius, laps, oneLap, answer },
          candidate: numericCandidate({
            prompt: frame.render(context, radius, laps),
            answer,
            tolerance: 0.01,
            verificationSpec: {
              kind: "numeric_result",
              expression: [
                2,
                3.14,
                "multiply",
                radius,
                "multiply",
                laps,
                "multiply",
              ],
              tolerance: 0.01,
            },
            learningObjective:
              "Apply the circumference formula and scale the result across repeated circular laps.",
            difficulty: "ADVANCED",
            difficultyRationale:
              "The learner must interpret radius, calculate circumference with a stated approximation of pi, and scale that intermediate result by a lap count.",
            estimatedSeconds: 120,
            calculatorPolicy: "ALLOWED",
            explanation: `One lap is 2 × 3.14 × ${radius} = ${formatNumber(oneLap)} meters. For ${laps} laps, ${formatNumber(oneLap)} × ${laps} = ${formatNumber(answer)} meters.`,
            misconception: {
              code: "REPORTS_ONE_CIRCUMFERENCE_ONLY",
              value: oneLap,
              tolerance: 0.01,
              message:
                "This is the distance for one lap. Multiply the circumference by the total number of laps.",
            },
            tutorQuestion:
              "What distance does the circumference formula give before the lap count is applied?",
            tutorHint:
              "Find 2 × 3.14 × radius for one lap, then multiply by the number of laps.",
            reflection:
              "How would the total distance change if the number of laps doubled?",
          }),
        };
      },
    },
  ];

function singleChoiceNumericCandidate(
  random: SeededRandom,
  input: {
    stimulus?: QuestionStimulus;
    prompt: string;
    answer: number;
    distractors: { id: string; value: number; rationale: string }[];
    verificationExpression: RpnExpression;
    learningObjective: string;
    difficulty: GeneratedCandidate["difficulty"];
    difficultyRationale: string;
    estimatedSeconds: number;
    calculatorPolicy: GeneratedCandidate["calculatorPolicy"];
    explanation: string;
    misconceptionCode: string;
    misconceptionChoiceId: string;
    misconceptionMessage: string;
    tutorQuestion: string;
    tutorHint: string;
    reflection: string;
  },
): GeneratedCandidate {
  return {
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: input.prompt,
      stimulus: input.stimulus,
      choices: random.shuffle([
        { id: "correct", content: formatNumber(input.answer) },
        ...input.distractors.map((item) => ({
          id: item.id,
          content: formatNumber(item.value),
        })),
      ]),
      answerSpec: { type: "single_choice", choiceId: "correct" },
      explanation: input.explanation,
      distractorRationales: Object.fromEntries(
        input.distractors.map((item) => [item.id, item.rationale]),
      ),
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
    commonMisconceptions: [input.misconceptionCode],
    misconceptionRules: [
      {
        id: "targeted-choice-misconception",
        kind: "selected_choice",
        code: input.misconceptionCode,
        choiceId: input.misconceptionChoiceId,
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
  stimulus?: QuestionStimulus;
  prompt: string;
  answer: number;
  tolerance?: number;
  verificationSpec: GeneratedCandidate["verificationSpec"];
  learningObjective: string;
  difficulty: GeneratedCandidate["difficulty"];
  difficultyRationale: string;
  estimatedSeconds: number;
  calculatorPolicy: GeneratedCandidate["calculatorPolicy"];
  explanation: string;
  misconception: {
    code: string;
    value: number;
    tolerance?: number;
    message: string;
  };
  tutorQuestion: string;
  tutorHint: string;
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
        tolerance: input.tolerance ?? 0,
        toleranceMode: "absolute",
        acceptedUnits: [],
        unitRequired: false,
      },
      explanation: input.explanation,
      distractorRationales: {},
    },
    verificationSpec: input.verificationSpec,
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
        tolerance: input.misconception.tolerance ?? 0,
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
        { id: "apply-relationship", kind: "HINT", content: input.tutorHint },
      ],
      reflectionPrompt: input.reflection,
    },
  };
}

function roundHundredth(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatNumber(value: number) {
  return Number.parseFloat(value.toFixed(4)).toString();
}

function singular(value: string) {
  return value.endsWith("s") ? value.slice(0, -1) : value;
}

function slug(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}
