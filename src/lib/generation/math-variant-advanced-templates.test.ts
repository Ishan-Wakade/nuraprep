import { describe, expect, it } from "vitest";

import { mathVariantAdvancedTemplates } from "./math-variant-advanced-templates";
import { generateDeterministicVariantBatch } from "./deterministic-variants";

describe("advanced Math variant templates", () => {
  it.each([
    ["math.arithmetic.grouped-order-of-operations", "SINGLE_CHOICE"],
    ["math.ratios.proportional-table-missing-value", "NUMERIC"],
    ["math.geometry.composite-rectangle-area", "SINGLE_CHOICE"],
    ["math.unit-conversions.order-mixed-lengths", "ORDERED_RESPONSE"],
  ] as const)(
    "realizes every declared structure for %s",
    (templateKey, questionType) => {
      const template = mathVariantAdvancedTemplates.find(
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
