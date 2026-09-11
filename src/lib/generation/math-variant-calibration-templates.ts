import type { GeneratedCandidate } from "./contracts";
import type {
  DeterministicVariantTemplate,
  SeededRandom,
} from "./deterministic-variants";
import type {
  QuestionStimulus,
  RpnExpression,
} from "@/lib/questions/contracts";

const decimalContexts = [
  { key: "meter-reading", lead: "A digital meter displays" },
  { key: "recorded-distance", lead: "A recorded distance is" },
  { key: "container-volume", lead: "A container label shows" },
  { key: "measurement-log", lead: "A measurement log lists" },
  { key: "decimal-card", lead: "A study card contains the decimal" },
] as const;

const decimalFrames = [
  {
    key: "digit-value",
    render: (lead: string, value: string, digit: number) =>
      `${lead} ${value}. What is the value of the digit ${digit}?`,
  },
  {
    key: "place-value-amount",
    render: (lead: string, value: string, digit: number) =>
      `${lead} ${value}. Express the place-value amount represented by ${digit} as a decimal.`,
  },
  {
    key: "not-digit-alone",
    render: (lead: string, value: string, digit: number) =>
      `${lead} ${value}. The digit ${digit} does not represent ${digit} whole units. What decimal amount does it represent?`,
  },
  {
    key: "identify-value",
    render: (lead: string, value: string, digit: number) =>
      `${lead} ${value}. Identify the value contributed by the digit ${digit}.`,
  },
] as const;

const perimeterContexts = [
  "bulletin board",
  "rectangular garden",
  "photo frame",
  "training-room mat",
  "display panel",
] as const;

const perimeterFrames = [
  {
    key: "border-length",
    render: (context: string, length: number, width: number) =>
      `A ${context} is ${length} units long and ${width} units wide. How many units of border surround it?`,
  },
  {
    key: "distance-around",
    render: (context: string, length: number, width: number) =>
      `Find the distance around a rectangular ${context} with length ${length} units and width ${width} units.`,
  },
  {
    key: "perimeter-context",
    render: (context: string, length: number, width: number) =>
      `A rectangular ${context} measures ${length} by ${width} units. Which value is its perimeter?`,
  },
  {
    key: "all-four-sides",
    render: (context: string, length: number, width: number) =>
      `The long sides of a ${context} are each ${length} units, and the short sides are each ${width} units. What is the total length of all four sides?`,
  },
] as const;

const ratioContexts = [
  {
    key: "paint-mixture",
    first: "blue paint",
    second: "white paint",
    scenario: "An art studio prepares a color blend for a mural.",
  },
  {
    key: "trail-mix",
    first: "cereal",
    second: "dried fruit",
    scenario: "A hiking club assembles trail mix for a weekend trip.",
  },
  {
    key: "potting-blend",
    first: "compost",
    second: "soil",
    scenario: "A garden team combines materials for new planting beds.",
  },
  {
    key: "craft-pulp",
    first: "paper pulp",
    second: "water",
    scenario: "A craft workshop mixes pulp for handmade paper sheets.",
  },
  {
    key: "birdseed-blend",
    first: "sunflower seed",
    second: "millet",
    scenario: "A nature center portions a seed blend for feeders.",
  },
] as const;

const ratioFrames = [
  {
    key: "scaled-total-pints",
    render: ratioPrompt,
  },
  {
    key: "repeat-recipe-convert",
    render: (
      scenario: string,
      first: string,
      second: string,
      firstCups: number,
      secondCups: number,
      scale: number,
    ) =>
      `${scenario} One recipe combines ${firstCups} cups of ${first} with ${secondCups} cups of ${second}. After making the recipe ${scale} times, the finished blend is poured into one-pint containers that each hold 2 cups. How many containers can be filled?`,
  },
  {
    key: "ratio-batches",
    render: (
      scenario: string,
      first: string,
      second: string,
      firstCups: number,
      secondCups: number,
      scale: number,
    ) =>
      `${scenario} For every ${firstCups} cups of ${first}, the blend requires ${secondCups} cups of ${second}. The team prepares ${scale} full batches. Determine the combined volume, then express it in pints using 2 cups per pint.`,
  },
  {
    key: "combine-scale-convert",
    render: (
      scenario: string,
      first: string,
      second: string,
      firstCups: number,
      secondCups: number,
      scale: number,
    ) =>
      `${scenario} Each batch needs ${firstCups} cups of ${first} and ${secondCups} cups of ${second}. After ${scale} batches, the result is divided into portions of 2 cups each. How many one-pint portions result?`,
  },
] as const;

