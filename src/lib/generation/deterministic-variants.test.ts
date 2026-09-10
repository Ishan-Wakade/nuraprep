import { describe, expect, it } from "vitest";

import {
  createSeededRandom,
  generateDeterministicVariantBatch,
  type DeterministicVariantTemplate,
  type SeededRandom,
} from "./deterministic-variants";
import type { GeneratedCandidate } from "./contracts";

const frames = [
  {
    key: "supply-cartons",
    prompt: (groups: number, size: number) =>
      `A volunteer team organizes ${groups} cartons. Each carton holds ${size} notebooks. How many notebooks are organized altogether?`,
  },
  {
    key: "training-rows",
    prompt: (groups: number, size: number) =>
      `Chairs are set in ${groups} equal rows for a training session, with ${size} chairs in every row. Find the total number of chairs.`,
  },
  {
    key: "clinic-drawers",
    prompt: (groups: number, size: number) =>
      `A clinic stocks ${size} sealed masks in each of ${groups} supply drawers. What is the combined mask count?`,
  },
] as const;

const multiplicationTemplate: DeterministicVariantTemplate = {
  key: "math.arithmetic.equal-groups",
  version: 1,
  targetSkillCode: "MATH.ARITHMETIC",
  questionType: "NUMERIC",
  difficulty: "FOUNDATIONAL",
  structureCapacity: frames.length,
  generate(random) {
    const frame = random.pick(frames);
    const groups = random.integer(6, 24);
    const size = random.integer(4, 18);
    const total = groups * size;
    return {
      structureKey: frame.key,
      parameters: { groups, size, total },
      candidate: multiplicationCandidate(frame.prompt(groups, size), {
        groups,
        size,
        total,
      }),
    };
  },
};

describe("deterministic variant batches", () => {
  it("reproduces the same candidates and provenance from the same seed", () => {
    const first = generateDeterministicVariantBatch({
      template: multiplicationTemplate,
      batchSeed: "reviewed-batch-001",
      requestedCount: 3,
      maxAttemptsPerItem: 30,
    });
    const second = generateDeterministicVariantBatch({
      template: multiplicationTemplate,
      batchSeed: "reviewed-batch-001",
      requestedCount: 3,
      maxAttemptsPerItem: 30,
    });

    expect(first).toEqual(second);
    expect(first.accepted).toHaveLength(3);
    expect(new Set(first.accepted.map((item) => item.structureKey)).size).toBe(
      3,
    );
    expect(first.accepted[0]?.provenance).toMatchObject({
      method: "DETERMINISTIC_TEMPLATE",
      sourceQuestionTextProvided: false,
    });
  });

  it("rejects number-only variations even when a template mislabels their structure", () => {
    let call = 0;
    const unsafeTemplate: DeterministicVariantTemplate = {
      ...multiplicationTemplate,
      key: "math.arithmetic.unsafe-number-swaps",
      generate() {
        call += 1;
        const groups = 10 + call;
        const size = 4 + call;
        return {
          structureKey: `incorrectly-distinct-${call}`,
          parameters: { groups, size },
          candidate: multiplicationCandidate(
            `A clinic packs ${groups} kits with ${size} bandages in each kit. How many bandages are packed?`,
            { groups, size, total: groups * size },
          ),
        };
      },
    };

    const batch = generateDeterministicVariantBatch({
      template: unsafeTemplate,
      batchSeed: "unsafe-batch",
      requestedCount: 2,
      maxAttemptsPerItem: 3,
    });

    expect(batch.accepted).toHaveLength(1);
    expect(batch.exhaustedSlots).toBe(1);
    expect(batch.rejectionCounts.CONTENT_DUPLICATE).toBe(3);
  });

  it("rejects a structure key after its first accepted use", () => {
    const oneStructure: DeterministicVariantTemplate = {
      ...multiplicationTemplate,
      key: "math.arithmetic.one-structure",
      generate(random) {
        const groups = random.integer(6, 24);
        const size = random.integer(4, 18);
        return {
          structureKey: "one-frame",
          parameters: { groups, size },
          candidate: multiplicationCandidate(
            `A store displays ${groups} shelves. Each shelf holds ${size} bottles. How many bottles are displayed?`,
            { groups, size, total: groups * size },
          ),
        };
      },
    };

    const batch = generateDeterministicVariantBatch({
      template: oneStructure,
      batchSeed: "one-structure-batch",
      requestedCount: 2,
      maxAttemptsPerItem: 4,
    });

    expect(batch.accepted).toHaveLength(1);
    expect(batch.exhaustedSlots).toBe(1);
    expect(batch.rejectionCounts.STRUCTURE_REUSED).toBe(4);
  });

  it("rejects a mathematically inconsistent answer before acceptance", () => {
    const incorrectTemplate: DeterministicVariantTemplate = {
      ...multiplicationTemplate,
      key: "math.arithmetic.incorrect-key",
      generate(random) {
        const draft = multiplicationTemplate.generate(random);
        if (draft.candidate.content.answerSpec.type !== "numeric") {
          throw new Error("Unexpected fixture answer type.");
        }
        draft.candidate.content.answerSpec.value += 1;
        return draft;
      },
    };

    const batch = generateDeterministicVariantBatch({
      template: incorrectTemplate,
      batchSeed: "bad-math",
      requestedCount: 1,
      maxAttemptsPerItem: 2,
    });

    expect(batch.accepted).toEqual([]);
    expect(batch.rejectionCounts.CANDIDATE_MATH_INVALID).toBe(2);
  });

  it("checks candidates against the existing bank corpus", () => {
    const duplicatePrompt = frames[0].prompt(12, 8);
    const fixedTemplate: DeterministicVariantTemplate = {
      ...multiplicationTemplate,
      key: "math.arithmetic.existing-duplicate",
      generate() {
        return {
          structureKey: "new-label-does-not-bypass-originality",
          parameters: { groups: 12, size: 8 },
          candidate: multiplicationCandidate(duplicatePrompt, {
            groups: 12,
            size: 8,
            total: 96,
          }),
        };
      },
    };

    const batch = generateDeterministicVariantBatch({
      template: fixedTemplate,
      batchSeed: "existing-corpus",
      requestedCount: 1,
      maxAttemptsPerItem: 1,
      corpus: [{ id: "published-family", prompt: duplicatePrompt }],
    });

    expect(batch.accepted).toEqual([]);
    expect(batch.rejected[0]).toMatchObject({
      reason: "CONTENT_DUPLICATE",
      detail: "EXACT_TEXT against published-family.",
    });
  });

  it("refuses requests larger than the declared structural capacity", () => {
    expect(() =>
      generateDeterministicVariantBatch({
        template: multiplicationTemplate,
        batchSeed: "over-capacity",
        requestedCount: frames.length + 1,
      }),
    ).toThrow("declares only 3 distinct structures");
  });
});

