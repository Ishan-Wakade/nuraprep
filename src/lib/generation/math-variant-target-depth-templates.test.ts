import { describe, expect, it } from "vitest";

import { generateDeterministicVariantBatch } from "./deterministic-variants";
import { mathVariantTargetDepthTemplates } from "./math-variant-target-depth-templates";

describe("Math target-depth templates", () => {
  it("adds a balanced final tranche above the 1,000-structure planning target", () => {
    expect(mathVariantTargetDepthTemplates).toHaveLength(8);
    expect(
      mathVariantTargetDepthTemplates.reduce(
        (sum, template) => sum + template.structureCapacity,
        0,
      ),
    ).toBe(160);
    expect(countBy(mathVariantTargetDepthTemplates, "questionType")).toEqual({
      MULTIPLE_SELECT: 2,
      NUMERIC: 2,
      ORDERED_RESPONSE: 2,
      SINGLE_CHOICE: 2,
    });
    expect(countBy(mathVariantTargetDepthTemplates, "difficulty")).toEqual({
      ADVANCED: 2,
      DEVELOPING: 2,
      FOUNDATIONAL: 2,
      PROFICIENT: 2,
    });
  });

  for (const template of mathVariantTargetDepthTemplates) {
    it(`${template.key} reaches all ${template.structureCapacity} declared structures`, () => {
      const batch = generateDeterministicVariantBatch({
        template,
        batchSeed: `full-capacity-${template.key}`,
        requestedCount: template.structureCapacity,
        maxAttemptsPerItem: 100,
      });

      expect(batch.exhaustedSlots).toBe(0);
      expect(batch.accepted).toHaveLength(template.structureCapacity);
      expect(
        new Set(batch.accepted.map((item) => item.structureKey)).size,
      ).toBe(template.structureCapacity);
    });
  }
});

function countBy(
  templates: typeof mathVariantTargetDepthTemplates,
  key: "questionType" | "difficulty",
) {
  return Object.fromEntries(
    [...new Set(templates.map((template) => template[key]))]
      .sort()
      .map((value) => [
        value,
        templates.filter((template) => template[key] === value).length,
      ]),
  );
}
