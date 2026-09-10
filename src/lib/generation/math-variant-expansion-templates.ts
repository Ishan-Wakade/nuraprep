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

const signedChangeContexts = [
  { key: "temperature", subject: "temperature", unit: "degrees" },
  { key: "elevation", subject: "elevation", unit: "meters" },
  { key: "account-balance", subject: "account balance", unit: "dollars" },
  { key: "game-score", subject: "game score", unit: "points" },
  { key: "storage-level", subject: "storage level", unit: "units" },
] as const;

const signedChangeFrames: readonly PromptFrame[] = [
  {
    key: "increase-from-negative",
    render: ({ subject, unit, start, increase }) =>
      `A ${subject} starts at ${start} ${unit} and increases by ${increase} ${unit}. What is the new value?`,
  },
  {
    key: "net-position",
    render: ({ subject, unit, start, increase }) =>
      `The initial ${subject} is ${start} ${unit}. After a positive change of ${increase} ${unit}, where does it end?`,
  },
  {
    key: "cross-zero",
    render: ({ subject, unit, start, increase }) =>
      `The ${subject} at ${start} ${unit} moves upward by ${increase} ${unit}, crossing zero. Select the resulting value.`,
  },
  {
    key: "integer-sum",
    render: ({ subject, unit, start, increase }) =>
      `Model the ${subject} change as ${start} + ${increase}. Which answer gives the final number of ${unit}?`,
  },
] as const;

const planComparisonContexts = [
  {
    key: "printing",
    unitSingular: "page",
    unitPlural: "pages",
    plan: "printing plan",
  },
  {
    key: "rentals",
    unitSingular: "rental hour",
    unitPlural: "rental hours",
    plan: "equipment plan",
  },
  {
    key: "classes",
    unitSingular: "class",
    unitPlural: "classes",
    plan: "class package",
  },
  {
    key: "deliveries",
    unitSingular: "delivery",
    unitPlural: "deliveries",
    plan: "delivery plan",
  },
  {
    key: "data",
    unitSingular: "gigabyte",
    unitPlural: "gigabytes",
    plan: "data plan",
  },
] as const;

const planComparisonFrames: readonly PromptFrame[] = [
  {
    key: "equal-total-cost",
    render: ({
      plan,
      unitSingular,
      unitPlural,
      leftFixed,
      leftUnit,
      rightFixed,
      rightUnit,
    }) =>
      `For a ${plan}, option A costs $${leftFixed} plus $${leftUnit} per ${unitSingular}. Option B costs $${rightFixed} plus $${rightUnit} per ${unitSingular}. At how many ${unitPlural} are the total costs equal?`,
  },
  {
    key: "break-even-point",
    render: ({
      plan,
      unitPlural,
      leftFixed,
      leftUnit,
      rightFixed,
      rightUnit,
    }) =>
      `Find the break-even point for two ${plan} options: ${leftFixed} + ${leftUnit}x dollars and ${rightFixed} + ${rightUnit}x dollars, where x counts ${unitPlural}.`,
  },
  {
    key: "same-charge",
    render: ({
      unitSingular,
      unitPlural,
      leftFixed,
      leftUnit,
      rightFixed,
      rightUnit,
    }) =>
      `One service charges $${leftFixed} initially and $${leftUnit} per ${unitSingular}. Another charges $${rightFixed} initially and $${rightUnit} per ${unitSingular}. If x is the number of ${unitPlural}, which x makes the charges the same?`,
  },
  {
    key: "variable-on-both-sides",
    render: ({ unitPlural, leftFixed, leftUnit, rightFixed, rightUnit }) =>
      `Solve ${leftFixed} + ${leftUnit}x = ${rightFixed} + ${rightUnit}x. In this comparison, x is the number of ${unitPlural}.`,
  },
] as const;

const conversionEquivalences = [
  {
    key: "liters-milliliters",
    from: "liters",
    to: "milliliters",
    factor: 1000,
  },
  { key: "meters-centimeters", from: "meters", to: "centimeters", factor: 100 },
  { key: "kilograms-grams", from: "kilograms", to: "grams", factor: 1000 },
  { key: "hours-minutes", from: "hours", to: "minutes", factor: 60 },
  { key: "pounds-ounces", from: "pounds", to: "ounces", factor: 16 },
] as const;

