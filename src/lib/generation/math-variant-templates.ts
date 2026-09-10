import type { GeneratedCandidate } from "./contracts";
import type { DeterministicVariantTemplate } from "./deterministic-variants";
import type { RpnExpression } from "@/lib/questions/contracts";

type PromptFrame = {
  key: string;
  render(values: Record<string, string | number>): string;
};

const ratioContexts = [
  { key: "study-cards", item: "study cards", container: "review sets" },
  { key: "supply-labels", item: "supply labels", container: "storage bins" },
  { key: "training-pages", item: "training pages", container: "packets" },
  { key: "seed-trays", item: "seedlings", container: "trays" },
  { key: "event-bottles", item: "water bottles", container: "tables" },
] as const;

const ratioFrames: PromptFrame[] = [
  {
    key: "known-to-target",
    render: ({
      knownItems,
      knownContainers,
      targetContainers,
      item,
      container,
    }) =>
      `${knownItems} ${item} are divided equally among ${knownContainers} ${container}. At the same rate, how many ${item} are needed for ${targetContainers} ${container}?`,
  },
  {
    key: "per-group-scale",
    render: ({
      knownItems,
      knownContainers,
      targetContainers,
      item,
      container,
    }) =>
      `A plan assigns ${knownItems} ${item} to ${knownContainers} ${container}. The assignment rate stays constant. Find the number of ${item} for ${targetContainers} ${container}.`,
  },
  {
    key: "equivalent-ratio-context",
    render: ({
      knownItems,
      knownContainers,
      targetContainers,
      item,
      container,
    }) =>
      `The ratio of ${item} to ${container} is ${knownItems}:${knownContainers}. What first value makes an equivalent ratio with ${targetContainers} as the second value?`,
  },
  {
    key: "unit-rate-transfer",
    render: ({
      knownItems,
      knownContainers,
      targetContainers,
      item,
      container,
    }) =>
      `${knownContainers} ${container} require ${knownItems} ${item} in total. Use the unit rate to determine the total for ${targetContainers} ${container}.`,
  },
] as const;

const purchaseContexts = [
  "a certification review book",
  "a set of noise-canceling headphones",
  "a desk chair",
  "a graphing notebook bundle",
  "a reusable meal container set",
] as const;

const purchaseFrames: PromptFrame[] = [
  {
    key: "discount-then-tax",
    render: ({ item, price, discount, tax }) =>
      `The listed price of ${item} is $${price}. A ${discount}% discount is applied before ${tax}% sales tax. What is the final cost, rounded to the nearest cent?`,
  },
  {
    key: "coupon-and-tax",
    render: ({ item, price, discount, tax }) =>
      `A shopper uses a ${discount}% coupon on ${item} priced at $${price}. Sales tax of ${tax}% is calculated on the discounted price. Find the amount paid to the nearest cent.`,
  },
  {
    key: "two-stage-price",
    render: ({ item, price, discount, tax }) =>
      `${item} costs $${price} before a ${discount}% markdown. After the markdown, a ${tax}% tax is added. Calculate the checkout price to the nearest cent.`,
  },
  {
    key: "sale-sequence",
    render: ({ item, price, discount, tax }) =>
      `For ${item}, first reduce the $${price} price by ${discount}%, then increase the reduced amount by ${tax}% for tax. What is the resulting cost to the nearest cent?`,
  },
] as const;

const meanContexts = [
  { key: "practice-scores", noun: "practice scores" },
  { key: "daily-pages", noun: "pages read each day" },
  { key: "task-times", noun: "task times in minutes" },
  { key: "weekly-miles", noun: "miles walked each week" },
  { key: "supply-counts", noun: "supply counts" },
] as const;

