import type { GeneratedCandidate } from "./contracts";
import type { DeterministicVariantTemplate } from "./deterministic-variants";
import type { MathVerificationSpec } from "@/lib/questions/contracts";

type InequalityRelation = Extract<
  MathVerificationSpec,
  { kind: "inequality_choices" }
>["relation"];

type LinearSide = { coefficient: number; constant: number };

type InequalityFrameResult = {
  display: string;
  left: LinearSide;
  right: LinearSide;
  relation: InequalityRelation;
  solutionRelation: InequalityRelation;
  promptLead: string;
  explanationLead: string;
};

const inequalityContexts = [
  {
    key: "practice-sets",
    variable: "s",
    introduction: "For a study tracker, s counts completed practice sets.",
  },
  {
    key: "packed-boxes",
    variable: "b",
    introduction: "A packing log uses b for its number of supply boxes.",
  },
  {
    key: "scheduled-visits",
    variable: "v",
    introduction: "In a clinic schedule, v is the planned visit count.",
  },
  {
    key: "reading-pages",
    variable: "p",
    introduction:
      "The variable p denotes pages completed in a reading assignment.",
  },
  {
    key: "training-sessions",
    variable: "n",
    introduction: "A training plan records its session count as n.",
  },
] as const;

const inequalityFrameKeys = [
  "positive-less-than",
  "positive-greater-equal",
  "negative-less-equal",
  "distributed-greater-than",
] as const;

const distributiveContexts = [
  {
    key: "study-dashboard",
    introduction:
      "A study dashboard uses x for completed lessons and y for practice sets.",
  },
  {
    key: "supply-plan",
    introduction:
      "A supply plan uses x for small cartons and y for large cartons.",
  },
  {
    key: "clinic-schedule",
    introduction:
      "A clinic schedule uses x for morning visits and y for afternoon visits.",
  },
  {
    key: "reading-log",
    introduction:
      "A reading log uses x for print chapters and y for digital chapters.",
  },
  {
    key: "training-record",
    introduction:
      "A training record uses x for individual drills and y for team drills.",
  },
] as const;

const distributiveFrames = [
  {
    key: "match-grouped-value",
    render: (input: { x: number; y: number; factor: number }) =>
      `For x = ${input.x} and y = ${input.y}, select every expression with the same value as ${input.factor}(x + y).`,
  },
  {
    key: "evaluate-equivalent-forms",
    render: (input: { x: number; y: number; factor: number }) =>
      `Substitute x = ${input.x} and y = ${input.y}. Which expressions evaluate to the same result as the target ${input.factor}(x + y)? Select all that apply.`,
  },
  {
    key: "check-distribution",
    render: (input: { x: number; y: number; factor: number }) =>
      `The target expression is ${input.factor}(x + y), where x = ${input.x} and y = ${input.y}. Select each choice that preserves its value.`,
  },
  {
    key: "compare-expression-values",
    render: (input: { x: number; y: number; factor: number }) =>
      `Evaluate the listed expressions using x = ${input.x} and y = ${input.y}. Mark every one equal to ${input.factor}(x + y).`,
  },
] as const;

const reversePercentContexts = [
  {
    key: "discounted-lamp",
    direction: "decrease" as const,
    quantity: "price",
    unit: "dollars",
    describe: (final: number, percent: number) =>
      `After a ${percent}% discount, a study lamp costs $${final}.`,
  },
  {
    key: "program-enrollment",
    direction: "increase" as const,
    quantity: "enrollment",
    unit: "participants",
    describe: (final: number, percent: number) =>
      `After a ${percent}% increase, a review program has ${final} participants.`,
  },
  {
    key: "remaining-water",
    direction: "decrease" as const,
    quantity: "water volume",
    unit: "liters",
    describe: (final: number, percent: number) =>
      `After ${percent}% of the water was used, ${final} liters remain in a tank.`,
  },
  {
    key: "workshop-attendance",
    direction: "increase" as const,
    quantity: "attendance",
    unit: "attendees",
    describe: (final: number, percent: number) =>
      `Workshop attendance grew by ${percent}% to ${final} attendees.`,
  },
  {
    key: "remaining-inventory",
    direction: "decrease" as const,
    quantity: "inventory count",
    unit: "items",
    describe: (final: number, percent: number) =>
      `A supply room distributed ${percent}% of its items and has ${final} items left.`,
  },
] as const;

