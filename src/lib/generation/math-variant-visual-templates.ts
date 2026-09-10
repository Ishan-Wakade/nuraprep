import type { GeneratedCandidate } from "./contracts";
import type {
  DeterministicVariantTemplate,
  SeededRandom,
} from "./deterministic-variants";
import type { RpnExpression } from "@/lib/questions/contracts";

type GraphEntry = { label: string; value: number };

type GraphTask = {
  prompt: string;
  answer: number;
  expression: RpnExpression;
  wrongAnswers: [number, number, number];
  explanation: string;
  misconceptionMessage: string;
};

const graphContexts = [
  {
    key: "study-days",
    title: "Practice questions completed",
    xAxisLabel: "Study day",
    yAxisLabel: "Questions",
    labels: ["Monday", "Tuesday", "Wednesday", "Thursday"],
  },
  {
    key: "clinic-wings",
    title: "Appointments by clinic wing",
    xAxisLabel: "Clinic wing",
    yAxisLabel: "Appointments",
    labels: ["North", "South", "East", "West"],
  },
  {
    key: "library-branches",
    title: "Visits by library branch",
    xAxisLabel: "Library branch",
    yAxisLabel: "Visits",
    labels: ["Oak", "Pine", "Lake", "Hill"],
  },
  {
    key: "supply-teams",
    title: "Supply kits distributed",
    xAxisLabel: "Team",
    yAxisLabel: "Kits",
    labels: ["Team A", "Team B", "Team C", "Team D"],
  },
  {
    key: "class-sessions",
    title: "Attendance by class session",
    xAxisLabel: "Session",
    yAxisLabel: "Learners",
    labels: ["Session 1", "Session 2", "Session 3", "Session 4"],
  },
] as const;

const graphTaskKeys = [
  "range",
  "two-category-total",
  "two-category-difference",
  "mean",
] as const;

export const mathVariantVisualTemplates: readonly DeterministicVariantTemplate[] =
  [
    {
      key: "math.data-interpretation.bar-graph-comparison",
      version: 1,
      targetSkillCode: "MATH.DATA_INTERPRETATION",
      questionType: "SINGLE_CHOICE",
      difficulty: "PROFICIENT",
      structureCapacity: graphContexts.length * graphTaskKeys.length,
      generate(random) {
        const context = random.pick(graphContexts);
        const taskKey = random.pick(graphTaskKeys);
        const start = random.integer(2, 6) * 4;
        const orderedValues = [
          start,
          start + random.integer(1, 2) * 4,
          start + random.integer(3, 4) * 4,
          start + random.integer(5, 7) * 4,
        ];
        const values = random.shuffle(orderedValues);
        const entries = context.labels.map((label, index) => ({
          label,
          value: values[index] ?? 0,
        }));
        const task = buildGraphTask(taskKey, entries, context.title);

        return {
          structureKey: `${context.key}.${taskKey}`,
          parameters: {
            taskKey,
            values,
            answer: task.answer,
          },
          candidate: singleChoiceGraphCandidate(random, {
            context,
            task,
            entries,
          }),
        };
      },
    },
  ];

function buildGraphTask(
  task: (typeof graphTaskKeys)[number],
  entries: GraphEntry[],
  graphTitle: string,
): GraphTask {
  const values = entries.map((entry) => entry.value);
  const maximum = Math.max(...values);
  const minimum = Math.min(...values);
  const total = values.reduce((sum, value) => sum + value, 0);

  if (task === "range") {
    const answer = maximum - minimum;
    return {
      prompt: `For ${graphTitle.toLocaleLowerCase("en-US")}, compare ${formatList(entries.map((entry) => entry.label))}. What value results when the shortest bar is subtracted from the tallest bar?`,
      answer,
      expression: [maximum, minimum, "subtract"],
      wrongAnswers: uniqueWrongAnswers(answer, [maximum, minimum, total]),
      explanation: `The greatest bar value is ${maximum}, and the least is ${minimum}. The range is ${maximum} - ${minimum} = ${answer}.`,
      misconceptionMessage:
        "You selected a graph value without subtracting the least value from the greatest value.",
    };
  }

  if (task === "two-category-total") {
    const first = entries[0] as GraphEntry;
    const second = entries[2] as GraphEntry;
    const answer = first.value + second.value;
    return {
      prompt: `The ${graphTitle.toLocaleLowerCase("en-US")} chart includes ${first.label} and ${second.label}. Add the heights of those two bars. What total do they give?`,
      answer,
      expression: [first.value, second.value, "add"],
      wrongAnswers: uniqueWrongAnswers(answer, [
        Math.abs(first.value - second.value),
        total,
        first.value,
      ]),
      explanation: `Read ${first.value} for ${first.label} and ${second.value} for ${second.label}. Their combined value is ${first.value} + ${second.value} = ${answer}.`,
      misconceptionMessage:
        "You used a difference or a single bar value instead of combining the two requested values.",
    };
  }

  if (task === "two-category-difference") {
    const first = entries[1] as GraphEntry;
    const second = entries[3] as GraphEntry;
    const higher = Math.max(first.value, second.value);
    const lower = Math.min(first.value, second.value);
    const answer = higher - lower;
    return {
      prompt: `Compare the ${first.label} and ${second.label} bars in ${graphTitle.toLocaleLowerCase("en-US")}. Subtract the shorter bar's value from the taller bar's value. What is the difference?`,
      answer,
      expression: [higher, lower, "subtract"],
      wrongAnswers: uniqueWrongAnswers(answer, [
        first.value + second.value,
        higher,
        lower,
      ]),
      explanation: `The two bars show ${first.value} and ${second.value}. Subtract the smaller value from the larger: ${higher} - ${lower} = ${answer}.`,
      misconceptionMessage:
        "You identified one bar or added the bars instead of finding the positive difference between them.",
    };
  }

  const answer = total / entries.length;
  return {
    prompt: `Average the displayed values for ${formatList(entries.map((entry) => entry.label))} in ${graphTitle.toLocaleLowerCase("en-US")}. What is their arithmetic mean?`,
    answer,
    expression: [
      values[0] ?? 0,
      values[1] ?? 0,
      "add",
      values[2] ?? 0,
      "add",
      values[3] ?? 0,
      "add",
      entries.length,
      "divide",
    ],
    wrongAnswers: uniqueWrongAnswers(answer, [
      total,
      maximum - minimum,
      maximum,
    ]),
    explanation: `The four values total ${total}. Divide by 4: ${total} ÷ 4 = ${answer}.`,
    misconceptionMessage:
      "You found the total or another graph summary but did not divide the total by all four categories.",
  };
}

