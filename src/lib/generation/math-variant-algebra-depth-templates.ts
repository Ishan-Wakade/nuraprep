import type { RpnExpression } from "@/lib/questions/contracts";

import type { GeneratedCandidate } from "./contracts";
import type { DeterministicVariantTemplate } from "./deterministic-variants";

const expressionContexts = [
  "A learner evaluates a grouped expression.",
  "A dosage-planning exercise uses an algebraic expression.",
  "A supply model is represented by an expression.",
  "A study example requires substitution and simplification.",
  "A measurement rule is written as an expression.",
  "A practice card shows a grouped algebraic calculation.",
] as const;

const expressionFrames = [
  {
    key: "arrange-evaluation",
    render: (context: string, expression: string, x: number) =>
      `${context} Arrange the steps in the correct order to evaluate ${expression} when x = ${x}.`,
  },
  {
    key: "order-substitution-steps",
    render: (context: string, expression: string, x: number) =>
      `${context} Put the substitution and simplification steps in order for ${expression} with x = ${x}.`,
  },
  {
    key: "sequence-work",
    render: (context: string, expression: string, x: number) =>
      `${context} Sequence the work from first to last to find the value of ${expression} at x = ${x}.`,
  },
  {
    key: "correct-process",
    render: (context: string, expression: string, x: number) =>
      `${context} Which ordering shows a correct process for evaluating ${expression} if x = ${x}?`,
  },
] as const;

const inequalityContexts = [
  { key: "practice-minutes", noun: "practice minutes" },
  { key: "donated-books", noun: "donated books" },
  { key: "packed-kits", noun: "packed kits" },
  { key: "training-points", noun: "training points" },
  { key: "service-hours", noun: "service hours" },
] as const;

const inequalityFrames = [
  {
    key: "minimum-increase",
    render: (base: number, rate: number, target: number, noun: string) =>
      `A group starts with ${base} ${noun} and adds ${rate} each round. It needs at least ${target}. What is the minimum whole number of rounds required?`,
  },
  {
    key: "meet-target",
    render: (base: number, rate: number, target: number, noun: string) =>
      `The total number of ${noun} after x rounds is ${base} + ${rate}x. Find the least whole-number x for which the total is at least ${target}.`,
  },
  {
    key: "lower-bound",
    render: (base: number, rate: number, target: number, noun: string) =>
      `A plan already has ${base} ${noun}. Each additional round contributes ${rate}. How many full rounds are needed to reach or exceed ${target}?`,
  },
  {
    key: "solve-practical-inequality",
    render: (base: number, rate: number, target: number, noun: string) =>
      `Solve the practical condition ${base} + ${rate}x ≥ ${target}, where x is a whole number of rounds used to accumulate ${noun}. Give the smallest allowed x.`,
  },
] as const;

const equationContexts = [
  "During an algebra review",
  "In a planning model",
  "For a balance check",
  "In a practice exercise",
  "Within a comparison model",
  "For a two-plan calculation",
] as const;

const equationFrames = [
  {
    key: "solve-both-sides",
    render: (context: string, equation: string) =>
      `${context}, solve the equation ${equation}.`,
  },
  {
    key: "isolate-variable",
    render: (context: string, equation: string) =>
      `${context}, isolate x when ${equation}.`,
  },
  {
    key: "equal-expressions",
    render: (context: string, equation: string) =>
      `${context}, find the x-value that makes the two expressions in ${equation} equal.`,
  },
  {
    key: "verify-balance",
    render: (context: string, equation: string) =>
      `${context}, determine the value of x that keeps ${equation} balanced.`,
  },
] as const;

const percentContexts = [
  { key: "volunteer-count", noun: "volunteers" },
  { key: "supply-total", noun: "supply units" },
  { key: "practice-score", noun: "practice points" },
  { key: "weekly-visits", noun: "weekly visits" },
  { key: "book-collection", noun: "collected books" },
] as const;