const reversePercentFrames = [
  {
    key: "find-original",
    render: (quantity: string) => `What was the original ${quantity}?`,
  },
  {
    key: "recover-starting-value",
    render: (quantity: string) =>
      `Which starting value produces this final ${quantity}?`,
  },
  {
    key: "work-backward",
    render: (quantity: string) =>
      `Work backward to determine the ${quantity} before the percent change.`,
  },
  {
    key: "identify-baseline",
    render: (quantity: string) =>
      `Identify the baseline ${quantity} used to calculate the change.`,
  },
] as const;

const reversePercentRates = [10, 20, 25, 40] as const;
const reversePercentOriginals = [
  80, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360,
] as const;

export const mathVariantDepthTemplates: readonly DeterministicVariantTemplate[] =
  [
    {
      key: "math.inequalities.multiple-select-integer-solutions",
      version: 1,
      targetSkillCode: "MATH.INEQUALITIES",
      questionType: "MULTIPLE_SELECT",
      difficulty: "PROFICIENT",
      structureCapacity: inequalityContexts.length * inequalityFrameKeys.length,
      generate(random) {
        const context = random.pick(inequalityContexts);
        const frameKey = random.pick(inequalityFrameKeys);
        const coefficient = random.integer(2, 5);
        const constant = random.integer(3, 12);
        const boundary = random.integer(4, 12);
        const frame = buildInequalityFrame({
          key: frameKey,
          variable: context.variable,
          coefficient,
          constant,
          boundary,
        });
        const candidateValues = [
          boundary - 2,
          boundary - 1,
          boundary,
          boundary + 1,
          boundary + 2,
        ];
        const choices = random.shuffle(
          candidateValues.map((value, index) => ({
            id: `value-${index + 1}`,
            content: `${context.variable} = ${value}`,
            value,
          })),
        );
        const correctChoices = choices.filter((choice) =>
          satisfiesLinearInequality(
            choice.value,
            frame.left,
            frame.right,
            frame.relation,
          ),
        );
        const incorrectChoices = choices.filter(
          (choice) =>
            !correctChoices.some((correct) => correct.id === choice.id),
        );
        const misconceptionChoice = [...incorrectChoices].sort(
          (left, right) =>
            Math.abs(left.value - boundary) - Math.abs(right.value - boundary),
        )[0];
        if (!misconceptionChoice) {
          throw new Error("Inequality template requires an incorrect choice.");
        }
        const distractorRationales = Object.fromEntries(
          incorrectChoices.map((choice) => {
            const leftValue = evaluateLinearSide(frame.left, choice.value);
            const rightValue = evaluateLinearSide(frame.right, choice.value);
            return [
              choice.id,
              `Substituting ${choice.value} gives ${leftValue} ${relationSymbol(frame.relation)} ${rightValue}, which is false.`,
            ];
          }),
        );
        const correctValues = [...correctChoices]
          .sort((left, right) => left.value - right.value)
          .map((choice) => choice.value);

        return {
          structureKey: `${context.key}.${frameKey}`,
          parameters: {
            coefficient,
            constant,
            boundary,
            candidateValues,
            correctValues,
          },
          candidate: {
            content: {
              questionType: "MULTIPLE_SELECT",
              prompt: `${context.introduction} ${frame.promptLead} Select every listed integer that satisfies ${frame.display}.`,
              choices: choices.map(({ id, content }) => ({ id, content })),
              answerSpec: {
                type: "multiple_select",
                choiceIds: correctChoices.map((choice) => choice.id),
              },
              explanation: `${frame.explanationLead} The inequality simplifies to ${context.variable} ${relationSymbol(frame.solutionRelation)} ${boundary}. Among the listed integers, ${formatList(correctValues)} satisfy that condition.`,
              distractorRationales,
            },
            verificationSpec: {
              kind: "inequality_choices",
              left: frame.left,
              right: frame.right,
              relation: frame.relation,
              candidateValues: Object.fromEntries(
                choices.map((choice) => [choice.id, choice.value]),
              ),
            },
            learningObjective:
              "Solve a one-variable linear inequality and identify every listed integer in its solution set.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must isolate a variable, preserve or reverse the inequality direction correctly, and evaluate several boundary-adjacent choices.",
            estimatedSeconds: 105,
            calculatorPolicy: "NOT_NEEDED",
            commonMisconceptions: ["INEQUALITY_DIRECTION_OR_BOUNDARY_ERROR"],
            misconceptionRules: [
              {
                id: "selects-nearest-invalid-value",
                kind: "selected_choice",
                code: "INEQUALITY_DIRECTION_OR_BOUNDARY_ERROR",
                choiceId: misconceptionChoice.id,
                learnerMessage:
                  "You selected a value immediately outside the solution set. Check both the inequality direction and whether the boundary is included.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "isolate-variable",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "What inverse operations isolate the variable, and will any step reverse the inequality symbol?",
                },
                {
                  id: "test-boundary",
                  kind: "HINT",
                  content:
                    "After solving, test the boundary and one value on each side in the original inequality.",
                },
              ],
              reflectionPrompt:
                "How does substituting each selected value into the original inequality verify the entire choice set?",
            },
          } satisfies GeneratedCandidate,
        };
      },
    },
    {
      key: "math.algebra.distributive-expression-equivalence",
      version: 1,
      targetSkillCode: "MATH.ALGEBRAIC_EXPRESSIONS",
      questionType: "MULTIPLE_SELECT",
      difficulty: "PROFICIENT",
      structureCapacity:
        distributiveContexts.length * distributiveFrames.length,
      generate(random) {
        const context = random.pick(distributiveContexts);
        const frame = random.pick(distributiveFrames);
        const factor = random.integer(2, 6);
        const x = random.integer(2, 8);
        const proposedY = x + random.integer(1, 4);
        const y = proposedY === factor ? proposedY + 1 : proposedY;
        const target = factor * (x + y);
        const distributed = factor * x + factor * y;
        const missingFactor = factor * x + y;
        const changedGrouping = (factor + x) * y;
        const choices = random.shuffle([
          { id: "grouped", content: `${factor}(x + y)` },
          { id: "distributed", content: `${factor}x + ${factor}y` },
          { id: "missing-factor", content: `${factor}x + y` },
          { id: "changed-grouping", content: `(${factor} + x)y` },
        ]);

        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { factor, x, y, target },
          candidate: {
            content: {
              questionType: "MULTIPLE_SELECT",
              prompt: `${context.introduction} ${frame.render({ x, y, factor })}`,
              choices,
              answerSpec: {
                type: "multiple_select",
                choiceIds: ["grouped", "distributed"],
              },
              explanation: `${factor}(x + y) = ${factor}(${x} + ${y}) = ${target}. Distributing gives ${factor}x + ${factor}y = ${factor}(${x}) + ${factor}(${y}) = ${distributed}. Both expressions have the same value.`,
              distractorRationales: {
                "missing-factor": `This gives ${factor}(${x}) + ${y} = ${missingFactor}. The outside factor must multiply both terms inside the parentheses.`,
                "changed-grouping": `This gives (${factor} + ${x})(${y}) = ${changedGrouping}. It changes which quantities are added and multiplied.`,
              },
            },
            verificationSpec: {
              kind: "choice_equivalence",
              target: [x, y, "add", factor, "multiply"],
              candidates: {
                grouped: [x, y, "add", factor, "multiply"],
                distributed: [
                  factor,
                  x,
                  "multiply",
                  factor,
                  y,
                  "multiply",
                  "add",
                ],
                "missing-factor": [factor, x, "multiply", y, "add"],
                "changed-grouping": [factor, x, "add", y, "multiply"],
              },
              tolerance: 0,
            },
            learningObjective:
              "Apply the distributive property and evaluate equivalent algebraic expressions for given variable values.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must substitute two values, preserve grouping, and recognize all—not just one—equivalent forms.",
            estimatedSeconds: 95,
            calculatorPolicy: "NOT_NEEDED",
            commonMisconceptions: ["DISTRIBUTES_TO_ONE_TERM_ONLY"],
            misconceptionRules: [
              {
                id: "selects-partial-distribution",
                kind: "selected_choice",
                code: "DISTRIBUTES_TO_ONE_TERM_ONLY",
                choiceId: "missing-factor",
                learnerMessage:
                  "You multiplied only the first term. The outside factor must multiply every term inside the parentheses.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "evaluate-target",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "What value do you get when you add x and y before applying the outside factor?",
                },
                {
                  id: "distribute-to-each-term",
                  kind: "HINT",
                  content:
                    "If you remove the parentheses, multiply the outside factor by both x and y, then add the products.",
                },
              ],
              reflectionPrompt:
                "How can evaluating every choice provide a numerical check of the distributive property?",
            },
          } satisfies GeneratedCandidate,
        };
      },
    },
    {
      key: "math.word-problems.reverse-percent-change",
      version: 1,
      targetSkillCode: "MATH.WORD_PROBLEMS",
      questionType: "SINGLE_CHOICE",
      difficulty: "PROFICIENT",
      structureCapacity:
        reversePercentContexts.length * reversePercentFrames.length,
      generate(random) {
        const context = random.pick(reversePercentContexts);
        const frame = random.pick(reversePercentFrames);
        const percent = random.pick(reversePercentRates);
        const original = random.pick(reversePercentOriginals);
        const scalePercent =
          context.direction === "decrease" ? 100 - percent : 100 + percent;
        const final = (original * scalePercent) / 100;
        const repeatedChange = (final * scalePercent) / 100;
        const pointReversal =
          context.direction === "decrease" ? final + percent : final - percent;
        const dividesByChange = (final * 100) / percent;
        const choices = random.shuffle([
          { id: "correct", content: formatNumber(original) },
          { id: "repeats-change", content: formatNumber(repeatedChange) },
          { id: "percent-as-points", content: formatNumber(pointReversal) },
          { id: "divides-by-change", content: formatNumber(dividesByChange) },
        ]);

        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: {
            direction: context.direction,
            percent,
            original,
            final,
            scalePercent,
          },
          candidate: {
            content: {
              questionType: "SINGLE_CHOICE",
              prompt: `${context.describe(final, percent)} ${frame.render(context.quantity)}`,
              choices,
              answerSpec: { type: "single_choice", choiceId: "correct" },
              explanation: `The final value is ${scalePercent}% of the original. Divide ${formatNumber(final)} by ${formatNumber(scalePercent / 100)}: ${formatNumber(final)} ÷ ${formatNumber(scalePercent / 100)} = ${original} ${context.unit}.`,
              distractorRationales: {
                "repeats-change":
                  "This applies the same percent change to the final value again instead of reversing the original change.",
                "percent-as-points":
                  "This treats the percent as a fixed number of units. A percent describes a proportion of the unknown original value.",
                "divides-by-change":
                  "This divides by the changed portion alone. The final value represents the remaining or increased percentage of the original.",
              },
            },
            verificationSpec: {
              kind: "numeric_result",
              expression: [final, 100, "multiply", scalePercent, "divide"],
              tolerance: 1e-9,
            },
            learningObjective:
              "Recover an original quantity from a final value after a stated percent increase or decrease.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must translate the final value into a percentage of an unknown baseline and reverse the multiplicative change.",
            estimatedSeconds: 105,
            calculatorPolicy: "ALLOWED",
            commonMisconceptions: ["APPLIES_PERCENT_CHANGE_TWICE"],
            misconceptionRules: [
              {
                id: "repeats-percent-change",
                kind: "selected_choice",
                code: "APPLIES_PERCENT_CHANGE_TWICE",
                choiceId: "repeats-change",
                learnerMessage:
                  "You applied the percent change to the final value again. Express the final value as a percent of the original, then divide to work backward.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "identify-final-percent",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "After the stated change, what percent of the original quantity does the final value represent?",
                },
                {
                  id: "reverse-multiplication",
                  kind: "HINT",
                  content:
                    "Write final = original × final-percent-as-a-decimal, then divide by that decimal.",
                },
              ],
              reflectionPrompt:
                "How can applying the stated percent change to your recovered original verify the final value?",
            },
          } satisfies GeneratedCandidate,
        };
      },
    },
  ];

