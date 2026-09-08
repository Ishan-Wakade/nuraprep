import { describe, expect, it } from "vitest";

import {
  DIFFICULTY_RUBRIC_VERSION,
  EXPLANATION_RUBRIC,
  INTERNAL_DIFFICULTY_RUBRIC,
  REVIEW_SCORE_RUBRIC,
} from "./review-rubrics";

describe("review rubrics", () => {
  it("defines every internal difficulty band", () => {
    expect(DIFFICULTY_RUBRIC_VERSION).toBe(2);
    expect(Object.keys(INTERNAL_DIFFICULTY_RUBRIC)).toEqual([
      "FOUNDATIONAL",
      "DEVELOPING",
      "PROFICIENT",
      "ADVANCED",
    ]);
  });

  it("requires explanations to teach rather than only calculate", () => {
    expect(EXPLANATION_RUBRIC).toHaveLength(5);
    expect(EXPLANATION_RUBRIC.join(" ")).toMatch(/underlying idea/i);
    expect(EXPLANATION_RUBRIC.join(" ")).toMatch(/why the setup/i);
  });

  it("makes each review score interpretable", () => {
    expect(Object.keys(REVIEW_SCORE_RUBRIC)).toEqual(["1", "2", "3", "4"]);
  });
});
