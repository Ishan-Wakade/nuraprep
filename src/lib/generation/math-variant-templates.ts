import type { GeneratedCandidate } from "./contracts";
import type {
  DeterministicVariantTemplate,
  SeededRandom,
} from "./deterministic-variants";
import { mathVariantAdvancedTemplates } from "./math-variant-advanced-templates";
import { mathVariantAlgebraDepthTemplates } from "./math-variant-algebra-depth-templates";
import { mathVariantCalibrationTemplates } from "./math-variant-calibration-templates";
import { mathVariantDepthTemplates } from "./math-variant-depth-templates";
import { mathVariantExpansionTemplates } from "./math-variant-expansion-templates";
import { mathVariantOutlineDepthTemplates } from "./math-variant-outline-depth-templates";
import { mathVariantTargetDepthTemplates } from "./math-variant-target-depth-templates";
import { mathVariantVisualTemplates } from "./math-variant-visual-templates";
import type {
  QuestionStimulus,
  RpnExpression,
} from "@/lib/questions/contracts";

type PromptFrame = {
  key: string;
  render(values: Record<string, string | number>): string;
};

const arithmeticContexts = [
  { key: "supply-kits", noun: "supply kits" },
  { key: "review-cards", noun: "review cards" },
  { key: "clinic-forms", noun: "clinic forms" },
  { key: "training-seats", noun: "training seats" },
  { key: "meal-containers", noun: "meal containers" },
] as const;

const arithmeticFrames: PromptFrame[] = [
  {
    key: "start-add-remove",
    render: ({ start, added, removed, noun }) =>
      `A team begins with ${start} ${noun}, receives ${added} more, and then uses ${removed}. How many ${noun} remain?`,
  },
  {
    key: "inventory-change",
    render: ({ start, added, removed, noun }) =>
      `An inventory lists ${start} ${noun}. After ${added} are added and ${removed} are distributed, find the new inventory count.`,
  },
  {
    key: "two-step-balance",
    render: ({ start, added, removed, noun }) =>
      `There are ${start} ${noun} at first. A delivery contributes ${added}, and a later activity takes away ${removed}. What is the final number?`,
  },
  {
    key: "net-change",
    render: ({ start, added, removed, noun }) =>
      `Calculate the ending balance of ${noun} after starting at ${start}, increasing by ${added}, and decreasing by ${removed}.`,
  },
] as const;

const algebraExpressionFrames: PromptFrame[] = [
  {
    key: "evaluate-values",
    render: ({ expression, x, y }) =>
      `Evaluate ${expression} when x = ${x} and y = ${y}.`,
  },
  {
    key: "substitute-values",
    render: ({ expression, x, y }) =>
      `Substitute x = ${x} and y = ${y} into ${expression}. What value results?`,
  },
  {
    key: "expression-value",
    render: ({ expression, x, y }) =>
      `Find the value of the expression ${expression} for x = ${x} and y = ${y}.`,
  },
  {
    key: "replacement-evaluation",
    render: ({ expression, x, y }) =>
      `Replace x with ${x} and y with ${y}, then simplify ${expression}.`,
  },
] as const;

const algebraExpressionForms = [
  "weighted-sum",
  "grouped-sum",
  "scaled-difference",
  "quotient-combination",
  "squared-term",
] as const;

const linearEquationFrames: PromptFrame[] = [
  {
    key: "solve-equation",
    render: ({ equation }) => `Solve the equation ${equation}.`,
  },
  {
    key: "determine-x",
    render: ({ equation }) =>
      `Determine the value of x that makes ${equation} true.`,
  },
  {
    key: "isolate-variable",
    render: ({ equation }) => `Isolate x in ${equation} and give its value.`,
  },
  {
    key: "solution-value",
    render: ({ equation }) => `What is the solution to ${equation}?`,
  },
] as const;

const linearEquationForms = [
  "add-after-scale",
  "subtract-after-scale",
  "divide-then-add",
  "group-then-scale",
  "subtract-then-divide",
] as const;

const inequalityContexts = [
  { key: "workshop-seats", noun: "workshop seats" },
  { key: "study-guides", noun: "study guides" },
  { key: "supply-packs", noun: "supply packs" },
  { key: "event-tickets", noun: "event tickets" },
  { key: "meal-kits", noun: "meal kits" },
] as const;

const inequalityFrames: PromptFrame[] = [
  {
    key: "maximum-with-fee",
    render: ({ fixed, unit, budget, noun }) =>
      `A fixed fee of $${fixed} plus $${unit} for each of several ${noun} must be no more than $${budget}. What is the greatest whole number of ${noun} allowed?`,
  },
  {
    key: "budget-constraint",
    render: ({ fixed, unit, budget, noun }) =>
      `The total cost for ${noun} is $${fixed} + $${unit}x and cannot exceed $${budget}. Find the maximum whole-number value of x.`,
  },
  {
    key: "upper-bound",
    render: ({ fixed, unit, budget, noun }) =>
      `After a $${fixed} setup charge, each ${noun} costs $${unit}. If spending is limited to $${budget}, how many ${noun} can be included at most?`,
  },
  {
    key: "solve-context-inequality",
    render: ({ fixed, unit, budget, noun }) =>
      `Solve the practical constraint ${fixed} + ${unit}x ≤ ${budget}, where x counts ${noun}. Give the largest permitted whole number.`,
  },
] as const;