const frequencyContexts = [
  {
    key: "quiz-scores",
    value: "Quiz score",
    frequency: "Learners",
    scenario: "A class summarizes the quiz scores earned by its learners.",
  },
  {
    key: "books-read",
    value: "Books read",
    frequency: "Readers",
    scenario:
      "A reading club groups members by the number of books they finished.",
  },
  {
    key: "visits",
    value: "Visits",
    frequency: "Members",
    scenario:
      "A community center records how many visits each member completed.",
  },
  {
    key: "practice-sets",
    value: "Practice sets",
    frequency: "Students",
    scenario:
      "A study group counts the practice sets completed by each student.",
  },
  {
    key: "daily-calls",
    value: "Calls handled",
    frequency: "Days",
    scenario: "A service desk groups workdays by the number of calls handled.",
  },
] as const;

const frequencyFrames = [
  {
    key: "mean-from-frequency",
    render: (scenario: string) =>
      `${scenario} Use the frequency table to find the mean value, rounded to the nearest tenth.`,
  },
  {
    key: "weighted-average",
    render: (scenario: string) =>
      `${scenario} Calculate the weighted average represented by the table, rounded to the nearest tenth.`,
  },
  {
    key: "account-for-frequency",
    render: (scenario: string) =>
      `${scenario} Each listed value occurs the number of times shown. What is the arithmetic mean of all observations to the nearest tenth?`,
  },
  {
    key: "total-over-count",
    render: (scenario: string) =>
      `${scenario} Use each row's value and frequency to form a combined total. What mean results to the nearest tenth?`,
  },
] as const;

