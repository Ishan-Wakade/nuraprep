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
});