const conversionRelationships = [
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

const conversionFrames: PromptFrame[] = [
  {
    key: "convert-quantity",
    render: ({ amount, from, to }) => `Convert ${amount} ${from} to ${to}.`,
  },
  {
    key: "equivalent-measure",
    render: ({ amount, from, to }) =>
      `How many ${to} are equivalent to ${amount} ${from}?`,
  },
  {
    key: "rewrite-unit",
    render: ({ amount, from, to }) =>
      `Rewrite a measurement of ${amount} ${from} using ${to}.`,
  },
  {
    key: "conversion-factor",
    render: ({ amount, from, to }) =>
      `Use the appropriate conversion factor to express ${amount} ${from} in ${to}.`,
  },
] as const;

const travelContexts = [
  { key: "delivery-route", noun: "delivery route" },
  { key: "cycling-trip", noun: "cycling trip" },
  { key: "training-walk", noun: "training walk" },
  { key: "shuttle-trip", noun: "shuttle trip" },
  { key: "river-journey", noun: "river journey" },
] as const;

function formatHours(value: string | number) {
  return `${value} ${Number(value) === 1 ? "hour" : "hours"}`;
}

const travelFrames: PromptFrame[] = [
  {
    key: "two-leg-total",
    render: ({ noun, rate1, time1, rate2, time2 }) =>
      `A ${noun} covers its first leg at ${rate1} miles per hour for ${formatHours(time1)} and its second leg at ${rate2} miles per hour for ${formatHours(time2)}. What total distance is covered?`,
  },
  {
    key: "combined-distance",
    render: ({ noun, rate1, time1, rate2, time2 }) =>
      `During a ${noun}, one segment lasts ${formatHours(time1)} at ${rate1} miles per hour and another lasts ${formatHours(time2)} at ${rate2} miles per hour. Find the combined distance.`,
  },
  {
    key: "sum-segments",
    render: ({ noun, rate1, time1, rate2, time2 }) =>
      `For a ${noun}, calculate the distance from ${rate1} mph for ${formatHours(time1)} plus the distance from ${rate2} mph for ${formatHours(time2)}.`,
  },
  {
    key: "rate-time-model",
    render: ({ noun, rate1, time1, rate2, time2 }) =>
      `A ${noun} can be modeled by (${rate1} × ${time1}) + (${rate2} × ${time2}). What is the total distance in miles?`,
  },
] as const;

const prismContexts = [
  { key: "storage-box", noun: "storage box" },
  { key: "supply-bin", noun: "supply bin" },
  { key: "shipping-carton", noun: "shipping carton" },
  { key: "display-case", noun: "display case" },
  { key: "drawer-organizer", noun: "drawer organizer" },
] as const;

const prismFrames: PromptFrame[] = [
  {
    key: "find-volume",
    render: ({ noun, length, width, height }) =>
      `A rectangular ${noun} is ${length} cm long, ${width} cm wide, and ${height} cm high. What is its volume in cubic centimeters?`,
  },
  {
    key: "capacity-by-dimensions",
    render: ({ noun, length, width, height }) =>
      `Find the volume of a rectangular ${noun} with dimensions ${length} cm by ${width} cm by ${height} cm.`,
  },
  {
    key: "three-dimensional-measure",
    render: ({ noun, length, width, height }) =>
      `The inside dimensions of a ${noun} are ${length} cm, ${width} cm, and ${height} cm. Calculate the three-dimensional space inside it in cm³.`,
  },
  {
    key: "volume-formula",
    render: ({ noun, length, width, height }) =>
      `Use V = length × width × height for a ${noun} measuring ${length} cm × ${width} cm × ${height} cm. What is V?`,
  },
] as const;

const angleContexts = [
  "a triangular sign",
  "a triangular garden section",
  "a roof truss triangle",
  "a triangular diagram",
  "a triangular support frame",
] as const;

const angleFrames: PromptFrame[] = [
  {
    key: "missing-angle",
    render: ({ context, a, b }) =>
      `Two interior angles of ${context} measure ${a}° and ${b}°. What is the third interior angle?`,
  },
  {
    key: "triangle-sum",
    render: ({ context, a, b }) =>
      `In ${context}, two angle measures are ${a}° and ${b}°. Use the triangle angle sum to find the remaining measure.`,
  },
  {
    key: "unknown-interior-angle",
    render: ({ context, a, b }) =>
      `${String(context).charAt(0).toUpperCase()}${String(context).slice(1)} has interior angles ${a}°, ${b}°, and x°. Determine x.`,
  },
  {
    key: "complete-angle-set",
    render: ({ context, a, b }) =>
      `Complete the interior angle set for ${context}: ${a}°, ${b}°, and ____.`,
  },
] as const;

const dataContexts = [
  {
    key: "practice-minutes",
    caption: "Daily practice minutes",
    label: "Minutes",
  },
  { key: "pages-reviewed", caption: "Pages reviewed", label: "Pages" },
  { key: "items-organized", caption: "Items organized", label: "Items" },
  { key: "weekly-miles", caption: "Weekly miles", label: "Miles" },
  { key: "tasks-completed", caption: "Tasks completed", label: "Tasks" },
] as const;

const dataTasks = ["total", "mean", "range", "first-to-last-change"] as const;

const probabilityContexts = [
  { key: "colored-marbles", noun: "marbles", favorableLabel: "red" },
  { key: "shape-cards", noun: "cards", favorableLabel: "star-marked" },
  { key: "game-tokens", noun: "tokens", favorableLabel: "orange" },
  { key: "craft-beads", noun: "beads", favorableLabel: "silver" },
  { key: "letter-tiles", noun: "tiles", favorableLabel: "vowel" },
] as const;

const probabilityFrames: PromptFrame[] = [
  {
    key: "single-draw",
    render: ({ noun, favorableLabel, favorable, otherA, otherB }) =>
      `A container has ${favorable} ${favorableLabel} ${noun}, ${otherA} of a second kind, and ${otherB} of a third kind. If one ${singular(String(noun))} is selected at random, what is the probability it is ${favorableLabel}?`,
  },
  {
    key: "favorable-over-total",
    render: ({ noun, favorableLabel, favorable, otherA, otherB }) =>
      `Among ${Number(favorable) + Number(otherA) + Number(otherB)} equally likely ${noun}, ${favorable} are ${favorableLabel}. Which probability represents selecting a ${favorableLabel} item?`,
  },
  {
    key: "random-selection",
    render: ({ noun, favorableLabel, favorable, otherA, otherB }) =>
      `A random selection is made from ${Number(favorable) + Number(otherA) + Number(otherB)} ${noun}: ${favorable} ${favorableLabel}, ${otherA} in another group, and ${otherB} in a third group. Find the probability of the ${favorableLabel} group.`,
  },
  {
    key: "event-probability",
    render: ({ noun, favorableLabel, favorable, otherA, otherB }) =>
      `There are ${Number(favorable) + Number(otherA) + Number(otherB)} ${noun} in all, including ${favorable} that are ${favorableLabel}. What is P(${favorableLabel}) for one random draw?`,
  },
] as const;

const fractionEquivalenceFrames: PromptFrame[] = [
  {
    key: "select-equivalents",
    render: ({ numerator, denominator }) =>
      `Select every value equivalent to ${numerator}/${denominator}.`,
  },
  {
    key: "same-rational-value",
    render: ({ numerator, denominator }) =>
      `Which choices represent the same rational value as ${numerator}/${denominator}? Select all that apply.`,
  },
  {
    key: "fraction-decimal-match",
    render: ({ numerator, denominator }) =>
      `Identify all fraction or decimal forms equal to ${numerator}/${denominator}.`,
  },
  {
    key: "equivalence-set",
    render: ({ numerator, denominator }) =>
      `Choose the complete set of expressions with value ${numerator}/${denominator}.`,
  },
  {
    key: "scaled-and-decimal",
    render: ({ numerator, denominator }) =>
      `Starting from ${numerator}/${denominator}, select each option that preserves its value through scaling or decimal conversion.`,
  },
  {
    key: "representation-check",
    render: ({ numerator, denominator }) =>
      `Check every representation against ${numerator}/${denominator}, then select all exact matches.`,
  },
  {
    key: "equivalent-number-forms",
    render: ({ numerator, denominator }) =>
      `Which number forms are equivalent to the fraction ${numerator}/${denominator}? More than one may be correct.`,
  },
  {
    key: "complete-match-set",
    render: ({ numerator, denominator }) =>
      `Select the complete group of values that matches ${numerator}/${denominator} exactly.`,
  },
] as const;

const fractionDenominators = [4, 5, 8, 10, 20] as const;

const orderedTableFrames = [
  {
    key: "greatest-to-least",
    direction: "descending" as const,
    prompt: "Arrange the periods from greatest to least value.",
  },
  {
    key: "least-to-greatest",
    direction: "ascending" as const,
    prompt: "Arrange the periods from least to greatest value.",
  },
  {
    key: "descending-order",
    direction: "descending" as const,
    prompt: "Place the table rows in descending numerical order.",
  },
  {
    key: "ascending-order",
    direction: "ascending" as const,
    prompt: "Place the table rows in ascending numerical order.",
  },
] as const;

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
      `${String(item).charAt(0).toUpperCase()}${String(item).slice(1)} costs $${price} before a ${discount}% markdown. After the markdown, ${Number(tax) === 8 ? "an" : "a"} ${tax}% tax is added. Calculate the checkout price to the nearest cent.`,
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
      key: "math.arithmetic.inventory-net-change",
      version: 1,
      targetSkillCode: "MATH.ARITHMETIC",
      questionType: "NUMERIC",
      difficulty: "DEVELOPING",
      structureCapacity: arithmeticContexts.length * arithmeticFrames.length,
      generate(random) {
        const context = random.pick(arithmeticContexts);
        const frame = random.pick(arithmeticFrames);
        const start = random.integer(45, 140);
        const added = random.integer(18, 75);
        const removed = random.integer(12, start + added - 20);
        const answer = start + added - removed;
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { start, added, removed, answer },
          candidate: numericCandidate({
            prompt: frame.render({ ...context, start, added, removed }),
            answer,
            verificationExpression: [start, added, "add", removed, "subtract"],
            learningObjective:
              "Apply addition and subtraction in the correct order to find a changing quantity.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must translate a two-step change and preserve the direction of each operation.",
            estimatedSeconds: 70,
            calculatorPolicy: "ALLOWED",
            explanation: `Add the incoming amount first: ${start} + ${added} = ${start + added}. Then subtract the amount used: ${start + added} - ${removed} = ${answer}.`,
            misconception: {
              code: "SUBTRACTION_DIRECTION_ERROR",
              value: start + added + removed,
              message:
                "You may have added the amount that left the inventory. A used or distributed quantity decreases the balance.",
            },
            tutorQuestion:
              "Which event increases the starting amount, and which event decreases it?",
            reflection:
              "How can a quick estimate confirm that the final count is below the post-delivery count?",
          }),
        };
      },
    },
    {
      key: "math.algebra.evaluate-two-variable-expression",
      version: 1,
      targetSkillCode: "MATH.ALGEBRAIC_EXPRESSIONS",
      questionType: "NUMERIC",
      difficulty: "DEVELOPING",
      structureCapacity:
        algebraExpressionForms.length * algebraExpressionFrames.length,
      generate(random) {
        const form = random.pick(algebraExpressionForms);
        const frame = random.pick(algebraExpressionFrames);
        const values = buildAlgebraExpression(random, form);
        return {
          structureKey: `${form}.${frame.key}`,
          parameters: values.parameters,
          candidate: numericCandidate({
            prompt: frame.render({
              expression: values.display,
              x: values.x,
              y: values.y,
            }),
            answer: values.answer,
            tolerance: 1e-9,
            verificationExpression: values.expression,
            learningObjective:
              "Substitute values into an algebraic expression and apply the order of operations.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must substitute two values and evaluate a multi-operation expression accurately.",
            estimatedSeconds: 85,
            calculatorPolicy: "ALLOWED",
            explanation: `${values.substitution} Following the order of operations gives ${formatNumber(values.answer)}.`,
            misconception: {
              code: "ORDER_OF_OPERATIONS_ERROR",
              value: values.answer + values.offset,
              message:
                "You may have changed the operation order after substitution. Complete grouping and exponents before multiplication, division, addition, and subtraction.",
            },
            tutorQuestion:
              "After replacing x and y, which operation must be completed first?",
            reflection:
              "How could you rewrite the substituted expression on one line before calculating?",
          }),
        };
      },
    },
    {
      key: "math.linear-equations.two-step-integer-solution",
      version: 1,
      targetSkillCode: "MATH.LINEAR_EQUATIONS",
      questionType: "NUMERIC",
      difficulty: "DEVELOPING",
      structureCapacity:
        linearEquationForms.length * linearEquationFrames.length,
      generate(random) {
        const form = random.pick(linearEquationForms);
        const frame = random.pick(linearEquationFrames);
        const values = buildLinearEquation(random, form);
        return {
          structureKey: `${form}.${frame.key}`,
          parameters: values.parameters,
          candidate: numericCandidate({
            prompt: frame.render({ equation: values.equation }),
            answer: values.answer,
            verificationExpression: values.expression,
            learningObjective:
              "Solve a two-step linear equation by applying inverse operations.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must reverse two operations while preserving equation balance.",
            estimatedSeconds: 85,
            calculatorPolicy: "ALLOWED",
            explanation: values.explanation,
            misconception: {
              code: "INVERSE_OPERATION_ERROR",
              value: values.answer + values.offset,
              message:
                "You may have used the same operation instead of its inverse. Undo operations in reverse order on both sides.",
            },
            tutorQuestion:
              "Which operation is farthest from x, and what inverse operation removes it from both sides?",
            reflection:
              "How can substituting your solution into the original equation verify it?",
          }),
        };
      },
    },
    {
      key: "math.inequalities.maximum-whole-number",
      version: 1,
      targetSkillCode: "MATH.INEQUALITIES",
      questionType: "NUMERIC",
      difficulty: "PROFICIENT",
      structureCapacity: inequalityContexts.length * inequalityFrames.length,
      generate(random) {
        const context = random.pick(inequalityContexts);
        const frame = random.pick(inequalityFrames);
        const fixed = random.integer(8, 35);
        const unit = random.integer(3, 14);
        const answer = random.integer(5, 22);
        const budget = fixed + unit * answer;
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { fixed, unit, budget, answer },
          candidate: numericCandidate({
            prompt: frame.render({ ...context, fixed, unit, budget }),
            answer,
            verificationExpression: [budget, fixed, "subtract", unit, "divide"],
            learningObjective:
              "Interpret and solve a linear inequality with a whole-number contextual limit.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must translate an upper-bound constraint, isolate the variable, and interpret a whole-number maximum.",
            estimatedSeconds: 105,
            calculatorPolicy: "ALLOWED",
            explanation: `Subtract the fixed amount: ${budget} - ${fixed} = ${budget - fixed}. Divide by ${unit}: x ≤ ${answer}. Therefore, the greatest permitted whole number is ${answer}.`,
            misconception: {
              code: "FIXED_COST_NOT_REMOVED",
              value: budget / unit,
              message:
                "You may have divided the full budget by the per-item cost without first removing the fixed charge.",
            },
            tutorQuestion:
              "Which part of the total does not depend on x and should be removed first?",
            reflection:
              "What happens to the total cost if one more item than your answer is included?",
          }),
        };
      },
    },
    {
      key: "math.unit-conversions.single-factor",
      version: 1,
      targetSkillCode: "MATH.UNIT_CONVERSIONS",
      questionType: "NUMERIC",
      difficulty: "DEVELOPING",
      structureCapacity:
        conversionRelationships.length * conversionFrames.length,
      generate(random) {
        const relationship = random.pick(conversionRelationships);
        const frame = random.pick(conversionFrames);
        const amount = random.integer(2, 24);
        const answer = amount * relationship.factor;
        return {
          structureKey: `${relationship.key}.${frame.key}`,
          parameters: { ...relationship, amount, answer },
          candidate: numericCandidate({
            prompt: frame.render({ ...relationship, amount }),
            answer,
            verificationExpression: [amount, relationship.factor, "multiply"],
            learningObjective:
              "Apply a standard one-step conversion factor between measurement units.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must select the correct conversion direction and apply one multiplicative factor.",
            estimatedSeconds: 70,
            calculatorPolicy: "ALLOWED",
            explanation: `One ${singular(relationship.from)} equals ${relationship.factor} ${relationship.to}. Multiply: ${amount} × ${relationship.factor} = ${answer} ${relationship.to}.`,
            misconception: {
              code: "CONVERSION_DIRECTION_REVERSED",
              value: amount / relationship.factor,
              message:
                "You may have divided when converting to the smaller unit. A fixed amount contains more smaller units, so multiply by the conversion factor.",
            },
            tutorQuestion:
              "Are you converting to a larger unit or a smaller unit, and should the numerical value grow or shrink?",
            reflection:
              "How can the relative sizes of the units help you check the direction of the conversion?",
          }),
        };
      },
    },
    {
      key: "math.word-problems.two-leg-distance",
      version: 1,
      targetSkillCode: "MATH.WORD_PROBLEMS",
      questionType: "NUMERIC",
      difficulty: "PROFICIENT",
      structureCapacity: travelContexts.length * travelFrames.length,
      generate(random) {
        const context = random.pick(travelContexts);
        const frame = random.pick(travelFrames);
        const rate1 = random.integer(3, 15) * 2;
        const rate2 = random.integer(4, 18) * 2;
        const time1 = random.integer(1, 4);
        const time2 = random.integer(1, 4);
        const firstDistance = rate1 * time1;
        const secondDistance = rate2 * time2;
        const answer = firstDistance + secondDistance;
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { rate1, rate2, time1, time2, answer },
          candidate: numericCandidate({
            prompt: frame.render({ ...context, rate1, rate2, time1, time2 }),
            answer,
            verificationExpression: [
              rate1,
              time1,
              "multiply",
              rate2,
              time2,
              "multiply",
              "add",
            ],
            learningObjective:
              "Use distance = rate × time for multiple travel segments and combine the results.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must identify two rate-time pairs, calculate each distance, and combine them.",
            estimatedSeconds: 110,
            calculatorPolicy: "ALLOWED",
            explanation: `The first segment is ${rate1} × ${time1} = ${firstDistance} miles. The second is ${rate2} × ${time2} = ${secondDistance} miles. Together: ${firstDistance} + ${secondDistance} = ${answer} miles.`,
            misconception: {
              code: "RATE_AND_TIME_ADDED",
              value: rate1 + time1 + rate2 + time2,
              message:
                "You may have added rates and times directly. Find each segment's distance by multiplying rate by its matching time.",
            },
            tutorQuestion:
              "Which rate belongs with each time interval, and what distance does each pair produce?",
            reflection:
              "Why would averaging the two rates be unreliable when the segment times can differ?",
          }),
        };
      },
    },
    {
      key: "math.measurement.rectangular-prism-volume",
      version: 1,
      targetSkillCode: "MATH.MEASUREMENT",
      questionType: "NUMERIC",
      difficulty: "DEVELOPING",
      structureCapacity: prismContexts.length * prismFrames.length,
      generate(random) {
        const context = random.pick(prismContexts);
        const frame = random.pick(prismFrames);
        const length = random.integer(5, 18);
        const width = random.integer(3, 12);
        const height = random.integer(2, 10);
        const answer = length * width * height;
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { length, width, height, answer },
          candidate: numericCandidate({
            prompt: frame.render({ ...context, length, width, height }),
            answer,
            verificationExpression: [
              length,
              width,
              "multiply",
              height,
              "multiply",
            ],
            learningObjective:
              "Calculate the volume of a rectangular prism from three dimensions.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must identify all three dimensions and apply the rectangular-prism volume formula.",
            estimatedSeconds: 80,
            calculatorPolicy: "ALLOWED",
            explanation: `Volume is length × width × height: ${length} × ${width} × ${height} = ${answer} cm³.`,
            misconception: {
              code: "AREA_INSTEAD_OF_VOLUME",
              value: length * width,
              message:
                "You may have found only the base area. Volume also includes the height of the prism.",
            },
            tutorQuestion:
              "Which three perpendicular dimensions determine the space inside a rectangular prism?",
            reflection: "Why is the resulting unit cubic rather than square?",
          }),
        };
      },
    },
    {
      key: "math.geometry.triangle-missing-angle",
      version: 1,
      targetSkillCode: "MATH.GEOMETRY",
      questionType: "NUMERIC",
      difficulty: "DEVELOPING",
      structureCapacity: angleContexts.length * angleFrames.length,
      generate(random) {
        const context = random.pick(angleContexts);
        const frame = random.pick(angleFrames);
        const a = random.integer(28, 72);
        const b = random.integer(32, Math.min(95, 145 - a));
        const answer = 180 - a - b;
        return {
          structureKey: `${slug(context)}.${frame.key}`,
          parameters: { a, b, answer },
          candidate: numericCandidate({
            prompt: frame.render({ context, a, b }),
            answer,
            verificationExpression: [180, a, "subtract", b, "subtract"],
            learningObjective:
              "Use the sum of a triangle's interior angles to find a missing angle.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must recall the 180-degree relationship and subtract two known measures.",
            estimatedSeconds: 70,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `Triangle interior angles total 180°. Subtract the known angles: 180 - ${a} - ${b} = ${answer}°.`,
            misconception: {
              code: "TRIANGLE_SUM_MISAPPLIED",
              value: a + b,
              message:
                "You may have added the known angles without subtracting their sum from 180°.",
            },
            tutorQuestion:
              "What fixed total do the three interior angles of every triangle have?",
            reflection:
              "How can you add all three measures to verify the missing angle?",
          }),
        };
      },
    },
    {
      key: "math.data-interpretation.four-row-table",
      version: 1,
      targetSkillCode: "MATH.DATA_INTERPRETATION",
      questionType: "NUMERIC",
      difficulty: "PROFICIENT",
      structureCapacity: dataContexts.length * dataTasks.length,
      generate(random) {
        const context = random.pick(dataContexts);
        const task = random.pick(dataTasks);
        const start = random.integer(12, 35);
        const values = [
          start,
          start + random.integer(3, 8),
          start + random.integer(10, 15),
          start + random.integer(18, 25),
        ] as const;
        const result = buildTableTask(task, values, context.label);
        const stimulus: QuestionStimulus = {
          type: "table",
          caption: context.caption,
          columns: ["Period", context.label],
          rows: values.map((value, index) => [
            `Period ${index + 1}`,
            String(value),
          ]),
        };
        return {
          structureKey: `${context.key}.${task}`,
          parameters: { task, values: [...values], answer: result.answer },
          candidate: numericCandidate({
            stimulus,
            prompt: result.prompt,
            answer: result.answer,
            tolerance: 1e-9,
            verificationExpression: result.expression,
            learningObjective:
              "Extract quantitative values from a table and apply the requested summary operation.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must locate multiple table entries, choose the requested operation, and compute a summary.",
            estimatedSeconds: 100,
            calculatorPolicy: "ALLOWED",
            explanation: result.explanation,
            misconception: {
              code: "TABLE_OPERATION_MISMATCH",
              value: result.answer + 1,
              message:
                "You may have read the values correctly but applied a different summary operation than the prompt requested.",
            },
            tutorQuestion:
              "Which exact table entries does the requested operation use?",
            reflection:
              "How can you label the operation before calculating to avoid mixing up total, mean, range, and change?",
          }),
        };
      },
    },
    {
      key: "math.data-interpretation.order-table-values",
      version: 1,
      targetSkillCode: "MATH.DATA_INTERPRETATION",
      questionType: "ORDERED_RESPONSE",
      difficulty: "DEVELOPING",
      structureCapacity: dataContexts.length * orderedTableFrames.length,
      generate(random) {
        const context = random.pick(dataContexts);
        const frame = random.pick(orderedTableFrames);
        const base = random.integer(14, 38);
        const values = random.shuffle([
          base,
          base + random.integer(4, 8),
          base + random.integer(11, 16),
          base + random.integer(20, 27),
        ]);
        const entries = values.map((value, index) => ({
          id: `period-${index + 1}`,
          label: `Period ${index + 1}`,
          value,
        }));
        const ordered = [...entries].sort((left, right) =>
          frame.direction === "ascending"
            ? left.value - right.value
            : right.value - left.value,
        );
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: {
            direction: frame.direction,
            values,
            orderedIds: ordered.map((entry) => entry.id),
          },
          candidate: {
            content: {
              questionType: "ORDERED_RESPONSE",
              prompt: `Using the ${context.caption.toLocaleLowerCase("en-US")} table, ${frame.prompt.toLocaleLowerCase("en-US")}`,
              stimulus: {
                type: "table",
                caption: context.caption,
                columns: ["Period", context.label],
                rows: entries.map((entry) => [
                  entry.label,
                  String(entry.value),
                ]),
              },
              choices: entries.map((entry) => ({
                id: entry.id,
                content: `${entry.label}: ${entry.value}`,
              })),
              answerSpec: {
                type: "ordered_response",
                itemIds: ordered.map((entry) => entry.id),
              },
              explanation: `The ${frame.direction} order is ${ordered.map((entry) => `${entry.label} (${entry.value})`).join(", ")}.`,
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
              "Read labeled quantitative table entries and order them by value.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must compare four table values and preserve the requested ordering direction.",
            estimatedSeconds: 75,
            calculatorPolicy: "NOT_NEEDED",
            commonMisconceptions: [],
            misconceptionRules: [],
            tutorGuidance: {
              steps: [
                {
                  id: "identify-extreme",
                  kind: "SOCRATIC_QUESTION",
                  content: `Which row has the ${frame.direction === "ascending" ? "smallest" : "largest"} value?`,
                },
                {
                  id: "compare-adjacent",
                  kind: "HINT",
                  content:
                    "After placing the first row, compare the remaining values and repeat.",
                },
              ],
              reflectionPrompt:
                "How can checking each adjacent pair confirm the entire order?",
            },
          },
        };
      },
    },
    {
      key: "math.fractions.multiple-select-equivalence",
      version: 1,
      targetSkillCode: "MATH.FRACTIONS_DECIMALS_PERCENT",
      questionType: "MULTIPLE_SELECT",
      difficulty: "PROFICIENT",
      structureCapacity: fractionEquivalenceFrames.length,
      generate(random) {
        const denominator = random.pick(fractionDenominators);
        const frame = random.pick(fractionEquivalenceFrames);
        const numerator = random.integer(1, denominator - 1);
        const wrongNumerator =
          numerator + 1 < denominator ? numerator + 1 : numerator - 1;
        const decimal = numerator / denominator;
        const choices = random.shuffle([
          { id: "original", content: `${numerator}/${denominator}` },
          { id: "scaled", content: `${numerator * 3}/${denominator * 3}` },
          { id: "decimal", content: formatNumber(decimal) },
          { id: "nearby", content: `${wrongNumerator}/${denominator}` },
        ]);
        return {
          structureKey: frame.key,
          parameters: { numerator, denominator, wrongNumerator, decimal },
          candidate: {
            content: {
              questionType: "MULTIPLE_SELECT",
              prompt: frame.render({ numerator, denominator }),
              choices,
              answerSpec: {
                type: "multiple_select",
                choiceIds: ["original", "scaled", "decimal"],
              },
              explanation: `${numerator}/${denominator}, ${numerator * 3}/${denominator * 3}, and ${formatNumber(decimal)} all evaluate to ${formatNumber(decimal)}. The nearby-numerator fraction has a different value.`,
              distractorRationales: {
                nearby:
                  "Changing only the numerator changes the fraction's value; equivalent fractions scale numerator and denominator by the same nonzero factor.",
              },
            },
            verificationSpec: {
              kind: "choice_equivalence",
              target: [numerator, denominator, "divide"],
              candidates: {
                original: [numerator, denominator, "divide"],
                scaled: [numerator * 3, denominator * 3, "divide"],
                decimal: [decimal],
                nearby: [wrongNumerator, denominator, "divide"],
              },
              tolerance: 1e-9,
            },
            learningObjective:
              "Recognize equivalent fraction and decimal representations of the same rational number.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must evaluate multiple representations and identify every equivalent value without selecting a near miss.",
            estimatedSeconds: 100,
            calculatorPolicy: "ALLOWED",
            commonMisconceptions: ["CHANGES_ONLY_NUMERATOR"],
            misconceptionRules: [
              {
                id: "selects-nearby-numerator",
                kind: "selected_choice",
                code: "CHANGES_ONLY_NUMERATOR",
                choiceId: "nearby",
                learnerMessage:
                  "You selected a fraction that changes only the numerator. Equivalent fractions scale both parts by the same factor.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "compare-values",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "What decimal value does the target fraction represent?",
                },
                {
                  id: "scale-both-parts",
                  kind: "HINT",
                  content:
                    "For a fraction form, check whether numerator and denominator were multiplied by the same number.",
                },
              ],
              reflectionPrompt:
                "How can converting each option to a decimal verify a multiple-select answer?",
            },
          },
        };
      },
    },
    {
      key: "math.probability.single-choice-event",
      version: 1,
      targetSkillCode: "MATH.PROBABILITY_STATISTICS",
      questionType: "SINGLE_CHOICE",
      difficulty: "DEVELOPING",
      structureCapacity: probabilityContexts.length * probabilityFrames.length,
      generate(random) {
        const context = random.pick(probabilityContexts);
        const frame = random.pick(probabilityFrames);
        const favorable = random.integer(2, 8);
        const otherA = favorable + random.integer(1, 3);
        const otherB = favorable + random.integer(4, 7);
        const total = favorable + otherA + otherB;
        const choices = random.shuffle([
          { id: "correct", content: `${favorable}/${total}` },
          { id: "other-group", content: `${otherA}/${total}` },
          {
            id: "excludes-favorable",
            content: `${favorable}/${otherA + otherB}`,
          },
          { id: "reversed", content: `${total}/${favorable}` },
        ]);
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { favorable, otherA, otherB, total },
          candidate: {
            content: {
              questionType: "SINGLE_CHOICE",
              prompt: frame.render({ ...context, favorable, otherA, otherB }),
              choices,
              answerSpec: { type: "single_choice", choiceId: "correct" },
              explanation: `Probability is favorable outcomes divided by all equally likely outcomes: ${favorable}/${total}.`,
              distractorRationales: {
                "other-group":
                  "This numerator counts a different group rather than the requested favorable outcomes.",
                "excludes-favorable":
                  "The denominator must include every possible item, including the favorable group.",
                reversed:
                  "Probability uses favorable outcomes over total outcomes, not total over favorable.",
              },
            },
            verificationSpec: {
              kind: "numeric_result",
              expression: [favorable, total, "divide"],
              tolerance: 1e-9,
            },
            learningObjective:
              "Calculate a simple event probability as favorable outcomes divided by total outcomes.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must identify the requested favorable category and count the complete sample space.",
            estimatedSeconds: 75,
            calculatorPolicy: "NOT_NEEDED",
            commonMisconceptions: ["USES_WRONG_FAVORABLE_GROUP"],
            misconceptionRules: [
              {
                id: "selects-other-group",
                kind: "selected_choice",
                code: "USES_WRONG_FAVORABLE_GROUP",
                choiceId: "other-group",
                learnerMessage:
                  "You used the count from a different group. The numerator must count the event named in the question.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "name-favorable-event",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "Which items count as favorable for the event in the question?",
                },
                {
                  id: "count-sample-space",
                  kind: "HINT",
                  content:
                    "Add every category to find the denominator before forming the probability.",
                },
              ],
              reflectionPrompt:
                "How can you check that a simple probability lies between 0 and 1?",
            },
          },
        };
      },
    },
    {
      key: "math.ratios.constant-rate",
      version: 1,
      targetSkillCode: "MATH.RATIOS_PROPORTIONS",
      questionType: "NUMERIC",
      difficulty: "DEVELOPING",
      structureCapacity: ratioContexts.length * ratioFrames.length,
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
      structureCapacity: purchaseContexts.length * purchaseFrames.length,
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
      structureCapacity: meanContexts.length * meanFrames.length,
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
    ...mathVariantExpansionTemplates,
    ...mathVariantVisualTemplates,
    ...mathVariantDepthTemplates,
    ...mathVariantAdvancedTemplates,
    ...mathVariantCalibrationTemplates,
    ...mathVariantOutlineDepthTemplates,
    ...mathVariantAlgebraDepthTemplates,
    ...mathVariantTargetDepthTemplates,
  ];