function buildInequalityFrame(input: {
  key: (typeof inequalityFrameKeys)[number];
  variable: string;
  coefficient: number;
  constant: number;
  boundary: number;
}): InequalityFrameResult {
  const { key, variable, coefficient, constant, boundary } = input;

  if (key === "positive-less-than") {
    const rightConstant = coefficient * boundary + constant;
    return {
      display: `${coefficient}${variable} + ${constant} < ${rightConstant}`,
      left: { coefficient, constant },
      right: { coefficient: 0, constant: rightConstant },
      relation: "lt",
      solutionRelation: "lt",
      promptLead: "This strict inequality sets an upper boundary.",
      explanationLead: `Subtract ${constant}, then divide by positive ${coefficient}; the inequality direction stays the same.`,
    };
  }

  if (key === "positive-greater-equal") {
    const rightConstant = coefficient * boundary - constant;
    return {
      display: `${coefficient}${variable} - ${constant} ≥ ${rightConstant}`,
      left: { coefficient, constant: -constant },
      right: { coefficient: 0, constant: rightConstant },
      relation: "gte",
      solutionRelation: "gte",
      promptLead: "This inequality includes its lower boundary.",
      explanationLead: `Add ${constant}, then divide by positive ${coefficient}; the boundary remains included.`,
    };
  }

  if (key === "negative-less-equal") {
    const rightConstant = constant - coefficient * boundary;
    return {
      display: `${constant} - ${coefficient}${variable} ≤ ${rightConstant}`,
      left: { coefficient: -coefficient, constant },
      right: { coefficient: 0, constant: rightConstant },
      relation: "lte",
      solutionRelation: "gte",
      promptLead:
        "The variable has a negative coefficient, so track the inequality direction.",
      explanationLead: `After subtracting ${constant}, divide by negative ${-coefficient}; this reverses ≤ to ≥.`,
    };
  }

  const rightConstant = coefficient * (boundary + constant);
  return {
    display: `${coefficient}(${variable} + ${constant}) > ${rightConstant}`,
    left: { coefficient, constant: coefficient * constant },
    right: { coefficient: 0, constant: rightConstant },
    relation: "gt",
    solutionRelation: "gt",
    promptLead:
      "Simplify the grouped expression before identifying values above its boundary.",
    explanationLead: `Divide by positive ${coefficient}, then subtract ${constant}; the strict inequality remains strict.`,
  };
}

function evaluateLinearSide(side: LinearSide, value: number) {
  return side.coefficient * value + side.constant;
}

function satisfiesLinearInequality(
  value: number,
  left: LinearSide,
  right: LinearSide,
  relation: InequalityRelation,
) {
  const leftValue = evaluateLinearSide(left, value);
  const rightValue = evaluateLinearSide(right, value);
  if (relation === "lt") return leftValue < rightValue;
  if (relation === "lte") return leftValue <= rightValue;
  if (relation === "gt") return leftValue > rightValue;
  return leftValue >= rightValue;
}

function relationSymbol(relation: InequalityRelation) {
  if (relation === "lt") return "<";
  if (relation === "lte") return "≤";
  if (relation === "gt") return ">";
  return "≥";
}

function formatList(values: number[]) {
  if (values.length < 2) return String(values[0] ?? "");
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function formatNumber(value: number) {
  return Number.parseFloat(value.toFixed(6)).toString();
}
