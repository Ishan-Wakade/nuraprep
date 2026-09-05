import { describe, expect, it } from "vitest";

import { summarizeDiagnostic } from "./diagnostic";

describe("summarizeDiagnostic", () => {
  it("prioritizes a missed skill ahead of correct answers", () => {
    const result = summarizeDiagnostic([
      {
        skillCode: "math.geometry",
        skillTitle: "Geometry",
        answered: 1,
        correct: 1,
        averageConfidence: 5,
        elapsedMilliseconds: 20_000,
      },
      {
        skillCode: "math.arithmetic",
        skillTitle: "Arithmetic",
        answered: 1,
        correct: 0,
        averageConfidence: 4,
        elapsedMilliseconds: 35_000,
      },
    ]);

    expect(result.startingPoint).toMatchObject({
      skillCode: "math.arithmetic",
      signal: "START_HERE",
    });
    expect(result.signals.map((signal) => signal.signal)).toEqual([
      "START_HERE",
      "BUILD_ON",
    ]);
  });

  it("flags a correct low-confidence answer for reinforcement", () => {
    const result = summarizeDiagnostic([
      {
        skillCode: "math.ratios",
        skillTitle: "Ratios and proportions",
        answered: 1,
        correct: 1,
        averageConfidence: 2,
        elapsedMilliseconds: 70_000,
      },
    ]);

    expect(result.startingPoint?.signal).toBe("REINFORCE");
  });

  it("keeps unanswered skills explicitly incomplete", () => {
    const result = summarizeDiagnostic([
      {
        skillCode: "math.data",
        skillTitle: "Data interpretation",
        answered: 0,
        correct: 0,
        averageConfidence: null,
        elapsedMilliseconds: 0,
      },
    ]);

    expect(result.completedSkillCount).toBe(0);
    expect(result.signals[0]?.signal).toBe("INCOMPLETE");
  });

  it("uses the least fluent encouraging signal when no weakness appears", () => {
    const result = summarizeDiagnostic([
      {
        skillCode: "math.geometry",
        skillTitle: "Geometry",
        answered: 1,
        correct: 1,
        averageConfidence: 5,
        elapsedMilliseconds: 20_000,
      },
      {
        skillCode: "math.data",
        skillTitle: "Data interpretation",
        answered: 1,
        correct: 1,
        averageConfidence: 3,
        elapsedMilliseconds: 40_000,
      },
    ]);

    expect(result.startingPoint).toMatchObject({
      skillCode: "math.data",
      signal: "BUILD_ON",
    });
    expect(result.startingPoint?.explanation).toContain(
      "No sampled weakness stood out",
    );
  });
});