const percentFrames = [
  {
    key: "percent-increase",
    render: (original: number, updated: number, noun: string) =>
      `A count rises from ${original} ${noun} to ${updated} ${noun}. What is the percent increase?`,
  },
  {
    key: "relative-change",
    render: (original: number, updated: number, noun: string) =>
      `There were ${original} ${noun} before a change and ${updated} afterward. Express the increase as a percent of the original count.`,
  },
  {
    key: "new-versus-original",
    render: (original: number, updated: number, noun: string) =>
      `The number of ${noun} changes from ${original} to ${updated}. By what percentage did the original amount increase?`,
  },
  {
    key: "calculate-increase-rate",
    render: (original: number, updated: number, noun: string) =>
      `A report shows ${original} ${noun} initially and ${updated} later. Calculate (increase ÷ original) × 100%.`,
  },
] as const;

export const mathVariantAlgebraDepthTemplates: readonly DeterministicVariantTemplate[] =
  [
    {
      key: "math.algebra.order-expression-evaluation",
      version: 1,
      targetSkillCode: "MATH.ALGEBRAIC_EXPRESSIONS",
      questionType: "ORDERED_RESPONSE",
      difficulty: "PROFICIENT",
      structureCapacity: 20,
      generate(random) {
        const context = random.pick(expressionContexts);
        const frame = random.pick(expressionFrames);
        const coefficient = random.integer(2, 6);
        const x = random.integer(2, 9);
        const offset = random.integer(1, 7);
        const subtraction = random.integer(2, 12);
        const grouped = x + offset;
        const product = coefficient * grouped;
        const answer = product - subtraction;
        const expression = `${coefficient}(x + ${offset}) - ${subtraction}`;
        const steps = [
          {
            id: "substitute",
            content: `Substitute ${x} for x: ${coefficient}(${x} + ${offset}) - ${subtraction}.`,
          },
          {
            id: "parentheses",
            content: `Evaluate the parentheses: ${coefficient} × ${grouped} - ${subtraction}.`,
          },
          {
            id: "multiply",
            content: `Multiply: ${product} - ${subtraction}.`,
          },
          { id: "subtract", content: `Subtract to obtain ${answer}.` },
        ];
        return {
          structureKey: `${slug(context)}.${frame.key}`,
          parameters: {
            coefficient,
            x,
            offset,
            subtraction,
            answer,
          },
          candidate: {
            content: {
              questionType: "ORDERED_RESPONSE",
              prompt: frame.render(context, expression, x),
              choices: random.shuffle(steps),
              answerSpec: {
                type: "ordered_response",
                itemIds: steps.map((step) => step.id),
              },
              explanation: `First substitute ${x}. Then evaluate the parentheses, multiply by ${coefficient}, and subtract ${subtraction}. The expression equals ${answer}.`,
              distractorRationales: {},
            },
            verificationSpec: {
              kind: "ordered_values",
              values: {
                substitute: 1,
                parentheses: 2,
                multiply: 3,
                subtract: 4,
              },
              direction: "ascending",
            },
            learningObjective:
              "Sequence substitution and order-of-operations steps for a grouped algebraic expression.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must preserve a four-step dependency chain involving substitution, grouping, multiplication, and subtraction.",
            estimatedSeconds: 95,
            calculatorPolicy: "NOT_NEEDED",
            commonMisconceptions: ["MULTIPLIES_BEFORE_EVALUATING_GROUP"],
            misconceptionRules: [
              {
                id: "reverses-group-and-multiply",
                kind: "reversed_pair",
                code: "MULTIPLIES_BEFORE_EVALUATING_GROUP",
                earlierItemId: "parentheses",
                laterItemId: "multiply",
                learnerMessage:
                  "Evaluate the grouped addition before multiplying by the outside coefficient.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "locate-first-action",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "After substituting the given x-value, which operation is inside the parentheses?",
                },
                {
                  id: "follow-order",
                  kind: "HINT",
                  content:
                    "Substitute, simplify the group, multiply, and perform the final subtraction.",
                },
              ],
              reflectionPrompt:
                "Why would multiplying before simplifying the parentheses change the written process?",
            },
          },
        };
      },
    },
    {
      key: "math.inequalities.minimum-whole-number",
      version: 1,
      targetSkillCode: "MATH.INEQUALITIES",
      questionType: "NUMERIC",
      difficulty: "DEVELOPING",
      structureCapacity: inequalityContexts.length * inequalityFrames.length,
      generate(random) {
        const context = random.pick(inequalityContexts);
        const frame = random.pick(inequalityFrames);
        const base = random.integer(5, 30);
        const rate = random.integer(3, 12);
        const answer = random.integer(3, 12);
        const target = base + rate * answer;
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { base, rate, target, answer },
          candidate: numericCandidate({
            prompt: frame.render(base, rate, target, context.noun),
            answer,
            verificationExpression: [target, base, "subtract", rate, "divide"],
            learningObjective:
              "Solve a lower-bound inequality and identify the least whole-number solution in context.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner translates an at-least condition into a two-step calculation and interprets the boundary as a minimum.",
            estimatedSeconds: 80,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `Subtract the starting ${base} from ${target}: ${target} - ${base} = ${target - base}. Divide by ${rate} per round: ${target - base} ÷ ${rate} = ${answer}. Since the target must be met or exceeded, ${answer} is the minimum whole number of rounds.`,
            misconception: {
              code: "STOPS_BELOW_MINIMUM_TARGET",
              value: answer - 1,
              message: `${answer - 1} rounds produce only ${base + rate * (answer - 1)}, which is below the required ${target}.`,
            },
            tutorQuestion:
              "How much more is needed after subtracting the starting amount?",
            tutorHint:
              "Divide the remaining amount by the contribution per round, then check that one fewer round falls short.",
            reflection:
              "How does the phrase at least affect which boundary value is allowed?",
          }),
        };
      },
    },
    {
      key: "math.linear-equations.variable-both-sides",
      version: 1,
      targetSkillCode: "MATH.LINEAR_EQUATIONS",
      questionType: "NUMERIC",
      difficulty: "ADVANCED",
      structureCapacity: 20,
      generate(random) {
        const context = random.pick(equationContexts);
        const frame = random.pick(equationFrames);
        const rightCoefficient = random.integer(1, 4);
        const leftCoefficient = rightCoefficient + random.integer(2, 6);
        const answer = random.integer(2, 12);
        const leftConstant = random.integer(1, 10);
        const rightConstant =
          (leftCoefficient - rightCoefficient) * answer + leftConstant;
        const equation = `${leftCoefficient}x + ${leftConstant} = ${rightCoefficient}x + ${rightConstant}`;
        return {
          structureKey: `${slug(context)}.${frame.key}`,
          parameters: {
            leftCoefficient,
            rightCoefficient,
            leftConstant,
            rightConstant,
            answer,
          },
          candidate: numericCandidate({
            prompt: frame.render(context, equation),
            answer,
            verificationExpression: [
              rightConstant,
              leftConstant,
              "subtract",
              leftCoefficient,
              rightCoefficient,
              "subtract",
              "divide",
            ],
            learningObjective:
              "Solve a linear equation with variable terms on both sides.",
            difficulty: "ADVANCED",
            difficultyRationale:
              "The learner must preserve equality while consolidating variable terms and constants from opposite sides before dividing.",
            estimatedSeconds: 110,
            calculatorPolicy: "NOT_NEEDED",
            explanation: `Subtract ${rightCoefficient}x from both sides to get ${leftCoefficient - rightCoefficient}x + ${leftConstant} = ${rightConstant}. Subtract ${leftConstant}: ${leftCoefficient - rightCoefficient}x = ${rightConstant - leftConstant}. Divide by ${leftCoefficient - rightCoefficient}, so x = ${answer}.`,
            misconception: {
              code: "ADDS_COEFFICIENTS_ACROSS_EQUALITY",
              value: roundHundredth(
                (rightConstant - leftConstant) /
                  (leftCoefficient + rightCoefficient),
              ),
              tolerance: 0.01,
              message:
                "Moving a variable term across the equality sign requires subtraction here, so subtract the coefficients rather than add them.",
            },
            tutorQuestion:
              "Which variable term can you subtract from both sides to collect x-terms on one side?",
            tutorHint:
              "Subtract the smaller x-term from both sides, then move the remaining constant and divide.",
            reflection:
              "How can substituting your solution into both sides verify the equation?",
          }),
        };
      },
    },
    {
      key: "math.word-problems.percent-increase",
      version: 1,
      targetSkillCode: "MATH.WORD_PROBLEMS",
      questionType: "SINGLE_CHOICE",
      difficulty: "DEVELOPING",
      structureCapacity: percentContexts.length * percentFrames.length,
      generate(random) {
        const context = random.pick(percentContexts);
        const frame = random.pick(percentFrames);
        const original = random.pick([40, 60, 80, 120, 140, 160, 180, 200]);
        const percent = random.pick([10, 15, 20, 25, 30] as const);
        const increase = (original * percent) / 100;
        const updated = original + increase;
        const choices = random.shuffle([
          { id: "correct", content: `${percent}%` },
          { id: "new-as-percent", content: `${100 + percent}%` },
          { id: "increase-amount", content: `${increase}%` },
          { id: "half-rate", content: `${percent / 2}%` },
        ]);
        return {
          structureKey: `${context.key}.${frame.key}`,
          parameters: { original, updated, increase, percent },
          candidate: {
            content: {
              questionType: "SINGLE_CHOICE",
              prompt: frame.render(original, updated, context.noun),
              choices,
              answerSpec: { type: "single_choice", choiceId: "correct" },
              explanation: `The increase is ${updated} - ${original} = ${increase}. Divide by the original amount: ${increase} ÷ ${original} = ${formatNumber(increase / original)}. Multiply by 100% to get ${percent}%.`,
              distractorRationales: {
                "new-as-percent":
                  "This expresses the new amount as a percent of the original, not the percent increase alone.",
                "increase-amount":
                  "This attaches a percent sign to the amount of change without dividing by the original amount.",
                "half-rate":
                  "This halves the correct rate even though the comparison uses the full increase.",
              },
            },
            verificationSpec: {
              kind: "numeric_result",
              expression: [percent, 100, "divide"],
              tolerance: 0.0001,
            },
            learningObjective:
              "Calculate percent increase by comparing change with the original quantity.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner identifies the original amount, finds a change, and applies the standard percent-change relationship.",
            estimatedSeconds: 85,
            calculatorPolicy: "ALLOWED",
            commonMisconceptions: ["USES_NEW_TOTAL_AS_PERCENT_INCREASE"],
            misconceptionRules: [
              {
                id: "selects-new-total-percent",
                kind: "selected_choice",
                code: "USES_NEW_TOTAL_AS_PERCENT_INCREASE",
                choiceId: "new-as-percent",
                learnerMessage:
                  "Percent increase compares only the change with the original amount, not the full new amount.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "identify-change",
                  kind: "SOCRATIC_QUESTION",
                  content: "What is the increase from the original amount?",
                },
                {
                  id: "compare-original",
                  kind: "HINT",
                  content:
                    "Divide the increase by the original amount, then multiply by 100%.",
                },
              ],
              reflectionPrompt:
                "Why is the original amount, rather than the new amount, the comparison base?",
            },
          },
        };
      },
    },
  ];

function numericCandidate(input: {
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

function roundHundredth(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