const conversionEquivalenceFrames: readonly PromptFrame[] = [
  {
    key: "same-measurement",
    render: ({ amount, from }) =>
      `Select every expression that describes the same measurement as ${amount} ${from}.`,
  },
  {
    key: "equivalent-quantities",
    render: ({ amount, from, to }) =>
      `A quantity is ${amount} ${from}. Which choices are equivalent when expressed or calculated in ${to}? Select all that apply.`,
  },
  {
    key: "conversion-verification",
    render: ({ amount, from, to }) =>
      `Check the conversion from ${amount} ${from} to ${to}. Mark every representation with the correct value.`,
  },
  {
    key: "multiple-representations",
    render: ({ amount, from }) =>
      `The measure ${amount} ${from} can be rewritten in several ways. Select all forms that preserve the original quantity.`,
  },
] as const;

const likelihoodContexts = [
  {
    key: "colored-tokens",
    container: "bag of colored tokens",
    labels: ["red token", "blue token", "green token", "yellow token"],
  },
  {
    key: "shape-cards",
    container: "deck of shape cards",
    labels: ["circle card", "square card", "triangle card", "star card"],
  },
  {
    key: "fruit-basket",
    container: "fruit basket",
    labels: ["apple", "orange", "pear", "banana"],
  },
  {
    key: "library-cart",
    container: "library cart",
    labels: ["fiction book", "history book", "science book", "art book"],
  },
  {
    key: "bead-container",
    container: "container of beads",
    labels: ["small bead", "medium bead", "large bead", "extra-large bead"],
  },
] as const;

