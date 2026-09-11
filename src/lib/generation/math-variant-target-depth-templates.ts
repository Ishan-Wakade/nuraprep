import type { GeneratedCandidate } from "./contracts";
import type { DeterministicVariantTemplate } from "./deterministic-variants";
import type { QuestionStimulus } from "@/lib/questions/contracts";

const arithmeticContexts = [
  { key: "supply-count", noun: "supply items" },
  { key: "practice-pages", noun: "practice pages" },
  { key: "event-seats", noun: "event seats" },
  { key: "donation-boxes", noun: "donation boxes" },
  { key: "training-cards", noun: "training cards" },
] as const;

const arithmeticFrames = [
  (first: number, second: number, noun: string) =>
    `A record lists ${first} ${noun} in one group and ${second} in another. Select all expressions equal to the combined count.`,
  (first: number, second: number, noun: string) =>
    `Two sets contain ${first} and ${second} ${noun}. Which expressions represent their total? Select all that apply.`,
  (first: number, second: number, noun: string) =>
    `The combined number of ${noun} is ${first} + ${second}. Select every equivalent addition expression.`,
  (first: number, second: number, noun: string) =>
    `A coordinator combines ${first} ${noun} with ${second} more. Select all decompositions that equal the resulting total.`,
] as const;

const thresholdContexts = [
  {
    key: "sessions",
    caption: "Completed sessions by learner",
    categoryHeader: "Learner",
    valueHeader: "Sessions",
    labels: ["Ari", "Blair", "Casey", "Devon"],
  },
  {
    key: "donations",
    caption: "Donations by site",
    categoryHeader: "Site",
    valueHeader: "Items",
    labels: ["Aster", "Birch", "Cedar", "Dove"],
  },
  {
    key: "minutes",
    caption: "Practice time by group",
    categoryHeader: "Group",
    valueHeader: "Minutes",
    labels: ["North", "South", "East", "West"],
  },
  {
    key: "visits",
    caption: "Weekly visits by location",
    categoryHeader: "Location",
    valueHeader: "Visits",
    labels: ["Lake", "Hill", "Park", "Grove"],
  },
  {
    key: "forms",
    caption: "Forms processed by team",
    categoryHeader: "Team",
    valueHeader: "Forms",
    labels: ["Amber", "Blue", "Coral", "Green"],
  },
] as const;

const thresholdFrames = [
  (header: string, threshold: number) =>
    `Select every row whose ${header.toLocaleLowerCase("en-US")} value is at least ${threshold}.`,
  (header: string, threshold: number) =>
    `Which rows meet or exceed ${threshold} ${header.toLocaleLowerCase("en-US")}? Select all that apply.`,
  (header: string, threshold: number) =>
    `A row qualifies when ${header.toLocaleLowerCase("en-US")} is greater than or equal to ${threshold}. Select all qualifying rows.`,
  (header: string, threshold: number) =>
    `Use the table to identify every category with ${threshold} or more ${header.toLocaleLowerCase("en-US")}.`,
] as const;

const elapsedContexts = [
  "A study session",
  "A training workshop",
  "A volunteer shift",
  "A review meeting",
  "A skills lab",
] as const;

const elapsedFrames = [
  (context: string, start: string, end: string) =>
    `${context} starts at ${start} and ends at ${end}. How many minutes does it last?`,
  (context: string, start: string, end: string) =>
    `${context} runs from ${start} through ${end}. Enter the elapsed time in minutes.`,
  (context: string, start: string, end: string) =>
    `The scheduled start for ${context.toLocaleLowerCase("en-US")} is ${start}, and the finish is ${end}. Calculate the duration in minutes.`,
  (context: string, start: string, end: string) =>
    `Find the number of minutes between ${start} and ${end} for ${context.toLocaleLowerCase("en-US")}.`,
] as const;

const ratioContexts = [
  { key: "training-kits", item: "training kits", material: "solution" },
  { key: "care-packs", item: "care packs", material: "mixture" },
  { key: "sample-trays", item: "sample trays", material: "liquid" },
  { key: "supply-batches", item: "supply batches", material: "cleaner" },
  { key: "practice-models", item: "practice models", material: "material" },
] as const;