const meanFrames: PromptFrame[] = [
  {
    key: "missing-fifth",
    render: ({ noun, a, b, c, d, mean }) =>
      `Five ${noun} have a mean of ${mean}. Four values are ${a}, ${b}, ${c}, and ${d}. What is the fifth value?`,
  },
  {
    key: "target-average",
    render: ({ noun, a, b, c, d, mean }) =>
      `The target average for five ${noun} is ${mean}. The first four values are ${a}, ${b}, ${c}, and ${d}. Find the final value needed to reach the target average.`,
  },
  {
    key: "unknown-observation",
    render: ({ noun, a, b, c, d, mean }) =>
      `A set of five ${noun} is represented by ${a}, ${b}, ${c}, ${d}, and x. If the arithmetic mean is ${mean}, determine x.`,
  },
  {
    key: "total-from-mean",
    render: ({ noun, a, b, c, d, mean }) =>
      `The mean of five ${noun} equals ${mean}. After adding the known values ${a}, ${b}, ${c}, and ${d}, what remaining value completes the data set?`,
  },
] as const;

export const mathDeterministicVariantTemplates: readonly DeterministicVariantTemplate[] =
  [
    {
      key: "math.ratios.constant-rate",
      version: 1,
      targetSkillCode: "MATH.RATIOS_PROPORTIONS",
      questionType: "NUMERIC",
      difficulty: "DEVELOPING",
      generate(random) {
        const context = random.pick(ratioContexts);
        const frame = random.pick(ratioFrames);
        const knownContainers = random.integer(2, 8);
        const itemsPerContainer = random.integer(3, 14);
        const targetContainers = random.integer(knownContainers + 2, 18);
        const knownItems = knownContainers * itemsPerContainer;
        const answer = targetContainers * itemsPerContainer;
        const commonWrong = knownItems + targetContainers;
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: {
            knownContainers,
            itemsPerContainer,
            targetContainers,
            knownItems,
            answer,
          },
          candidate: numericCandidate({
            prompt: frame.render({
              ...context,
              knownContainers,
              targetContainers,
              knownItems,
            }),
            answer,
            verificationExpression: [
              knownItems,
              knownContainers,
              "divide",
              targetContainers,
              "multiply",
            ],
            learningObjective:
              "Use a constant unit rate to find an equivalent quantity.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must derive a unit rate and transfer it to a new quantity.",
            estimatedSeconds: 80,
            calculatorPolicy: "ALLOWED",
            explanation: `First find the unit rate: ${knownItems} ÷ ${knownContainers} = ${itemsPerContainer}. Then scale to ${targetContainers}: ${itemsPerContainer} × ${targetContainers} = ${answer}.`,
            misconception: {
              code: "ADDITIVE_INSTEAD_OF_MULTIPLICATIVE",
              value: commonWrong,
              message:
                "You may have combined the quantities additively. A constant ratio requires finding or applying the multiplicative unit rate.",
            },
            tutorQuestion:
              "What quantity does one group receive before you scale to the new number of groups?",
            reflection:
              "How could you verify the new pair forms the same ratio as the original pair?",
          }),
        };
      },
    },
    {
      key: "math.percent.discount-tax-sequence",
      version: 1,
      targetSkillCode: "MATH.FRACTIONS_DECIMALS_PERCENT",
      questionType: "NUMERIC",
      difficulty: "PROFICIENT",
      generate(random) {
        const item = random.pick(purchaseContexts);
        const frame = random.pick(purchaseFrames);
        const price = random.integer(4, 24) * 5;
        const discount = random.pick([10, 15, 20, 25, 30] as const);
        const tax = random.pick([5, 6, 7, 8] as const);
        const discounted = price * (1 - discount / 100);
        const answer = roundCents(discounted * (1 + tax / 100));
        // A half-cent can be represented a few quadrillionths above 0.005 in
        // binary floating point. Keep the mathematical nearest-cent boundary
        // while allowing that representation noise in deterministic checks.
        const roundingTolerance = 0.005_001;
        return {
          structureKey: `${slug(item)}.${frame.key}`,
          parameters: { price, discount, tax, discounted, answer },
          candidate: numericCandidate({
            prompt: frame.render({ item, price, discount, tax }),
            answer,
            tolerance: roundingTolerance,
            verificationExpression: [
              discounted,
              discounted,
              tax,
              100,
              "divide",
              "multiply",
              "add",
            ],
            learningObjective:
              "Apply a percent decrease followed by a percent increase in the correct order.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must preserve the order of two percent operations and round a contextual result.",
            estimatedSeconds: 110,
            calculatorPolicy: "ALLOWED",
            explanation: `The discount gives $${formatMoney(price)} × (1 - ${discount}/100) = $${formatMoney(discounted)}. Apply tax to that reduced amount: $${formatMoney(discounted)} × (1 + ${tax}/100) = $${formatMoney(answer)}.`,
            misconception: {
              code: "PERCENT_CHANGES_COMBINED_ADDITIVELY",
              value: roundCents(price * (1 - discount / 100 + tax / 100)),
              message:
                "You may have combined the two percentages using the original price as both bases. Apply tax to the already discounted amount.",
            },
            tutorQuestion:
              "After the first percent operation, which amount becomes the base for the tax calculation?",
            reflection:
              "Why is subtracting the discount percent and then adding the tax percent directly unreliable?",
          }),
        };
      },
    },
    {
      key: "math.statistics.missing-value-from-mean",
      version: 1,
      targetSkillCode: "MATH.PROBABILITY_STATISTICS",
      questionType: "NUMERIC",
      difficulty: "PROFICIENT",
      generate(random) {
        const context = random.pick(meanContexts);
        const frame = random.pick(meanFrames);
        const mean = random.integer(12, 36);
        const offsets = random.shuffle([-5, -2, 1, 3]);
        const [a, b, c, d] = offsets.map((offset) => mean + offset) as [
          number,
          number,
          number,
          number,
        ];
        const answer = mean * 5 - (a + b + c + d);
        const sumOnly = a + b + c + d;
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { mean, a, b, c, d, answer },
          candidate: numericCandidate({
            prompt: frame.render({ noun: context.noun, a, b, c, d, mean }),
            answer,
            verificationExpression: [
              mean,
              5,
              "multiply",
              a,
              b,
              "add",
              c,
              "add",
              d,
              "add",
              "subtract",
            ],
            learningObjective:
              "Use the definition of the arithmetic mean to recover a missing data value.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must infer the five-value total from the mean and subtract the known observations.",
            estimatedSeconds: 105,
            calculatorPolicy: "ALLOWED",
            explanation: `A mean of ${mean} across 5 values requires a total of ${mean} × 5 = ${mean * 5}. The four known values total ${sumOnly}, so the missing value is ${mean * 5} - ${sumOnly} = ${answer}.`,
            misconception: {
              code: "MEAN_USED_AS_TOTAL",
              value: mean - sumOnly,
              message:
                "The mean is not the total. Multiply the mean by the number of values before subtracting the known values.",
            },
            tutorQuestion:
              "What total must five values have if their mean is known?",
            reflection:
              "After finding the missing value, how can you recompute the mean to check it?",
          }),
        };
      },
    },
  ];

export function getMathDeterministicVariantTemplate(key: string) {
  return mathDeterministicVariantTemplates.find(
    (template) => template.key === key,
  );
}

function numericCandidate(input: {
  prompt: string;
  answer: number;
  verificationExpression: RpnExpression;
  tolerance?: number;
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
  const tolerance = input.tolerance ?? 0;
  return {
    content: {
      questionType: "NUMERIC",
      prompt: input.prompt,
      answerSpec: {
        type: "numeric",
        value: input.answer,
        tolerance,
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
      tolerance,
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
        tolerance,
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
            "Write the intermediate quantity explicitly, then substitute it back into the original relationship to check the result.",
        },
      ],
      reflectionPrompt: input.reflection,
    },
  };
}

function roundCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value: number) {
  return roundCents(value).toFixed(2);
}

function slug(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}