describe("seeded random", () => {
  it("provides stable choices, integers, and shuffles", () => {
    const draw = (random: SeededRandom) => ({
      integer: random.integer(10, 99),
      pick: random.pick(["a", "b", "c"]),
      shuffle: random.shuffle([1, 2, 3, 4]),
      next: random.next(),
    });

    expect(draw(createSeededRandom("stable-seed"))).toEqual(
      draw(createSeededRandom("stable-seed")),
    );
    expect(() => createSeededRandom("x").pick([])).toThrow(
      "Cannot choose from an empty collection.",
    );
  });
});

function multiplicationCandidate(
  prompt: string,
  values: { groups: number; size: number; total: number },
): GeneratedCandidate {
  return {
    content: {
      questionType: "NUMERIC",
      prompt,
      answerSpec: {
        type: "numeric",
        value: values.total,
        tolerance: 0,
        toleranceMode: "absolute",
        acceptedUnits: [],
        unitRequired: false,
      },
      explanation: `${values.groups} equal groups of ${values.size} give ${values.groups} × ${values.size} = ${values.total}.`,
      distractorRationales: {},
    },
    verificationSpec: {
      kind: "numeric_result",
      expression: [values.groups, values.size, "multiply"],
      tolerance: 0,
    },
    learningObjective:
      "Multiply whole numbers to determine a total across equal groups.",
    difficulty: "FOUNDATIONAL",
    difficultyRationale:
      "The context identifies equal groups and requires one multiplication step.",
    estimatedSeconds: 55,
    calculatorPolicy: "NOT_NEEDED",
    commonMisconceptions: [],
    misconceptionRules: [],
    tutorGuidance: {
      steps: [
        {
          id: "identify-equal-groups",
          kind: "SOCRATIC_QUESTION",
          content:
            "Which operation combines the same quantity across several equal groups?",
        },
      ],
      reflectionPrompt:
        "How would the total change if one additional equal group were included?",
    },
  };
}
