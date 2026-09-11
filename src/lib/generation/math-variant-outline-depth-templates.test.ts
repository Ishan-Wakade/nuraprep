import { describe, expect, it } from "vitest";

import { generateDeterministicVariantBatch } from "./deterministic-variants";
import { mathVariantOutlineDepthTemplates } from "./math-variant-outline-depth-templates";

describe("Math public-outline depth templates", () => {
  it("adds bounded estimation, table, relationship, and geometry depth", () => {
    expect(mathVariantOutlineDepthTemplates).toHaveLength(4);
    expect(
      mathVariantOutlineDepthTemplates.reduce(
        (sum, template) => sum + template.structureCapacity,
        0,
      ),
    ).toBe(80);
    expect(
      new Set(
        mathVariantOutlineDepthTemplates.map((template) =>
          template.key.split(".").slice(0, 2).join("."),
        ),
      ),
    ).toEqual(
      new Set(["math.arithmetic", "math.data-interpretation", "math.geometry"]),
    );
  });

  for (const template of mathVariantOutlineDepthTemplates) {
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