export const mathVariantCalibrationTemplates: readonly DeterministicVariantTemplate[] =
  [
    {
      key: "math.fractions.decimal-place-value",
      version: 1,
      targetSkillCode: "MATH.FRACTIONS_DECIMALS_PERCENT",
      questionType: "NUMERIC",
      difficulty: "FOUNDATIONAL",
      structureCapacity: decimalContexts.length * decimalFrames.length,
      generate(random) {
        const context = random.pick(decimalContexts);
        const frame = random.pick(decimalFrames);
        const digits = [
          random.integer(1, 9),
          random.integer(1, 9),
          random.integer(1, 9),
        ];
        const placeIndex = random.integer(0, 2);
        const digit = digits[placeIndex]!;
        const denominator = 10 ** (placeIndex + 1);
        const answer = digit / denominator;
        const displayed = `${random.integer(1, 99)}.${digits.join("")}`;
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { displayed, digit, placeIndex, denominator, answer },
          candidate: numericCandidate({
            prompt: frame.render(context.lead, displayed, digit),
            answer,
            verificationExpression: [digit, denominator, "divide"],
            learningObjective:
              "Determine the value represented by a digit in the tenths, hundredths, or thousandths place.",
            difficulty: "FOUNDATIONAL",
            difficultyRationale:
              "The learner identifies one decimal place and expresses the digit's value without a multi-step calculation.",
            estimatedSeconds: 45,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `The digit ${digit} is ${placeIndex === 0 ? "in the tenths place" : placeIndex === 1 ? "in the hundredths place" : "in the thousandths place"}. Its value is ${digit} ÷ ${denominator} = ${formatNumber(answer)}.`,
            misconception: {
              code: "DIGIT_CONFUSED_WITH_PLACE_VALUE",
              value: digit,
              message:
                "The digit itself is not its value in the number. Use its position to divide by 10, 100, or 1,000.",
            },
            tutorQuestion:
              "How many places to the right of the decimal point is the target digit?",
            tutorHint:
              "Tenths means divide by 10, hundredths by 100, and thousandths by 1,000.",
            reflection:
              "How would moving the same digit one place to the right change its value?",
          }),
        };
      },
    },
    {
      key: "math.measurement.rectangle-perimeter-context",
      version: 1,
      targetSkillCode: "MATH.MEASUREMENT",
      questionType: "SINGLE_CHOICE",
      difficulty: "FOUNDATIONAL",
      structureCapacity: perimeterContexts.length * perimeterFrames.length,
      generate(random) {
        const context = random.pick(perimeterContexts);
        const frame = random.pick(perimeterFrames);
        const length = random.integer(7, 18);
        const width = random.integer(3, 6);
        const answer = 2 * (length + width);
        const area = length * width;
        const oneLengthOneWidth = length + width;
        const missesOneWidth = 2 * length + width;
        return {
          structureKey: `${slug(context)}.${frame.key}`,
          parameters: { length, width, answer },
          candidate: singleChoiceCandidate(random, {
            prompt: frame.render(context, length, width),
            answer,
            wrongAnswers: [area, oneLengthOneWidth, missesOneWidth],
            verificationExpression: [length, width, "add", 2, "multiply"],
            learningObjective:
              "Find the perimeter of a rectangle by accounting for both pairs of equal sides.",
            difficulty: "FOUNDATIONAL",
            difficultyRationale:
              "The learner distinguishes distance around a rectangle from area and performs one direct formula substitution.",
            estimatedSeconds: 55,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `A rectangle has two sides of each length. Add all four sides: ${length} + ${width} + ${length} + ${width} = ${answer} units.`,
            misconceptionCode: "USES_AREA_FOR_PERIMETER",
            misconceptionMessage:
              "Multiplying length by width finds area, not the distance around the rectangle.",
            distractorExplanations: [
              `${length} × ${width} = ${area} is the area, not the perimeter.`,
              `${length} + ${width} counts only one long side and one short side.`,
              `${missesOneWidth} includes both long sides but only one short side.`,
            ],
            tutorQuestion:
              "How many sides have the given length, and how many have the given width?",
            tutorHint: "Perimeter counts all four outer sides.",
            reflection:
              "Why are the units for perimeter not written as square units?",
          }),
        };
      },
    },
    {
      key: "math.ratios.scaled-mixture-unit-conversion",
      version: 1,
      targetSkillCode: "MATH.RATIOS_PROPORTIONS",
      questionType: "NUMERIC",
      difficulty: "ADVANCED",
      structureCapacity: ratioContexts.length * ratioFrames.length,
      generate(random) {
        const context = random.pick(ratioContexts);
        const frame = random.pick(ratioFrames);
        const firstCups = random.integer(2, 7);
        const secondCups = random.integer(3, 9);
        const scale = random.pick([4, 6, 8] as const);
        const totalCups = (firstCups + secondCups) * scale;
        const answer = totalCups / 2;
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { firstCups, secondCups, scale, totalCups, answer },
          candidate: numericCandidate({
            prompt: frame.render(
              context.scenario,
              context.first,
              context.second,
              firstCups,
              secondCups,
              scale,
            ),
            answer,
            verificationExpression: [
              firstCups,
              secondCups,
              "add",
              scale,
              "multiply",
              2,
              "divide",
            ],
            learningObjective:
              "Scale both parts of a ratio, combine them, and convert the resulting total to another unit.",
            difficulty: "ADVANCED",
            difficultyRationale:
              "The learner coordinates ratio composition, repeated scaling, and a final unit conversion across three linked steps.",
            estimatedSeconds: 115,
            calculatorPolicy: "ALLOWED",
            explanation: `One batch contains ${firstCups} + ${secondCups} = ${firstCups + secondCups} cups. ${scale} batches contain ${firstCups + secondCups} × ${scale} = ${totalCups} cups. Divide by 2 cups per pint: ${totalCups} ÷ 2 = ${answer} pints.`,
            misconception: {
              code: "OMITS_FINAL_UNIT_CONVERSION",
              value: totalCups,
              message:
                "That is the scaled total in cups. Divide by 2 to express the same volume in pints.",
            },
            tutorQuestion:
              "What is the total number of cups in one complete batch before scaling?",
            tutorHint:
              "Scale the complete batch first, then use 2 cups for every 1 pint.",
            reflection:
              "How can unit labels in each intermediate line prevent a conversion-direction error?",
          }),
        };
      },
    },
    {
      key: "math.statistics.weighted-mean-frequency-table",
      version: 1,
      targetSkillCode: "MATH.PROBABILITY_STATISTICS",
      questionType: "NUMERIC",
      difficulty: "ADVANCED",
      structureCapacity: frequencyContexts.length * frequencyFrames.length,
      generate(random) {
        const context = random.pick(frequencyContexts);
        const frame = random.pick(frequencyFrames);
        const start = random.integer(4, 15);
        const step = random.integer(2, 6);
        const values = [start, start + step, start + 2 * step] as const;
        const frequencies = random.pick([
          [1, 2, 5],
          [2, 3, 6],
          [1, 3, 4],
          [2, 4, 5],
        ] as const);
        const weightedTotal =
          values[0] * frequencies[0] +
          values[1] * frequencies[1] +
          values[2] * frequencies[2];
        const observationCount = frequencies.reduce(
          (sum, frequency) => sum + frequency,
          0,
        );
        const exactMean = weightedTotal / observationCount;
        const answer = roundTenth(exactMean);
        const unweightedMean = values[1];
        const stimulus: QuestionStimulus = {
          type: "table",
          caption: `${context.value} frequency distribution`,
          columns: [context.value, context.frequency],
          rows: values.map((value, index) => [
            String(value),
            String(frequencies[index]),
          ]),
        };
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: {
            values: [...values],
            frequencies: [...frequencies],
            weightedTotal,
            observationCount,
            answer,
          },
          candidate: numericCandidate({
            stimulus,
            prompt: frame.render(context.scenario),
            answer,
            tolerance: 0.051,
            verificationExpression: [
              values[0],
              frequencies[0],
              "multiply",
              values[1],
              frequencies[1],
              "multiply",
              "add",
              values[2],
              frequencies[2],
              "multiply",
              "add",
              observationCount,
              "divide",
            ],
            learningObjective:
              "Compute a mean from a frequency table by weighting each value by its number of observations.",
            difficulty: "ADVANCED",
            difficultyRationale:
              "The learner must interpret frequencies, construct a weighted total, count all observations, divide, and round appropriately.",
            estimatedSeconds: 125,
            calculatorPolicy: "ALLOWED",
            explanation: `The weighted total is (${values[0]} × ${frequencies[0]}) + (${values[1]} × ${frequencies[1]}) + (${values[2]} × ${frequencies[2]}) = ${weightedTotal}. There are ${observationCount} observations, so the mean is ${weightedTotal} ÷ ${observationCount} = ${formatNumber(exactMean)}, or ${answer} to the nearest tenth.`,
            misconception: {
              code: "IGNORES_FREQUENCIES_IN_MEAN",
              value: unweightedMean,
              tolerance: 0.01,
              message:
                "Averaging only the three displayed values ignores how many times each value occurs. Multiply by each frequency first.",
            },
            tutorQuestion:
              "How many actual observations does each table row represent?",
            tutorHint:
              "Multiply each value by its frequency, add those products, and divide by the sum of the frequencies.",
            reflection:
              "Why would treating each row as one observation change the mean?",
          }),
        };
      },
    },
  ];