const ratioFrames = [
  (
    cups: number,
    items: number,
    material: string,
    target: number,
    itemName: string,
  ) =>
    `${cups} cups of ${material} prepare ${items} ${itemName}. Arrange the steps to find how many pints are needed for ${target} ${itemName}. Use 2 cups = 1 pint.`,
  (
    cups: number,
    items: number,
    material: string,
    target: number,
    itemName: string,
  ) =>
    `A proportional plan uses ${cups} cups of ${material} for ${items} ${itemName}. Put the steps in order to scale to ${target} ${itemName} and convert the result to pints.`,
  (
    cups: number,
    items: number,
    material: string,
    target: number,
    itemName: string,
  ) =>
    `Sequence the work for this proportion-and-conversion problem: ${cups} cups for ${items} ${itemName}, scaled to ${target} ${itemName}, with 2 cups per pint.`,
  (
    cups: number,
    items: number,
    material: string,
    target: number,
    itemName: string,
  ) =>
    `For ${cups} cups of ${material} per ${items} ${itemName}, arrange a correct process for finding the pints required by ${target} ${itemName}.`,
] as const;

const percentContexts = [
  { key: "completed-items", noun: "completed items" },
  { key: "practice-minutes", noun: "practice minutes" },
  { key: "supply-units", noun: "supply units" },
  { key: "survey-responses", noun: "survey responses" },
  { key: "review-cards", noun: "review cards" },
] as const;

const percentFrames = [
  (percent: number, amount: number, noun: string) =>
    `A learner completes ${percent}% of ${amount} ${noun}. How many ${noun} does the learner complete?`,
  (percent: number, amount: number, noun: string) =>
    `Find ${percent}% of ${amount} ${noun}.`,
  (percent: number, amount: number, noun: string) =>
    `A plan assigns ${percent}% of a total of ${amount} ${noun}. Which number represents the assigned part?`,
  (percent: number, amount: number, noun: string) =>
    `Calculate the portion represented by ${percent}% when the whole is ${amount} ${noun}.`,
] as const;

const borderContexts = [
  { key: "garden", noun: "rectangular garden" },
  { key: "training-area", noun: "rectangular training area" },
  { key: "display", noun: "rectangular display" },
  { key: "storage-zone", noun: "rectangular storage zone" },
  { key: "courtyard", noun: "rectangular courtyard" },
] as const;

const borderFrames = [
  (
    noun: string,
    length: number,
    width: number,
    strands: number,
    opening: number,
  ) =>
    `A ${noun} is ${length} m by ${width} m. It needs ${strands} complete strands around the boundary, but each strand leaves a ${opening} m opening. How many meters of material are needed?`,
  (
    noun: string,
    length: number,
    width: number,
    strands: number,
    opening: number,
  ) =>
    `The perimeter of a ${noun} measuring ${length} m by ${width} m will be covered ${strands} times. A ${opening} m entrance is omitted from every layer. Find the total material length.`,
  (
    noun: string,
    length: number,
    width: number,
    strands: number,
    opening: number,
  ) =>
    `A ${length} m by ${width} m ${noun} uses ${strands} parallel border lines. Each line stops for a ${opening} m opening. What total length of border material is required?`,
  (
    noun: string,
    length: number,
    width: number,
    strands: number,
    opening: number,
  ) =>
    `Calculate ${strands} times the usable perimeter of a ${noun} with length ${length} m, width ${width} m, and a ${opening} m gap in each circuit.`,
] as const;

const medianContexts = [
  { key: "scores", caption: "Score frequency", header: "Score" },
  { key: "books", caption: "Books read frequency", header: "Books read" },
  { key: "sessions", caption: "Session frequency", header: "Sessions" },
  {
    key: "minutes",
    caption: "Practice-minute frequency",
    header: "Practice minutes",
  },
  {
    key: "tasks",
    caption: "Completed-task frequency",
    header: "Completed tasks",
  },
] as const;

const medianFrames = [
  () => "What is the median represented by the frequency table?",
  () => "Expand the frequencies mentally and determine the median.",
  () =>
    "Use the frequency column to find the middle observation. Enter the median.",
  () =>
    "Which value occupies the middle position when every frequency is counted?",
] as const;

const metricContexts = [
  { key: "ribbon", noun: "ribbon" },
  { key: "cable", noun: "cable" },
  { key: "fabric", noun: "fabric" },
  { key: "walking-path", noun: "walking path" },
  { key: "border-strip", noun: "border strip" },
] as const;

const metricFrames = [
  (quantity: number, noun: string) =>
    `A ${noun} measures ${quantity} meters. Arrange the steps to convert the measurement to centimeters.`,
  (quantity: number, noun: string) =>
    `Put the conversion process in order for changing ${quantity} meters of ${noun} into centimeters.`,
  (quantity: number, noun: string) =>
    `Sequence the work from first to last to express a ${quantity}-meter ${noun} in centimeters.`,
  (quantity: number, noun: string) =>
    `Using 1 meter = 100 centimeters, arrange a correct solution for ${quantity} meters of ${noun}.`,
] as const;

