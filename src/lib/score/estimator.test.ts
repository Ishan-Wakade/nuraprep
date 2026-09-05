import { describe, expect, it } from "vitest";

import {
  estimateMathReadiness,
  SCORE_MODEL_VERSION,
  type ScoreAttemptEvidence,
} from "./estimator";

const now = new Date("2026-09-05T12:00:00.000Z");
const domains = { "Numbers and Algebra": 18, "Measurement and Data": 16 };

describe("estimateMathReadiness", () => {
  it("returns a wide, explicitly low-evidence prior with no history", () => {
    const result = estimateMathReadiness({
      attempts: [],
      domainDistribution: domains,
      now,
    });

    expect(result.modelVersion).toBe(SCORE_MODEL_VERSION);
    expect(result.estimate).toBeCloseTo(0.5);
    expect(result.evidenceLevel).toBe("LOW");
    expect(result.lowerBound).toBeLessThan(0.25);
    expect(result.upperBound).toBeGreaterThan(0.75);
    expect(result.caveats).toContain(
      "No timed answers are available; current pacing under test conditions is unknown.",
    );
  });

  it("deduplicates question families and preserves timed context", () => {
    const repeatedOld = attempt({
      questionId: "same-family",
      correct: false,
      submittedAt: new Date("2026-09-01T12:00:00.000Z"),
    });
    const repeatedNew = attempt({
      questionId: "same-family",
      correct: true,
      submittedAt: new Date("2026-09-04T12:00:00.000Z"),
    });
    const result = estimateMathReadiness({
      attempts: [repeatedOld, repeatedNew],
      domainDistribution: domains,
      now,
    });

    expect(result.evidenceCount).toBe(1);
    expect(result.features.rawAttemptCount).toBe(2);
    expect(result.features.timed.questionCount).toBe(1);
    expect(result.features.timed.accuracy).toBe(1);
    expect(result.features.timed.withinTargetRate).toBe(1);
  });

  it("weights official domains instead of the learner's sampled proportions", () => {
    const attempts = [
      ...Array.from({ length: 18 }, (_, index) =>
        attempt({
          questionId: `numbers-${index}`,
          correct: true,
          domainTitle: "Numbers and Algebra",
          skillCode: "MATH.ARITHMETIC",
          skillTitle: "Arithmetic",
        }),
      ),
      ...Array.from({ length: 2 }, (_, index) =>
        attempt({
          questionId: `measurement-${index}`,
          correct: false,
          domainTitle: "Measurement and Data",
          skillCode: "MATH.GEOMETRY",
          skillTitle: "Geometry",
        }),
      ),
    ];
    const result = estimateMathReadiness({
      attempts,
      domainDistribution: domains,
      now,
    });
    const naiveSampleAccuracy = 18 / 20;

    expect(result.estimate).toBeLessThan(naiveSampleAccuracy);
    expect(result.features.domains[0]?.blueprintWeight).toBeCloseTo(18 / 34);
    expect(result.studyPlan[0]?.skillCode).toBe("MATH.GEOMETRY");
  });

  it("requires broad completed-test evidence for the substantial label", () => {
    const attempts = Array.from({ length: 34 }, (_, index) =>
      attempt({
        questionId: `full-${index}`,
        correct: index < 27,
        domainTitle:
          index < 18 ? "Numbers and Algebra" : "Measurement and Data",
        skillCode: index < 18 ? "MATH.ARITHMETIC" : "MATH.GEOMETRY",
        skillTitle: index < 18 ? "Arithmetic" : "Geometry",
        sessionQuestionCount: 38,
        sessionAnsweredCount: 38,
      }),
    );
    const result = estimateMathReadiness({
      attempts,
      domainDistribution: domains,
      now,
    });

    expect(result.evidenceLevel).toBe("SUBSTANTIAL");
    expect(result.lowerBound).toBeLessThan(result.estimate);
    expect(result.upperBound).toBeGreaterThan(result.estimate);
  });

  it("does not treat an early-submitted test as substantial evidence", () => {
    const attempts = Array.from({ length: 30 }, (_, index) =>
      attempt({
        questionId: `partial-${index}`,
        sessionAnsweredCount: 20,
        sessionQuestionCount: 38,
      }),
    );
    const result = estimateMathReadiness({
      attempts,
      domainDistribution: domains,
      now,
    });

    expect(result.features.completedPracticeTestCount).toBe(0);
    expect(result.evidenceLevel).toBe("DEVELOPING");
  });

  it("reports timing context without applying an arbitrary timing penalty", () => {
    const timed = estimateMathReadiness({
      attempts: [attempt({ timingMode: "TIMED" })],
      domainDistribution: domains,
      now,
    });
    const untimed = estimateMathReadiness({
      attempts: [attempt({ timingMode: "UNTIMED" })],
      domainDistribution: domains,
      now,
    });

    expect(timed.estimate).toBeCloseTo(untimed.estimate);
    expect(timed.features.timed.questionCount).toBe(1);
    expect(untimed.features.untimed.questionCount).toBe(1);
  });

  it("excludes evidence outside the declared window", () => {
    const result = estimateMathReadiness({
      attempts: [
        attempt({
          submittedAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
      ],
      domainDistribution: domains,
      now,
    });

    expect(result.evidenceCount).toBe(0);
  });
});

function attempt(
  overrides: Partial<ScoreAttemptEvidence> = {},
): ScoreAttemptEvidence {
  return {
    sessionId: "session-1",
    questionId: "question-1",
    domainTitle: "Numbers and Algebra",
    skillCode: "MATH.ARITHMETIC",
    skillTitle: "Arithmetic",
    difficulty: "PROFICIENT",
    correct: true,
    mode: "PRACTICE_TEST",
    timingMode: "TIMED",
    sessionCompleted: true,
    sessionAnsweredCount: 38,
    sessionQuestionCount: 38,
    elapsedMilliseconds: 45_000,
    estimatedSeconds: 60,
    submittedAt: now,
    ...overrides,
  };
}
