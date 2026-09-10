import { describe, expect, it } from "vitest";

import { generateDeterministicVariantBatch } from "./deterministic-variants";
import { mathVariantDepthTemplates } from "./math-variant-depth-templates";

describe("Math depth templates", () => {
  it("realizes every declared inequality structure under deterministic checks", () => {
    const template = mathVariantDepthTemplates[0]!;
    const batch = generateDeterministicVariantBatch({
      template,
      batchSeed: "inequality-capacity-test",
      requestedCount: template.structureCapacity,
      maxAttemptsPerItem: 100,
    });

    expect(template).toMatchObject({
      key: "math.inequalities.multiple-select-integer-solutions",
      questionType: "MULTIPLE_SELECT",
      difficulty: "PROFICIENT",
      structureCapacity: 20,
    });
    expect(batch.accepted).toHaveLength(20);
    expect(batch.exhaustedSlots).toBe(0);
    expect(new Set(batch.accepted.map((item) => item.structureKey)).size).toBe(
      20,
    );
  });

  it.each([
    ["math.algebra.distributive-expression-equivalence", "MULTIPLE_SELECT"],
    ["math.word-problems.reverse-percent-change", "SINGLE_CHOICE"],
  ] as const)(
    "realizes all declared structures for %s",
    (templateKey, questionType) => {
      const template = mathVariantDepthTemplates.find(
        (candidate) => candidate.key === templateKey,
      );
      expect(template).toBeDefined();
      const batch = generateDeterministicVariantBatch({
        template: template!,
        batchSeed: `${templateKey}-capacity-test`,
        requestedCount: template!.structureCapacity,
        maxAttemptsPerItem: 100,
      });

      expect(template).toMatchObject({
        key: templateKey,
        questionType,
        difficulty: "PROFICIENT",
        structureCapacity: 20,
      });
      expect(batch.accepted).toHaveLength(20);
      expect(batch.exhaustedSlots).toBe(0);
      expect(
        new Set(batch.accepted.map((item) => item.structureKey)).size,
      ).toBe(20);
    },
  );
});