export const mathVariantTargetDepthTemplates: readonly DeterministicVariantTemplate[] =
  [
    {
      key: "math.arithmetic.equivalent-sum-decompositions",
      version: 1,
      targetSkillCode: "MATH.ARITHMETIC",
      questionType: "MULTIPLE_SELECT",
      difficulty: "FOUNDATIONAL",
      structureCapacity: 20,
      generate(random) {
        const context = random.pick(arithmeticContexts);
        const frameIndex = random.integer(0, arithmeticFrames.length - 1);
        const first = random.integer(24, 68);
        const second = random.integer(16, 47);
        const total = first + second;
        const tens = Math.floor(total / 10) * 10;
        const ones = total - tens;
        const choices = random.shuffle([
          { id: "place-value", content: `${tens} + ${ones}` },
          { id: "regrouped", content: `${total - 10} + 10` },
          { id: "subtracts-ones", content: `${tens} - ${ones}` },
          { id: "adds-extra-ten", content: `${total} + 10` },
        ]);
        return {
          structureKey: `${context.key}.frame-${frameIndex + 1}`,
          parameters: { first, second, total, tens, ones },
          candidate: {
            content: {
              questionType: "MULTIPLE_SELECT",
              prompt: arithmeticFrames[frameIndex](first, second, context.noun),
              choices,
              answerSpec: {
                type: "multiple_select",
                choiceIds: ["place-value", "regrouped"],
              },
              explanation: `${first} + ${second} = ${total}. Both ${tens} + ${ones} and ${total - 10} + 10 equal ${total}; the other expressions do not.`,
              distractorRationales: {
                "subtracts-ones":
                  "This subtracts the ones instead of combining them with the tens.",
                "adds-extra-ten":
                  "This adds another ten after the total has already been reached.",
              },
            },
            verificationSpec: {
              kind: "choice_equivalence",
              target: [first, second, "add"],
              candidates: {
                "place-value": [tens, ones, "add"],
                regrouped: [total, 10, "subtract", 10, "add"],
                "subtracts-ones": [tens, ones, "subtract"],
                "adds-extra-ten": [total, 10, "add"],
              },
              tolerance: 0,
            },
            learningObjective:
              "Recognize equivalent whole-number decompositions of a sum.",
            difficulty: "FOUNDATIONAL",
            difficultyRationale:
              "The learner computes one sum and compares simple place-value decompositions without a multi-step model.",
            estimatedSeconds: 65,
            calculatorPolicy: "NOT_NEEDED",
            commonMisconceptions: ["SUBTRACTS_PLACE_VALUE_PART"],
            misconceptionRules: [
              {
                id: "selects-subtraction",
                kind: "selected_choice",
                code: "SUBTRACTS_PLACE_VALUE_PART",
                choiceId: "subtracts-ones",
                learnerMessage:
                  "A decomposition of a positive total must recombine its parts with addition here.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "find-total",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "What is the combined count before you inspect the choices?",
                },
                {
                  id: "evaluate-each",
                  kind: "HINT",
                  content:
                    "Evaluate every expression separately and select each one equal to the total.",
                },
              ],
              reflectionPrompt:
                "How can the same total be decomposed into more than one pair of addends?",
            },
          },
        };
      },
    },
    {
      key: "math.data-interpretation.table-threshold-selection",
      version: 1,
      targetSkillCode: "MATH.DATA_INTERPRETATION",
      questionType: "MULTIPLE_SELECT",
      difficulty: "DEVELOPING",
      structureCapacity: 20,
      generate(random) {
        const context = random.pick(thresholdContexts);
        const frameIndex = random.integer(0, thresholdFrames.length - 1);
        const threshold = random.integer(30, 75);
        const values = random.shuffle([
          threshold - random.integer(7, 14),
          threshold - random.integer(1, 5),
          threshold + random.integer(1, 6),
          threshold + random.integer(8, 16),
        ]);
        const rows = context.labels.map((label, index) => ({
          id: `row-${index + 1}`,
          label,
          value: values[index],
        }));
        const correctIds = rows
          .filter((row) => row.value >= threshold)
          .map((row) => row.id);
        const belowRows = rows.filter((row) => row.value < threshold);
        const nearestBelow = belowRows.reduce((nearest, row) =>
          row.value > nearest.value ? row : nearest,
        );
        return {
          structureKey: `${context.key}.frame-${frameIndex + 1}`,
          parameters: { threshold, rows },
          candidate: {
            content: {
              questionType: "MULTIPLE_SELECT",
              stimulus: tableStimulus(
                context.caption,
                [context.categoryHeader, context.valueHeader],
                rows.map((row) => [row.label, String(row.value)]),
              ),
              prompt: thresholdFrames[frameIndex](
                context.valueHeader,
                threshold,
              ),
              choices: random.shuffle(
                rows.map((row) => ({ id: row.id, content: row.label })),
              ),
              answerSpec: {
                type: "multiple_select",
                choiceIds: correctIds,
              },
              explanation: `Compare each value with ${threshold}. ${rows
                .filter((row) => row.value >= threshold)
                .map((row) => `${row.label} (${row.value})`)
                .join(
                  " and ",
                )} meet or exceed the threshold; the other rows are below it.`,
              distractorRationales: Object.fromEntries(
                belowRows.map((row) => [
                  row.id,
                  `${row.value} is less than ${threshold}, so this row does not qualify.`,
                ]),
              ),
            },
            verificationSpec: {
              kind: "inequality_choices",
              left: { coefficient: 1, constant: 0 },
              right: { coefficient: 0, constant: threshold },
              relation: "gte",
              candidateValues: Object.fromEntries(
                rows.map((row) => [row.id, row.value]),
              ),
            },
            learningObjective:
              "Interpret a table and select every category that satisfies a lower-bound condition.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner must interpret an inclusive comparison and apply it independently to four table rows.",
            estimatedSeconds: 75,
            calculatorPolicy: "NOT_NEEDED",
            commonMisconceptions: ["TREATS_AT_LEAST_AS_BELOW"],
            misconceptionRules: [
              {
                id: "selects-nearest-below",
                kind: "selected_choice",
                code: "TREATS_AT_LEAST_AS_BELOW",
                choiceId: nearestBelow.id,
                learnerMessage: `${nearestBelow.value} is close to ${threshold}, but at least means the value cannot be below ${threshold}.`,
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "translate-bound",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "Does at least include values equal to the threshold, below it, or above it?",
                },
                {
                  id: "compare-rows",
                  kind: "HINT",
                  content:
                    "Compare all four row values with the threshold one at a time.",
                },
              ],
              reflectionPrompt:
                "How would the qualifying rows change if the condition said greater than instead of at least?",
            },
          },
        };
      },
    },
    {
      key: "math.measurement.elapsed-time-across-hours",
      version: 1,
      targetSkillCode: "MATH.MEASUREMENT",
      questionType: "NUMERIC",
      difficulty: "PROFICIENT",
      structureCapacity: 20,
      generate(random) {
        const context = random.pick(elapsedContexts);
        const frameIndex = random.integer(0, elapsedFrames.length - 1);
        const startHour = random.integer(7, 14);
        const startMinute = random.pick([35, 40, 45, 50] as const);
        const hourPart = random.integer(1, 2);
        const minutePart = random.integer(61 - startMinute, 55);
        const duration = hourPart * 60 + minutePart;
        const startTotal = startHour * 60 + startMinute;
        const endTotal = startTotal + duration;
        const endHour = Math.floor(endTotal / 60);
        const endMinute = endTotal % 60;
        const misleadingFieldDifference =
          (endHour - startHour) * 60 + Math.abs(endMinute - startMinute);
        return {
          structureKey: `${slug(context)}.frame-${frameIndex + 1}`,
          parameters: {
            startHour,
            startMinute,
            endHour,
            endMinute,
            duration,
          },
          candidate: numericCandidate({
            prompt: elapsedFrames[frameIndex](
              context,
              formatClock(startHour, startMinute),
              formatClock(endHour, endMinute),
            ),
            answer: duration,
            verificationSpec: {
              kind: "numeric_result",
              expression: [endTotal, startTotal, "subtract"],
              tolerance: 0,
            },
            learningObjective:
              "Calculate elapsed time across hour boundaries and express the duration in minutes.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The minute values cross an hour boundary, so the learner must regroup or use a timeline before converting the full duration to minutes.",
            estimatedSeconds: 95,
            calculatorPolicy: "ALLOWED",
            explanation: `Convert the times to minutes after midnight: ${formatClock(startHour, startMinute)} is ${startTotal} minutes and ${formatClock(endHour, endMinute)} is ${endTotal} minutes. Subtract: ${endTotal} - ${startTotal} = ${duration} minutes.`,
            misconception: {
              code: "SUBTRACTS_CLOCK_FIELDS_WITHOUT_REGROUPING",
              value: misleadingFieldDifference,
              message:
                "Subtracting the displayed hour and minute fields separately without regrouping double-counts the crossed portion of the hour.",
            },
            tutorQuestion:
              "What intermediate time lets you split the interval into a full hour and a remaining part?",
            tutorHint:
              "Move forward to the same minute in the next hour, then count the remaining minutes.",
            reflection:
              "How could converting both clock times to minutes after midnight verify the duration?",
          }),
        };
      },
    },
    {
      key: "math.ratios.proportion-conversion-order",
      version: 1,
      targetSkillCode: "MATH.RATIOS_PROPORTIONS",
      questionType: "ORDERED_RESPONSE",
      difficulty: "ADVANCED",
      structureCapacity: 20,
      generate(random) {
        const context = random.pick(ratioContexts);
        const frameIndex = random.integer(0, ratioFrames.length - 1);
        const baseCups = random.pick([2, 4, 6, 8] as const);
        const baseItems = random.pick([3, 5, 7, 9] as const);
        const scale = random.integer(2, 4);
        const targetItems = baseItems * scale;
        const targetCups = baseCups * scale;
        const targetPints = targetCups / 2;
        const steps = [
          {
            id: "proportion",
            content: `Set up ${baseCups}/${baseItems} = c/${targetItems}, where c is the required cups.`,
          },
          {
            id: "solve-cups",
            content: `Solve the proportion to obtain c = ${targetCups} cups.`,
          },
          {
            id: "convert-pints",
            content: `Convert: ${targetCups} cups × (1 pint ÷ 2 cups) = ${targetPints} pints.`,
          },
          {
            id: "conclude",
            content: `Conclude that ${targetPints} pints are needed for ${targetItems} ${context.item}.`,
          },
        ];
        return {
          structureKey: `${context.key}.frame-${frameIndex + 1}`,
          parameters: {
            baseCups,
            baseItems,
            scale,
            targetItems,
            targetCups,
            targetPints,
          },
          candidate: orderedCandidate({
            prompt: ratioFrames[frameIndex](
              baseCups,
              baseItems,
              context.material,
              targetItems,
              context.item,
            ),
            shuffledChoices: random.shuffle(steps),
            orderedIds: steps.map((step) => step.id),
            explanation: `First model the constant ratio, then solve for ${targetCups} cups. Convert cups to pints only after finding the scaled amount: ${targetCups} ÷ 2 = ${targetPints} pints.`,
            verificationValues: {
              proportion: 1,
              "solve-cups": 2,
              "convert-pints": 3,
              conclude: 4,
            },
            learningObjective:
              "Sequence a proportional scaling calculation followed by a unit conversion.",
            difficulty: "ADVANCED",
            difficultyRationale:
              "The learner coordinates a proportion, an unknown intermediate quantity, and a second unit conversion in a dependency-sensitive sequence.",
            estimatedSeconds: 125,
            calculatorPolicy: "ALLOWED",
            misconceptionCode: "CONVERTS_BEFORE_SOLVING_PROPORTION",
            reversedPair: {
              earlierItemId: "solve-cups",
              laterItemId: "convert-pints",
            },
            misconceptionMessage:
              "Find the scaled number of cups before converting that result to pints.",
            tutorQuestion:
              "Which unknown quantity must the proportion produce before any unit conversion can happen?",
            tutorHint:
              "Keep the ratio in cups until you solve for the target batch, then divide by 2 cups per pint.",
            reflection:
              "Why does converting only the starting amount fail to finish the scaled problem?",
          }),
        };
      },
    },
    {
      key: "math.fractions.percent-of-whole-choice",
      version: 1,
      targetSkillCode: "MATH.FRACTIONS_DECIMALS_PERCENT",
      questionType: "SINGLE_CHOICE",
      difficulty: "DEVELOPING",
      structureCapacity: 20,
      generate(random) {
        const context = random.pick(percentContexts);
        const frameIndex = random.integer(0, percentFrames.length - 1);
        const amount = random.pick([40, 60, 80, 120, 160, 200] as const);
        const percent = random.pick([10, 15, 20, 25, 30] as const);
        const answer = (amount * percent) / 100;
        const remaining = amount - answer;
        const choices = random.shuffle([
          { id: "correct", content: formatNumber(answer) },
          { id: "remaining", content: formatNumber(remaining) },
          { id: "new-total", content: formatNumber(amount + answer) },
          { id: "raw-percent", content: String(percent) },
        ]);
        return {
          structureKey: `${context.key}.frame-${frameIndex + 1}`,
          parameters: { amount, percent, answer },
          candidate: {
            content: {
              questionType: "SINGLE_CHOICE",
              prompt: percentFrames[frameIndex](percent, amount, context.noun),
              choices,
              answerSpec: { type: "single_choice", choiceId: "correct" },
              explanation: `Convert ${percent}% to ${formatNumber(percent / 100)} and multiply: ${formatNumber(percent / 100)} × ${amount} = ${formatNumber(answer)}.`,
              distractorRationales: {
                remaining:
                  "This is the amount left after removing the requested percentage, not the requested part.",
                "new-total":
                  "This adds the requested part to the whole instead of finding the part alone.",
                "raw-percent":
                  "This treats the percent number as the answer without applying it to the whole.",
              },
            },
            verificationSpec: {
              kind: "numeric_result",
              expression: [amount, percent, "multiply", 100, "divide"],
              tolerance: 0.0001,
            },
            learningObjective:
              "Find a percentage of a whole quantity by converting the rate and multiplying.",
            difficulty: "DEVELOPING",
            difficultyRationale:
              "The learner translates a percent to a decimal and applies it to a whole in one modeled calculation.",
            estimatedSeconds: 70,
            calculatorPolicy: "ALLOWED",
            commonMisconceptions: ["FINDS_PERCENT_REMAINDER"],
            misconceptionRules: [
              {
                id: "selects-remainder",
                kind: "selected_choice",
                code: "FINDS_PERCENT_REMAINDER",
                choiceId: "remaining",
                learnerMessage:
                  "The question asks for the percentage part, not what remains after subtracting it.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "convert-rate",
                  kind: "SOCRATIC_QUESTION",
                  content: `What decimal is equivalent to ${percent}%?`,
                },
                {
                  id: "multiply-whole",
                  kind: "HINT",
                  content:
                    "Multiply the decimal rate by the whole amount; do not subtract unless the problem asks for a remainder.",
                },
              ],
              reflectionPrompt:
                "How can estimating the size of the percentage help reject unreasonable choices?",
            },
          },
        };
      },
    },
    {
      key: "math.geometry.layered-border-with-opening",
      version: 1,
      targetSkillCode: "MATH.GEOMETRY",
      questionType: "SINGLE_CHOICE",
      difficulty: "PROFICIENT",
      structureCapacity: 20,
      generate(random) {
        const context = random.pick(borderContexts);
        const frameIndex = random.integer(0, borderFrames.length - 1);
        const length = random.pick([12, 15, 18, 20, 24] as const);
        const width = random.pick([6, 8, 10, 12] as const);
        const strands = random.pick([2, 3, 4] as const);
        const opening = random.pick([1, 2, 3, 4] as const);
        const perimeter = 2 * length + 2 * width;
        const usablePerimeter = perimeter - opening;
        const answer = strands * usablePerimeter;
        const choices = random.shuffle([
          { id: "correct", content: `${answer} m` },
          { id: "single-perimeter", content: `${perimeter} m` },
          { id: "ignores-opening", content: `${strands * perimeter} m` },
          {
            id: "uses-half-perimeter",
            content: `${strands * (length + width - opening)} m`,
          },
        ]);
        return {
          structureKey: `${context.key}.frame-${frameIndex + 1}`,
          parameters: { length, width, strands, opening, answer },
          candidate: {
            content: {
              questionType: "SINGLE_CHOICE",
              prompt: borderFrames[frameIndex](
                context.noun,
                length,
                width,
                strands,
                opening,
              ),
              choices,
              answerSpec: { type: "single_choice", choiceId: "correct" },
              explanation: `The perimeter is 2(${length}) + 2(${width}) = ${perimeter} m. Remove the ${opening} m opening from each circuit to get ${usablePerimeter} m, then multiply by ${strands}: ${usablePerimeter} × ${strands} = ${answer} m.`,
              distractorRationales: {
                "single-perimeter":
                  "This finds one full perimeter but does not remove the opening or account for every layer.",
                "ignores-opening":
                  "This multiplies the full perimeter by the number of layers but never removes the opening from each one.",
                "uses-half-perimeter":
                  "Length plus width is only half of a rectangle's perimeter.",
              },
            },
            verificationSpec: {
              kind: "numeric_result",
              expression: [
                length,
                2,
                "multiply",
                width,
                2,
                "multiply",
                "add",
                opening,
                "subtract",
                strands,
                "multiply",
              ],
              tolerance: 0,
            },
            learningObjective:
              "Apply rectangle perimeter in a multi-layer context with an omitted opening.",
            difficulty: "PROFICIENT",
            difficultyRationale:
              "The learner must model a perimeter, adjust each circuit for a gap, and scale the usable length across multiple layers.",
            estimatedSeconds: 100,
            calculatorPolicy: "ALLOWED",
            commonMisconceptions: ["IGNORES_REPEATED_OPENING"],
            misconceptionRules: [
              {
                id: "selects-full-layer-total",
                kind: "selected_choice",
                code: "IGNORES_REPEATED_OPENING",
                choiceId: "ignores-opening",
                learnerMessage:
                  "The opening is omitted from every layer, so subtract it before multiplying by the layer count.",
              },
            ],
            tutorGuidance: {
              steps: [
                {
                  id: "usable-circuit",
                  kind: "SOCRATIC_QUESTION",
                  content:
                    "What is one full perimeter, and how much of that single circuit is actually covered?",
                },
                {
                  id: "scale-circuits",
                  kind: "HINT",
                  content:
                    "Subtract the opening from one perimeter, then multiply that usable circuit by the number of layers.",
                },
              ],
              reflectionPrompt:
                "Why does subtracting the opening only once underestimate the total omitted length?",
            },
          },
        };
      },
    },
    {
      key: "math.statistics.median-frequency-table",
      version: 1,
      targetSkillCode: "MATH.PROBABILITY_STATISTICS",
      questionType: "NUMERIC",
      difficulty: "ADVANCED",
      structureCapacity: 20,
      generate(random) {
        const context = random.pick(medianContexts);
        const frameIndex = random.integer(0, medianFrames.length - 1);
        const base = random.integer(4, 20);
        const unit = random.integer(1, 4);
        const values = [0, 2, 5, 9, 14].map((offset) => base + offset * unit);
        const frequencies = random.pick([
          [1, 2, 3, 2, 1],
          [2, 1, 5, 1, 2],
          [1, 3, 2, 1, 2],
          [2, 2, 3, 2, 2],
        ] as const);
        const observations = values.flatMap((value, index) =>
          Array.from({ length: frequencies[index] }, () => value),
        );
        const answer = values[2];
        const unweightedMean =
          values.reduce((sum, value) => sum + value, 0) / values.length;
        return {
          structureKey: `${context.key}.frame-${frameIndex + 1}`,
          parameters: { values, frequencies: [...frequencies], answer },
          candidate: numericCandidate({
            stimulus: tableStimulus(
              context.caption,
              [context.header, "Frequency"],
              values.map((value, index) => [
                String(value),
                String(frequencies[index]),
              ]),
            ),
            prompt: medianFrames[frameIndex](),
            answer,
            verificationSpec: {
              kind: "data_result",
              operation: "median",
              values: observations,
              tolerance: 0,
            },
            learningObjective:
              "Determine a median from a frequency table by locating the middle observation in the expanded distribution.",
            difficulty: "ADVANCED",
            difficultyRationale:
              "The learner must interpret frequencies as repeated observations, count the distribution size, and locate its middle position without confusing rows with data points.",
            estimatedSeconds: 120,
            calculatorPolicy: "ALLOWED",
            explanation: `The frequencies represent ${observations.length} observations, so the median is observation ${Math.floor(observations.length / 2) + 1}. Counting cumulatively through the rows places that observation at ${answer}.`,
            misconception: {
              code: "AVERAGES_DISPLAYED_TABLE_VALUES",
              value: unweightedMean,
              tolerance: 0.01,
              message:
                "Averaging the five displayed values ignores the frequency column and computes a mean, not the median of all observations.",
            },
            tutorQuestion: `How many observations are represented after adding the five frequencies?`,
            tutorHint:
              "Find the middle position from the total frequency, then use cumulative frequencies to identify which value contains that position.",
            reflection:
              "Why can the median be found without writing every repeated observation individually?",
          }),
        };
      },
    },
    {
      key: "math.unit-conversions.metric-process-order",
      version: 1,
      targetSkillCode: "MATH.UNIT_CONVERSIONS",
      questionType: "ORDERED_RESPONSE",
      difficulty: "FOUNDATIONAL",
      structureCapacity: 20,
      generate(random) {
        const context = random.pick(metricContexts);
        const frameIndex = random.integer(0, metricFrames.length - 1);
        const quantity = random.pick([1.2, 1.5, 2.4, 2.75, 3.6, 4.25] as const);
        const centimeters = quantity * 100;
        const steps = [
          {
            id: "identify-factor",
            content: "Identify the conversion 1 meter = 100 centimeters.",
          },
          {
            id: "write-product",
            content: `Write ${quantity} meters × (100 centimeters ÷ 1 meter).`,
          },
          {
            id: "multiply",
            content: `Multiply to obtain ${formatNumber(centimeters)}.`,
          },
          {
            id: "label-result",
            content: `State the result as ${formatNumber(centimeters)} centimeters.`,
          },
        ];
        return {
          structureKey: `${context.key}.frame-${frameIndex + 1}`,
          parameters: { quantity, centimeters },
          candidate: orderedCandidate({
            prompt: metricFrames[frameIndex](quantity, context.noun),
            shuffledChoices: random.shuffle(steps),
            orderedIds: steps.map((step) => step.id),
            explanation: `Because one meter contains 100 centimeters, multiply ${quantity} by 100. The converted length is ${formatNumber(centimeters)} centimeters.`,
            verificationValues: {
              "identify-factor": 1,
              "write-product": 2,
              multiply: 3,
              "label-result": 4,
            },
            learningObjective:
              "Sequence a one-factor metric conversion from meters to centimeters.",
            difficulty: "FOUNDATIONAL",
            difficultyRationale:
              "The conversion factor is provided, and the learner sequences one multiplication and a unit label.",
            estimatedSeconds: 60,
            calculatorPolicy: "NOT_NEEDED",
            misconceptionCode: "MULTIPLIES_BEFORE_SELECTING_CONVERSION",
            reversedPair: {
              earlierItemId: "identify-factor",
              laterItemId: "write-product",
            },
            misconceptionMessage:
              "Identify the relationship between meters and centimeters before writing the multiplication.",
            tutorQuestion:
              "How many centimeters correspond to exactly one meter?",
            tutorHint:
              "Use the stated factor to write a multiplication, calculate, and attach the destination unit.",
            reflection:
              "Why should a meter-to-centimeter conversion produce a larger numerical value?",
          }),
        };
      },
    },
  ];