const likelihoodFrames = [
  {
    key: "least-to-most-likely",
    direction: "ascending" as const,
    render: (noun: string) =>
      `One item is selected at random from the ${noun}. Arrange the events from least likely to most likely.`,
  },
  {
    key: "most-to-least-likely",
    direction: "descending" as const,
    render: (noun: string) =>
      `A random draw is made from the ${noun}. Order the possible outcomes from most likely to least likely.`,
  },
  {
    key: "ascending-probability",
    direction: "ascending" as const,
    render: (noun: string) =>
      `Compare the category counts in the ${noun}. Rank their one-draw probabilities in ascending order.`,
  },
  {
    key: "descending-relative-frequency",
    direction: "descending" as const,
    render: (noun: string) =>
      `Use each category's relative frequency in the ${noun} to place the outcomes in descending probability order.`,
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
            difficulty: "DEVELOPING",
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
            difficulty: "DEVELOPING",
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
    {
      key: "math.arithmetic.signed-change-choice",
      version: 1,
      targetSkillCode: "MATH.ARITHMETIC",
      questionType: "SINGLE_CHOICE",
      difficulty: "DEVELOPING",
      structureCapacity:
        signedChangeContexts.length * signedChangeFrames.length,
      generate(random) {
        const context = random.pick(signedChangeContexts);
        const frame = random.pick(signedChangeFrames);
        const magnitude = random.integer(3, 12);
        const start = -magnitude;
        const increase = random.integer(magnitude + 2, magnitude + 15);
        const answer = start + increase;
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { start, increase, answer },
          candidate: singleChoiceNumericCandidate(random, {
            difficulty: "DEVELOPING",
            prompt: frame.render({ ...context, start, increase }),
            answer,
            wrongAnswers: [
              start - increase,
              magnitude + increase,
              magnitude - increase,
            ],
            verificationExpression: [start, increase, "add"],
            learningObjective:
              "Add a positive change to a negative starting value and interpret the result.",
            difficultyRationale:
              "The learner must preserve the negative starting sign and reason across zero.",
            estimatedSeconds: 60,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `An increase means add: ${start} + ${increase} = ${answer}.`,
            misconceptionCode: "SUBTRACTS_POSITIVE_CHANGE",
            misconceptionMessage:
              "You subtracted the positive change. An increase moves the starting value in the positive direction.",
            distractorExplanations: [
              "This subtracts the increase instead of adding it.",
              "This ignores the negative sign on the starting value.",
              "This reverses the subtraction and leaves the result negative.",
            ],
            tutorQuestion:
              "On a number line, which direction does a positive increase move from the negative starting point?",
            reflection:
              "How much of the increase is needed to reach zero before the remaining change becomes positive?",
          }),
        };
      },
    },
    {
      key: "math.linear-equations.plan-break-even-choice",
      version: 1,
      targetSkillCode: "MATH.LINEAR_EQUATIONS",
      questionType: "SINGLE_CHOICE",
      difficulty: "PROFICIENT",
      structureCapacity:
        planComparisonContexts.length * planComparisonFrames.length,
      generate(random) {
        const context = random.pick(planComparisonContexts);
        const frame = random.pick(planComparisonFrames);
        const leftFixed = random.integer(4, 14) * 2;
        const rightUnit = random.integer(2, 6);
        const leftUnit = rightUnit + random.integer(2, 5);
        const answer = random.integer(4, 15);
        const rightFixed = leftFixed + (leftUnit - rightUnit) * answer;
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: {
            leftFixed,
            leftUnit,
            rightFixed,
            rightUnit,
            answer,
          },
          candidate: singleChoiceNumericCandidate(random, {
            difficulty: "PROFICIENT",
            prompt: frame.render({
              ...context,
              leftFixed,
              leftUnit,
              rightFixed,
              rightUnit,
            }),
            answer,
            wrongAnswers: [
              (rightFixed - leftFixed) / leftUnit,
              answer + 0.5,
              rightFixed - leftFixed,
            ],
            verificationExpression: [
              rightFixed,
              leftFixed,
              "subtract",
              leftUnit,
              rightUnit,
              "subtract",
              "divide",
            ],
            learningObjective:
              "Solve a linear equation with the variable on both sides to find a break-even quantity.",
            difficultyRationale:
              "The learner must compare two linear cost rules, combine variable terms, and interpret the solution in context.",
            estimatedSeconds: 105,
            calculatorPolicy: "ALLOWED",
            explanation: `Set the costs equal. The fixed-cost difference is ${rightFixed} - ${leftFixed} = ${rightFixed - leftFixed}, and the per-unit difference is ${leftUnit} - ${rightUnit} = ${leftUnit - rightUnit}. Therefore x = ${rightFixed - leftFixed} ÷ ${leftUnit - rightUnit} = ${answer}.`,
            misconceptionCode: "USES_ONE_VARIABLE_RATE_ONLY",
            misconceptionMessage:
              "You divided by only one plan's per-unit rate. First subtract the variable rates because x appears on both sides.",
            distractorExplanations: [
              "This divides the fixed-cost difference by only option A's rate instead of the difference between rates.",
              "This adds a per-unit charge to the solution without preserving the equation.",
              "This uses the fixed-cost difference as the quantity and never accounts for either variable rate.",
            ],
            tutorQuestion:
              "What remains on each side after moving the fixed costs together and the x-terms together?",
            reflection:
              "How can substituting the quantity into both pricing rules verify the break-even point?",
          }),
        };
      },
    },
    {
      key: "math.unit-conversions.multiple-select-equivalence",
      version: 1,
      targetSkillCode: "MATH.UNIT_CONVERSIONS",
      questionType: "MULTIPLE_SELECT",
      difficulty: "PROFICIENT",
      structureCapacity:
        conversionEquivalences.length * conversionEquivalenceFrames.length,
      generate(random) {
        const relationship = random.pick(conversionEquivalences);
        const frame = random.pick(conversionEquivalenceFrames);
        const amount = random.integer(2, 16);
        const converted = amount * relationship.factor;
        const choices = random.shuffle([
          { id: "converted", content: `${converted} ${relationship.to}` },
          {
            id: "multiplication",
            content: `${amount} × ${relationship.factor} ${relationship.to}`,
          },
          {
            id: "halved-expression",
            content: `${converted * 2} ÷ 2 ${relationship.to}`,
          },
          {
            id: "reversed",
            content: `${formatNumber(amount / relationship.factor)} ${relationship.to}`,
          },
        ]);
        return {
          structureKey: `${relationship.key}.${frame.key}`,
          parameters: { ...relationship, amount, converted },
          candidate: {
            content: {
              questionType: "MULTIPLE_SELECT",
              prompt: frame.render({ ...relationship, amount }),
              choices,
              answerSpec: {
                type: "multiple_select",
                choiceIds: ["converted", "multiplication", "halved-expression"],
              },
              explanation: `${amount} ${relationship.from} equals ${amount} × ${relationship.factor} = ${converted} ${relationship.to}. The expression ${converted * 2} ÷ 2 also equals ${converted}.`,
              distractorRationales: {
                reversed:
                  "This divides by the conversion factor even though converting to the smaller unit should increase the numerical value.",
              },
            },
            verificationSpec: {
              kind: "choice_equivalence",
              target: [amount, relationship.factor, "multiply"],
              candidates: {
                converted: [converted],
                multiplication: [amount, relationship.factor, "multiply"],
                "halved-expression": [converted * 2, 2, "divide"],
                reversed: [amount, relationship.factor, "divide"],
              },
              tolerance: 1e-9,
            },
            learningObjective:
              "Recognize equivalent calculations and values for a one-factor unit conversion.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must evaluate several numerical representations and select every form that preserves the measurement.",
            estimatedSeconds: 95,
            calculatorPolicy: "ALLOWED",
            commonMisconceptions: ["CONVERSION_DIRECTION_REVERSED"],
            misconceptionRules: [
              {
                id: "selects-reversed-conversion",
                kind: "selected_choice",
                code: "CONVERSION_DIRECTION_REVERSED",
                choiceId: "reversed",
                learnerMessage:
                  "You reversed the conversion. Converting to a smaller unit produces a larger numerical count.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "predict-direction",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "Will the numerical value grow or shrink when the same quantity is written in the smaller unit?",
                },
                {
                  id: "evaluate-expressions",
                  kind: "HINT",
                  content:
                    "Evaluate each expression in the target unit and compare it with the direct conversion.",
                },
              ],
              reflectionPrompt:
                "How can unit size help you reject a reversed conversion before calculating?",
            },
          },
        };
      },
    },
    {
      key: "math.probability.order-event-likelihood",
      version: 1,
      targetSkillCode: "MATH.PROBABILITY_STATISTICS",
      questionType: "ORDERED_RESPONSE",
      difficulty: "DEVELOPING",
      structureCapacity: likelihoodContexts.length * likelihoodFrames.length,
      generate(random) {
        const context = random.pick(likelihoodContexts);
        const frame = random.pick(likelihoodFrames);
        const base = random.integer(1, 5);
        const counts = random.shuffle([base, base + 2, base + 5, base + 9]);
        const total = counts.reduce((sum, value) => sum + value, 0);
        const entries = context.labels.map((label, index) => ({
          id: `event-${index + 1}`,
          label,
          count: counts[index] ?? 0,
          probability: (counts[index] ?? 0) / total,
        }));
        const ordered = [...entries].sort((left, right) =>
          frame.direction === "ascending"
            ? left.probability - right.probability
            : right.probability - left.probability,
        );
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { counts, total, direction: frame.direction },
          candidate: {
            content: {
              questionType: "ORDERED_RESPONSE",
              prompt: frame.render(context.container),
              stimulus: {
                type: "table",
                caption: "Category counts",
                columns: ["Category", "Count"],
                rows: entries.map((entry) => [
                  entry.label,
                  String(entry.count),
                ]),
              },
              choices: random.shuffle(
                entries.map((entry) => ({
                  id: entry.id,
                  content: entry.label,
                })),
              ),
              answerSpec: {
                type: "ordered_response",
                itemIds: ordered.map((entry) => entry.id),
              },
              explanation: `Every event uses the same total of ${total}, so a larger category count means a larger probability. The ${frame.direction} order is ${ordered.map((entry) => `${entry.label} (${entry.count}/${total})`).join(", ")}.`,
              distractorRationales: {},
            },
            verificationSpec: {
              kind: "ordered_values",
              values: Object.fromEntries(
                entries.map((entry) => [entry.id, entry.probability]),
              ),
              direction: frame.direction,
            },
            learningObjective:
              "Compare simple event probabilities that share the same sample space.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must connect category frequency to event probability and preserve the requested direction.",
            estimatedSeconds: 80,
            calculatorPolicy: "NOT_NEEDED",
            commonMisconceptions: [],
            misconceptionRules: [],
            tutorGuidance: {
              steps: [
                {
                  id: "compare-denominators",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "Do all four events use the same total number of possible outcomes?",
                },
                {
                  id: "compare-counts",
                  kind: "HINT",
                  content:
                    "When denominators match, order the probabilities by their favorable counts.",
                },
              ],
              reflectionPrompt:
                "Why can the category counts be compared directly when every event uses the same total?",
            },
          },
        };
      },
    },
  ];

function singleChoiceNumericCandidate(
  random: SeededRandom,
  input: {
    difficulty: GeneratedCandidate["difficulty"];
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
