import { describe, expect, it } from "vitest";

import {
  buildAdaptiveSkillStates,
  selectAdaptiveQuestions,
  type AdaptiveAttemptEvidence,
  type AdaptiveCandidate,
} from "./adaptive";

const now = new Date("2026-09-05T12:00:00Z");

describe("adaptive practice", () => {
  it("raises priority for a weak prerequisite through graph traversal", () => {
    const attempts: AdaptiveAttemptEvidence[] = [
      attempt({ skillCode: "arithmetic", correct: false }),
      attempt({ skillCode: "ratios", correct: true }),
    ];
    const states = buildAdaptiveSkillStates({
      skillCodes: ["arithmetic", "fractions", "ratios"],
      attempts,
      prerequisites: [
        {
          skillCode: "fractions",
          prerequisiteSkillCode: "arithmetic",
          strength: 3,
        },
        {
          skillCode: "ratios",
          prerequisiteSkillCode: "fractions",
          strength: 2,
        },
      ],
      now,
    });

    expect(states.get("ratios")?.prerequisiteGap).toBeGreaterThan(0);
    expect(states.get("fractions")?.prerequisiteGap).toBeGreaterThan(
      states.get("ratios")?.prerequisiteGap ?? 1,
    );
  });

  it("uses the strongest transitive path when a prerequisite is reachable twice", () => {
    const states = buildAdaptiveSkillStates({
      skillCodes: ["arithmetic", "fractions", "ratios", "word-problems"],
      attempts: [attempt({ skillCode: "arithmetic", correct: false })],
      prerequisites: [
        {
          skillCode: "word-problems",
          prerequisiteSkillCode: "ratios",
          strength: 1,
        },
        {
          skillCode: "word-problems",
          prerequisiteSkillCode: "fractions",
          strength: 3,
        },
        {
          skillCode: "ratios",
          prerequisiteSkillCode: "arithmetic",
          strength: 1,
        },
        {
          skillCode: "fractions",
          prerequisiteSkillCode: "arithmetic",
          strength: 3,
        },
      ],
      now,
    });

    expect(states.get("word-problems")?.prerequisiteGap).toBeCloseTo(
      1 - (states.get("arithmetic")?.mastery ?? 0),
    );
  });

  it("prefers an unseen skill over immediately repeating the latest family", () => {
    const candidates = [
      candidate({
        questionId: "repeated",
        questionVersionId: "version-repeated",
        skillCode: "arithmetic",
      }),
      candidate({
        questionId: "unseen",
        questionVersionId: "version-unseen",
        skillCode: "geometry",
      }),
    ];
    const attempts = [
      attempt({
        questionId: "repeated",
        skillCode: "arithmetic",
        correct: false,
      }),
    ];

    const result = selectAdaptiveQuestions({
      candidates,
      attempts,
      prerequisites: [],
      count: 1,
      now,
    });

    expect(result.selected[0]?.questionId).toBe("unseen");
    expect(result.selected[0]?.selectionReason).toContain(
      "recent repeat -0.00",
    );
  });

  it("blocks a difficulty jump of more than one band", () => {
    const candidates = [
      candidate({
        questionId: "advanced",
        questionVersionId: "version-advanced",
        skillCode: "algebra",
        difficulty: "ADVANCED",
      }),
      candidate({
        questionId: "developing",
        questionVersionId: "version-developing",
        skillCode: "algebra",
        difficulty: "DEVELOPING",
      }),
    ];
    const attempts = [
      attempt({
        skillCode: "algebra",
        difficulty: "FOUNDATIONAL",
        correct: true,
      }),
    ];

    const result = selectAdaptiveQuestions({
      candidates,
      attempts,
      prerequisites: [],
      count: 2,
      now,
    });

    expect(result.selected.map((item) => item.questionId)).toEqual([
      "developing",
    ]);
  });

  it("limits one skill from consuming an entire multi-question session", () => {
    const candidates = [
      candidate({ questionId: "a1", questionVersionId: "a1" }),
      candidate({ questionId: "a2", questionVersionId: "a2" }),
      candidate({ questionId: "a3", questionVersionId: "a3" }),
      candidate({
        questionId: "g1",
        questionVersionId: "g1",
        skillCode: "geometry",
      }),
    ];

    const result = selectAdaptiveQuestions({
      candidates,
      attempts: [],
      prerequisites: [],
      count: 3,
      now,
    });

    expect(
      result.selected.filter((item) => item.skillCode === "arithmetic"),
    ).toHaveLength(2);
    expect(result.selected.some((item) => item.skillCode === "geometry")).toBe(
      true,
    );
  });
});

function attempt(
  overrides: Partial<AdaptiveAttemptEvidence> = {},
): AdaptiveAttemptEvidence {
  return {
    questionId: "question-history",
    skillCode: "arithmetic",
    questionType: "SINGLE_CHOICE",
    difficulty: "FOUNDATIONAL",
    correct: true,
    confidence: 3,
    misconceptionCount: 0,
    submittedAt: new Date("2026-09-05T11:00:00Z"),
    ...overrides,
  };
}

function candidate(
  overrides: Partial<AdaptiveCandidate> = {},
): AdaptiveCandidate {
  return {
    questionId: "question-candidate",
    questionVersionId: "version-candidate",
    skillCode: "arithmetic",
    skillTitle: "Arithmetic",
    questionType: "SINGLE_CHOICE",
    difficulty: "FOUNDATIONAL",
    estimatedSeconds: 60,
    ...overrides,
  };
}