function numericCandidate(input: {
  stimulus?: QuestionStimulus;
  prompt: string;
  answer: number;
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
        tolerance: 0,
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

function orderedCandidate(input: {
  prompt: string;
  shuffledChoices: { id: string; content: string }[];
  orderedIds: string[];
  explanation: string;
  verificationValues: Record<string, number>;
  learningObjective: string;
  difficulty: GeneratedCandidate["difficulty"];
  difficultyRationale: string;
  estimatedSeconds: number;
  calculatorPolicy: GeneratedCandidate["calculatorPolicy"];
  misconceptionCode: string;
  reversedPair: { earlierItemId: string; laterItemId: string };
  misconceptionMessage: string;
  tutorQuestion: string;
  tutorHint: string;
  reflection: string;
}): GeneratedCandidate {
  return {
    content: {
      questionType: "ORDERED_RESPONSE",
      prompt: input.prompt,
      choices: input.shuffledChoices,
      answerSpec: { type: "ordered_response", itemIds: input.orderedIds },
      explanation: input.explanation,
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "ordered_values",
      values: input.verificationValues,
      direction: "ascending",
    },
    learningObjective: input.learningObjective,
    difficulty: input.difficulty,
    difficultyRationale: input.difficultyRationale,
    estimatedSeconds: input.estimatedSeconds,
    calculatorPolicy: input.calculatorPolicy,
    commonMisconceptions: [input.misconceptionCode],
    misconceptionRules: [
      {
        id: "reverses-dependent-steps",
        kind: "reversed_pair",
        code: input.misconceptionCode,
        ...input.reversedPair,
        learnerMessage: input.misconceptionMessage,
      },
    ],
    tutorGuidance: {
      steps: [
        {
          id: "identify-first-dependency",
          kind: "SOCRATIC_QUESTION",
          content: input.tutorQuestion,
        },
        { id: "follow-dependencies", kind: "HINT", content: input.tutorHint },
      ],
      reflectionPrompt: input.reflection,
    },
  };
}

function tableStimulus(
  caption: string,
  headers: string[],
  rows: string[][],
): QuestionStimulus {
  return { type: "table", caption, columns: headers, rows };
}

function formatClock(hour24: number, minute: number) {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
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