export function getMathDeterministicVariantTemplate(key: string) {
  return mathDeterministicVariantTemplates.find(
    (template) => template.key === key,
  );
}

function numericCandidate(input: {
  stimulus?: QuestionStimulus;
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
      stimulus: input.stimulus,
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

function buildTableTask(
  task: (typeof dataTasks)[number],
  values: readonly [number, number, number, number],
  label: string,
) {
  const [first, second, third, fourth] = values;
  if (task === "total") {
    const answer = first + second + third + fourth;
    return {
      answer,
      prompt: `What is the total number of ${label.toLocaleLowerCase("en-US")} across all four periods?`,
      expression: [
        first,
        second,
        "add",
        third,
        "add",
        fourth,
        "add",
      ] as RpnExpression,
      explanation: `Add all four entries: ${first} + ${second} + ${third} + ${fourth} = ${answer}.`,
    };
  }
  if (task === "mean") {
    const answer = (first + second + third + fourth) / 4;
    return {
      answer,
      prompt: `What is the mean number of ${label.toLocaleLowerCase("en-US")} per period?`,
      expression: [
        first,
        second,
        "add",
        third,
        "add",
        fourth,
        "add",
        4,
        "divide",
      ] as RpnExpression,
      explanation: `The four entries total ${first + second + third + fourth}. Divide by 4 to get a mean of ${formatNumber(answer)}.`,
    };
  }
  if (task === "range") {
    const answer = fourth - first;
    return {
      answer,
      prompt: `What is the range of the four ${label.toLocaleLowerCase("en-US")} values?`,
      expression: [fourth, first, "subtract"] as RpnExpression,
      explanation: `The greatest value is ${fourth} and the least is ${first}. The range is ${fourth} - ${first} = ${answer}.`,
    };
  }
  const answer = fourth - first;
  return {
    answer,
    prompt: `By how much did ${label.toLocaleLowerCase("en-US")} increase from Period 1 to Period 4?`,
    expression: [fourth, first, "subtract"] as RpnExpression,
    explanation: `Compare Period 4 with Period 1: ${fourth} - ${first} = ${answer}.`,
  };
}

function buildAlgebraExpression(
  random: SeededRandom,
  form: (typeof algebraExpressionForms)[number],
) {
  const x = random.integer(3, 12);
  const y = random.integer(2, Math.max(2, x - 1));
  const a = random.integer(2, 7);
  const b = random.integer(2, 9);
  let display: string;
  let expression: RpnExpression;
  let substitution: string;

  if (form === "weighted-sum") {
    display = `${a}x + ${b}y`;
    expression = [a, x, "multiply", b, y, "multiply", "add"];
    substitution = `Substitute to get ${a}(${x}) + ${b}(${y}).`;
  } else if (form === "grouped-sum") {
    display = `${a}(x + y) - ${b}`;
    expression = [x, y, "add", a, "multiply", b, "subtract"];
    substitution = `Substitute to get ${a}(${x} + ${y}) - ${b}.`;
  } else if (form === "scaled-difference") {
    display = `${a}(x - y) + ${b}`;
    expression = [x, y, "subtract", a, "multiply", b, "add"];
    substitution = `Substitute to get ${a}(${x} - ${y}) + ${b}.`;
  } else if (form === "quotient-combination") {
    const divisor = random.integer(2, 5);
    const factor = random.integer(2, 5);
    const xCoefficient = divisor * factor;
    display = `(${xCoefficient}x + ${divisor}y) ÷ ${divisor}`;
    expression = [
      xCoefficient,
      x,
      "multiply",
      divisor,
      y,
      "multiply",
      "add",
      divisor,
      "divide",
    ];
    substitution = `Substitute to get (${xCoefficient}(${x}) + ${divisor}(${y})) ÷ ${divisor}.`;
  } else {
    display = `${a}x² - ${b}y`;
    expression = [
      x,
      x,
      "multiply",
      a,
      "multiply",
      b,
      y,
      "multiply",
      "subtract",
    ];
    substitution = `Substitute to get ${a}(${x}²) - ${b}(${y}).`;
  }

  const answer = evaluateSimpleRpn(expression);
  return {
    display,
    expression,
    substitution,
    x,
    y,
    answer,
    offset: Math.max(1, a),
    parameters: { form, x, y, a, b, answer },
  };
}

function buildLinearEquation(
  random: SeededRandom,
  form: (typeof linearEquationForms)[number],
) {
  const a = random.integer(2, 9);
  const b = random.integer(3, 18);
  let answer: number;
  let c: number;
  let equation: string;
  let expression: RpnExpression;
  let explanation: string;

  if (form === "add-after-scale") {
    answer = random.integer(3, 18);
    c = a * answer + b;
    equation = `${a}x + ${b} = ${c}`;
    expression = [c, b, "subtract", a, "divide"];
    explanation = `Subtract ${b} from both sides: ${a}x = ${c - b}. Then divide by ${a}: x = ${answer}.`;
  } else if (form === "subtract-after-scale") {
    answer = random.integer(4, 18);
    c = a * answer - b;
    equation = `${a}x - ${b} = ${c}`;
    expression = [c, b, "add", a, "divide"];
    explanation = `Add ${b} to both sides: ${a}x = ${c + b}. Then divide by ${a}: x = ${answer}.`;
  } else if (form === "divide-then-add") {
    const quotient = random.integer(3, 16);
    answer = quotient * a;
    c = quotient + b;
    equation = `x ÷ ${a} + ${b} = ${c}`;
    expression = [c, b, "subtract", a, "multiply"];
    explanation = `Subtract ${b} from both sides: x ÷ ${a} = ${quotient}. Then multiply by ${a}: x = ${answer}.`;
  } else if (form === "group-then-scale") {
    answer = random.integer(3, 18);
    c = a * (answer + b);
    equation = `${a}(x + ${b}) = ${c}`;
    expression = [c, a, "divide", b, "subtract"];
    explanation = `Divide both sides by ${a}: x + ${b} = ${c / a}. Then subtract ${b}: x = ${answer}.`;
  } else {
    const quotient = random.integer(3, 16);
    answer = quotient * a + b;
    c = quotient;
    equation = `(x - ${b}) ÷ ${a} = ${c}`;
    expression = [c, a, "multiply", b, "add"];
    explanation = `Multiply both sides by ${a}: x - ${b} = ${c * a}. Then add ${b}: x = ${answer}.`;
  }

  return {
    answer,
    equation,
    expression,
    explanation,
    offset: Math.max(1, b),
    parameters: { form, a, b, c, answer },
  };
}

function evaluateSimpleRpn(expression: RpnExpression) {
  const stack: number[] = [];
  for (const token of expression) {
    if (typeof token === "number") {
      stack.push(token);
      continue;
    }
    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) {
      throw new Error("Invalid deterministic template expression.");
    }
    stack.push(
      token === "add"
        ? left + right
        : token === "subtract"
          ? left - right
          : token === "multiply"
            ? left * right
            : left / right,
    );
  }
  const value = stack[0];
  if (stack.length !== 1 || value === undefined || !Number.isFinite(value)) {
    throw new Error("Invalid deterministic template expression result.");
  }
  return value;
}

function roundCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value: number) {
  return roundCents(value).toFixed(2);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
}

function slug(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function singular(value: string) {
  return value.endsWith("s") ? value.slice(0, -1) : value;
}
