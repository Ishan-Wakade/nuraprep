import { describe, expect, it } from "vitest";

import { generateDeterministicVariantBatch } from "./deterministic-variants";
import { mathVariantVisualTemplates } from "./math-variant-visual-templates";

describe("Math visual-stimulus templates", () => {
  it("declares bounded bar-graph comparison structures", () => {
    expect(
      mathVariantVisualTemplates.map((template) => ({
        key: template.key,
        questionType: template.questionType,
        difficulty: template.difficulty,
        structureCapacity: template.structureCapacity,
      })),
    ).toEqual([
      {
        key: "math.data-interpretation.bar-graph-comparison",
        questionType: "SINGLE_CHOICE",
        difficulty: "PROFICIENT",
        structureCapacity: 20,
      },
    ]);
  });

  it("generates validated graph data that matches its accessible description", () => {
    const batch = generateDeterministicVariantBatch({
      template: mathVariantVisualTemplates[0]!,
      batchSeed: "visual-template-test",
      requestedCount: mathVariantVisualTemplates[0]!.structureCapacity,
      maxAttemptsPerItem: 100,
    });

    expect(batch.accepted).toHaveLength(20);
    expect(batch.exhaustedSlots).toBe(0);
    for (const item of batch.accepted) {
      const stimulus = item.candidate.content.stimulus;
      expect(stimulus?.type).toBe("graph");
      if (stimulus?.type !== "graph") continue;
      expect(stimulus.data.bars).toHaveLength(4);
      for (const bar of stimulus.data.bars) {
        expect(bar.value).toBeGreaterThan(0);
        expect(stimulus.accessibleDescription).toContain(
          `${bar.label}: ${bar.value}`,
        );
      }
    }
  });
});
