import { describe, expect, it } from "vitest";

import reviewedMathBank from "@/content/reviewed-math-bank.json";

import {
  auditPublishedMathBank,
  type PublishedMathAuditRow,
} from "./published-bank-audit";

describe("published Math bank audit", () => {
  it("accepts the exact snapshot identities when every release gate passes", () => {
    const report = auditPublishedMathBank({
      snapshot: reviewedMathBank,
      rows: passingRows(),
    });

    expect(report.passed).toBe(true);
    expect(report.activePublications).toBe(38);
    expect(report.counts.byDomain).toEqual({
      "MATH.MEASUREMENT_DATA": 18,
      "MATH.NUMBERS_ALGEBRA": 20,
    });
    expect(report.findings).toEqual([]);
  });

  it("fails closed when the database drifts or any exact-version gate fails", () => {
    const rows = passingRows();
    rows[0] = {
      ...rows[0],
      versionId: "00000000-0000-4000-8000-000000000000",
      latestMathOutcome: "FAIL",
      sourcePolicyReady: false,
    };

    const report = auditPublishedMathBank({
      snapshot: reviewedMathBank,
      rows,
    });

    expect(report.passed).toBe(false);
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "SNAPSHOT_DATABASE_DRIFT",
        "MATH_VALIDATION_NOT_PASSING",
        "SOURCE_POLICY_NOT_READY",
      ]),
    );
  });
});

function passingRows(): PublishedMathAuditRow[] {
  return reviewedMathBank.questions.map((question, index) => ({
    questionId: question.questionId,
    versionId: question.versionId,
    slug: question.slug,
    questionType: question.content.questionType,
    difficulty: question.difficulty,
    skillCode: question.skillCode,
    domainCode: index < 20 ? "MATH.NUMBERS_ALGEBRA" : "MATH.MEASUREMENT_DATA",
    skillIsActiveLeaf: true,
    publishedBy: question.ownerDecision.reviewerId,
    latestDecision: "APPROVED",
    latestDecisionSynthetic: false,
    decisionNotesLength: question.ownerDecision.notes.length,
    latestAnswerContractOutcome: "PASS",
    latestMathOutcome: "PASS",
    sourceCount: question.sources.length,
    sourcePolicyReady: true,
  }));
}
