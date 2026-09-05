import { describe, expect, it } from "vitest";

import {
  allocateUnscoredQuestions,
  assemblePracticeTest,
  type PracticeTestCandidate,
  type PracticeTestSpecification,
} from "./practice-test";

const specification: PracticeTestSpecification = {
  totalQuestions: 38,
  scoredQuestions: 34,
  unscoredQuestions: 4,
  durationMinutes: 57,
  domainDistribution: {
    "Numbers and Algebra": 18,
    "Measurement and Data": 16,
  },
};

describe("practice-test assembly", () => {
  it("allocates unscored slots proportionally and transparently", () => {
    expect(allocateUnscoredQuestions(specification)).toEqual({
      "Numbers and Algebra": 20,
      "Measurement and Data": 18,
    });
  });

  it("assembles the full blueprint without repeated families", () => {
    const candidates = [
      ...candidateSeries("Numbers and Algebra", 22),
      ...candidateSeries("Measurement and Data", 20, 100),
    ];
    candidates.push({
      ...candidates[0],
      questionVersionId: "version-duplicate-family",
    });

    const first = assemblePracticeTest({
      specification,
      candidates,
      seed: "session-seed",
    });
    const second = assemblePracticeTest({
      specification,
      candidates,
      seed: "session-seed",
    });

    expect(first.ready).toBe(true);
    expect(first.selections).toHaveLength(38);
    expect(new Set(first.selections.map((item) => item.questionId)).size).toBe(
      38,
    );
    expect(
      first.selections.filter(
        (item) => item.domainTitle === "Numbers and Algebra",
      ),
    ).toHaveLength(20);
    expect(
      first.selections.filter(
        (item) => item.domainTitle === "Measurement and Data",
      ),
    ).toHaveLength(18);
    expect(first.selections.map((item) => item.questionVersionId)).toEqual(
      second.selections.map((item) => item.questionVersionId),
    );
    expect(first.selections[0]?.selectionReason).toContain("math-blueprint-v1");
  });

  it("reports domain deficits instead of silently changing the blueprint", () => {
    const result = assemblePracticeTest({
      specification,
      candidates: [
        ...candidateSeries("Numbers and Algebra", 20),
        ...candidateSeries("Measurement and Data", 17, 100),
      ],
      seed: "not-ready",
    });

    expect(result.ready).toBe(false);
    expect(result.selections).toEqual([]);
    expect(
      result.readiness.find(
        (domain) => domain.domainTitle === "Measurement and Data",
      ),
    ).toMatchObject({ required: 18, available: 17, deficit: 1 });
  });

  it("rejects inconsistent versioned specifications", () => {
    expect(() =>
      allocateUnscoredQuestions({ ...specification, scoredQuestions: 33 }),
    ).toThrow("specification counts are inconsistent");
  });
});

function candidateSeries(
  domainTitle: string,
  count: number,
  offset = 0,
): PracticeTestCandidate[] {
  const difficulties = [
    "FOUNDATIONAL",
    "DEVELOPING",
    "PROFICIENT",
    "ADVANCED",
  ] as const;
  const questionTypes = [
    "SINGLE_CHOICE",
    "MULTIPLE_SELECT",
    "NUMERIC",
    "ORDERED_RESPONSE",
  ] as const;

  return Array.from({ length: count }, (_, index) => {
    const id = index + offset;
    return {
      questionId: `question-${id}`,
      questionVersionId: `version-${id}`,
      domainTitle,
      difficulty: difficulties[index % difficulties.length],
      questionType: questionTypes[index % questionTypes.length],
    };
  });
}
