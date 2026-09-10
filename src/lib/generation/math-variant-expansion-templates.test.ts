import { describe, expect, it } from "vitest";

import { mathVariantExpansionTemplates } from "./math-variant-expansion-templates";

describe("Math variant expansion templates", () => {
  it("adds eight bounded reasoning families across three response formats", () => {
    expect(
      mathVariantExpansionTemplates.map((template) => ({
        key: template.key,
        questionType: template.questionType,
        structureCapacity: template.structureCapacity,
      })),
    ).toEqual([
      {
        key: "math.geometry.triangle-area-choice",
        questionType: "SINGLE_CHOICE",
        structureCapacity: 20,
      },
      {
        key: "math.measurement.missing-rectangle-dimension-choice",
        questionType: "SINGLE_CHOICE",
        structureCapacity: 20,
      },
      {
        key: "math.ratios.multiple-select-equivalence",
        questionType: "MULTIPLE_SELECT",
        structureCapacity: 20,
      },
      {
        key: "math.fractions.order-mixed-representations",
        questionType: "ORDERED_RESPONSE",
        structureCapacity: 20,
      },
      {
        key: "math.arithmetic.signed-change-choice",
        questionType: "SINGLE_CHOICE",
        structureCapacity: 20,
      },
      {
        key: "math.linear-equations.plan-break-even-choice",
        questionType: "SINGLE_CHOICE",
        structureCapacity: 20,
      },
      {
        key: "math.unit-conversions.multiple-select-equivalence",
        questionType: "MULTIPLE_SELECT",
        structureCapacity: 20,
      },
      {
        key: "math.probability.order-event-likelihood",
        questionType: "ORDERED_RESPONSE",
        structureCapacity: 20,
      },
    ]);
  });
});
