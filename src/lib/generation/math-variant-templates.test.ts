import { describe, expect, it } from "vitest";

import { generateDeterministicVariantBatch } from "./deterministic-variants";
import {
  getMathDeterministicVariantTemplate,
  mathDeterministicVariantTemplates,
} from "./math-variant-templates";

describe("Math deterministic variant templates", () => {
  it.each(mathDeterministicVariantTemplates)(
    "$key produces a diverse, fully validated pilot batch",
    (template) => {
      const batch = generateDeterministicVariantBatch({
        template,
        batchSeed: `pilot-${template.key}`,
        requestedCount: 8,
        maxAttemptsPerItem: 100,
      });

      expect(batch.accepted).toHaveLength(8);
      expect(batch.exhaustedSlots).toBe(0);
      expect(
        new Set(batch.accepted.map((item) => item.structureKey)).size,
      ).toBe(8);
      expect(
        batch.accepted.every(
          (item) =>
            item.candidate.content.questionType === template.questionType &&
            item.candidate.difficulty === template.difficulty,
        ),
      ).toBe(true);
    },
  );

  it("looks up only registered Math templates", () => {
    expect(
      getMathDeterministicVariantTemplate("math.ratios.constant-rate")?.key,
    ).toBe("math.ratios.constant-rate");
    expect(getMathDeterministicVariantTemplate("missing")).toBeUndefined();
  });
});
