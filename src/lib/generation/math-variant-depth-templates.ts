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