function ratioPrompt(
  scenario: string,
  first: string,
  second: string,
  firstCups: number,
  secondCups: number,
  scale: number,
) {
  return `${scenario} A batch contains ${firstCups} cups of ${first} and ${secondCups} cups of ${second}. If the recipe is scaled by a factor of ${scale}, how many pints result? Use 2 cups = 1 pint.`;
}

function numericCandidate(input: {
  stimulus?: QuestionStimulus;
  prompt: string;
  answer: number;
  tolerance?: number;
  verificationExpression: RpnExpression;
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
    verificationSpec: {
      kind: "numeric_result",
      expression: input.verificationExpression,
      tolerance: input.tolerance ?? 0,
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

function singleChoiceCandidate(
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
    tutorHint: string;
    reflection: string;
  },
): GeneratedCandidate {
  return {
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: input.prompt,
      choices: random.shuffle([
        { id: "correct", content: String(input.answer) },
        { id: "area", content: String(input.wrongAnswers[0]) },
        { id: "half-perimeter", content: String(input.wrongAnswers[1]) },
        { id: "missing-side", content: String(input.wrongAnswers[2]) },
      ]),
      answerSpec: { type: "single_choice", choiceId: "correct" },
      explanation: input.explanation,
      distractorRationales: {
        area: input.distractorExplanations[0],
        "half-perimeter": input.distractorExplanations[1],
        "missing-side": input.distractorExplanations[2],
      },
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
        id: "selects-area",
        kind: "selected_choice",
        code: input.misconceptionCode,
        choiceId: "area",
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

function roundTenth(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function formatNumber(value: number) {
  return Number.parseFloat(value.toFixed(4)).toString();
}

function slug(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}