function singleChoiceGraphCandidate(
  random: SeededRandom,
  input: {
    context: (typeof graphContexts)[number];
    task: GraphTask;
    entries: GraphEntry[];
  },
): GeneratedCandidate {
  const { context, entries, task } = input;
  const choices = random.shuffle([
    { id: "correct", content: String(task.answer) },
    { id: "wrong-operation", content: String(task.wrongAnswers[0]) },
    { id: "single-bar", content: String(task.wrongAnswers[1]) },
    { id: "scale-error", content: String(task.wrongAnswers[2]) },
  ]);
  const bars = entries.map((entry) => ({ ...entry }));

  return {
    content: {
      questionType: "SINGLE_CHOICE",
      prompt: task.prompt,
      stimulus: {
        type: "graph",
        accessibleDescription: `A bar graph titled ${context.title} shows ${bars.map((bar) => `${bar.label}: ${bar.value}`).join(", ")}. The horizontal axis is ${context.xAxisLabel}, and the vertical axis is ${context.yAxisLabel}.`,
        data: {
          kind: "bar",
          title: context.title,
          xAxisLabel: context.xAxisLabel,
          yAxisLabel: context.yAxisLabel,
          bars,
        },
      },
      choices,
      answerSpec: { type: "single_choice", choiceId: "correct" },
      explanation: task.explanation,
      distractorRationales: {
        "wrong-operation":
          "This applies a different arithmetic operation to the displayed values.",
        "single-bar":
          "This uses one visible bar or summary value without completing the requested calculation.",
        "scale-error":
          "This does not match the values and operation requested by the graph question.",
      },
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: task.expression,
      tolerance: 1e-9,
    },
    learningObjective:
      "Read exact values from a bar graph and apply the requested arithmetic summary or comparison.",
    difficulty: "PROFICIENT",
    difficultyRationale:
      "The learner must interpret a labeled visual scale, identify the relevant bars, and select the correct operation.",
    estimatedSeconds: 100,
    calculatorPolicy: "ALLOWED",
    commonMisconceptions: ["GRAPH_OPERATION_MISMATCH"],
    misconceptionRules: [
      {
        id: "selects-wrong-operation",
        kind: "selected_choice",
        code: "GRAPH_OPERATION_MISMATCH",
        choiceId: "wrong-operation",
        learnerMessage: task.misconceptionMessage,
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "read-bars",
          kind: "SOCRATIC_QUESTION",
          content: "Which exact bar values does the question ask you to use?",
        },
        {
          id: "choose-operation",
          kind: "HINT",
          content:
            "Write the requested operation in words before substituting the graph values.",
        },
      ],
      reflectionPrompt:
        "How can the graph labels and scale help you check whether your result is reasonable?",
    },
  };
}

function uniqueWrongAnswers(
  answer: number,
  proposed: [number, number, number],
): [number, number, number] {
  const values = new Set<number>();
  for (const value of proposed) {
    if (value !== answer) values.add(value);
  }
  let offset = 1;
  while (values.size < 3) {
    const value = answer + offset;
    if (value !== answer) values.add(value);
    offset += 1;
  }
  return [...values].slice(0, 3) as [number, number, number];
}

function formatList(values: string[]) {
  if (values.length < 2) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}
