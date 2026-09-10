import { describe, expect, it } from "vitest";

import { stimulusSchema } from "./contracts";

const graph = {
  type: "graph" as const,
  accessibleDescription: "A bar graph compares four categories.",
  data: {
    kind: "bar" as const,
    title: "Visits by day",
    xAxisLabel: "Category",
    yAxisLabel: "Count",
    bars: [
      { label: "A", value: 4 },
      { label: "B", value: 9 },
    ],
  },
};

describe("question stimulus contract", () => {
  it("accepts bounded, structured bar-graph data", () => {
    expect(stimulusSchema.safeParse(graph).success).toBe(true);
  });

  it("rejects duplicate bar labels and unstructured graph payloads", () => {
    expect(
      stimulusSchema.safeParse({
        ...graph,
        data: {
          ...graph.data,
          bars: [
            { label: "Same", value: 4 },
            { label: "same", value: 9 },
          ],
        },
      }).success,
    ).toBe(false);
    expect(
      stimulusSchema.safeParse({
        type: "graph",
        accessibleDescription: "An unspecified graph.",
        data: { arbitrary: true },
      }).success,
    ).toBe(false);
  });
});
