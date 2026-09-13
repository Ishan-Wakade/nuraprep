import { describe, expect, it } from "vitest";

import { generateDeterministicVariantBatch } from "./deterministic-variants";
import { mathVariantScaleTemplates } from "./math-variant-scale-templates";

describe("Math scale templates", () => {
  it("adds three bounded depth templates", () => {
    expect(
      mathVariantScaleTemplates.map((template) => ({
        key: template.key,
        skill: template.targetSkillCode,
        type: template.questionType,
        capacity: template.structureCapacity,
      })),
    ).toEqual([
      {
        key: "math.fractions.percent-change-depth-choice",
        skill: "MATH.FRACTIONS_DECIMALS_PERCENT",
        type: "SINGLE_CHOICE",
        capacity: 40,
      },
      {
        key: "math.unit-conversions.mixed-measure-depth-numeric",
        skill: "MATH.UNIT_CONVERSIONS",
        type: "NUMERIC",
        capacity: 40,
      },
      {
        key: "math.inequalities.boundary-depth-choice",
        skill: "MATH.INEQUALITIES",
        type: "SINGLE_CHOICE",
        capacity: 40,
      },
    ]);
  });

  it("produces validator-approved samples from every template", () => {
    for (const template of mathVariantScaleTemplates) {
      const batch = generateDeterministicVariantBatch({
        template,
        batchSeed: `scale-pack-v1:${template.key}`,
        requestedCount: 8,
        maxAttemptsPerItem: 100,
      });
      expect(batch.exhaustedSlots, template.key).toBe(0);
      expect(batch.accepted, template.key).toHaveLength(8);
    }
  });
});
