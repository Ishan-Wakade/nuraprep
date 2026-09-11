import { describe, expect, it } from "vitest";

import { generateDeterministicVariantBatch } from "./deterministic-variants";
import { mathVariantCalibrationTemplates } from "./math-variant-calibration-templates";

describe("Math calibration variant templates", () => {
  it("adds bounded Foundational and Advanced coverage", () => {
    expect(mathVariantCalibrationTemplates).toHaveLength(4);
    expect(
      new Set(mathVariantCalibrationTemplates.map((item) => item.difficulty)),
    ).toEqual(new Set(["FOUNDATIONAL", "ADVANCED"]));
    expect(
      mathVariantCalibrationTemplates.reduce(
        (sum, template) => sum + template.structureCapacity,
        0,
      ),
    ).toBe(80);
  });

  for (const template of mathVariantCalibrationTemplates) {
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
      expect(
        batch.accepted.every((item) =>
          item.similaritySignals.every((signal) => !signal.blocking),
        ),
      ).toBe(true);
    });
  }
});
