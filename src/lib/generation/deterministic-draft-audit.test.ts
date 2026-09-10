import { describe, expect, it } from "vitest";

import {
  auditDeterministicDrafts,
  type DeterministicDraftAuditRecord,
} from "./deterministic-draft-audit";
import { generateDeterministicVariantBatch } from "./deterministic-variants";
import { mathDeterministicVariantTemplates } from "./math-variant-templates";

const template = mathDeterministicVariantTemplates[0]!;
const candidate = generateDeterministicVariantBatch({
  template,
  batchSeed: "audit-unit-fixture",
  requestedCount: 1,
}).accepted[0]!.candidate;

describe("deterministic draft audit", () => {
  it("recomputes a valid persisted candidate without creating human evidence", () => {
    const record = validRecord();
    const report = auditDeterministicDrafts({
      records: [record],
      currentMathCorpus: [documentFor(record)],
    });

    expect(report.passed).toBe(true);
    expect(report.machineOnly).toBe(true);
    expect(report.auditedDrafts).toBe(1);
    expect(report.findings.errors).toBe(0);
    expect(
      report.counts.byTemplate[`${template.key}@${template.version}`],
    ).toBe(1);
  });

  it("fails closed when persistence evidence or candidate contracts drift", () => {
    const record = {
      ...validRecord(),
      sourceCount: 0,
      activePublicationCount: 1,
      answerContractOutcome: null,
      mathOutcome: "FAIL",
      templateQuestionType: "ORDERED_RESPONSE",
    };
    const report = auditDeterministicDrafts({
      records: [record],
      currentMathCorpus: [documentFor(record)],
    });

    expect(report.passed).toBe(false);
    expect(report.findings.items.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PROVENANCE_MISSING",
        "DRAFT_PUBLISHED",
        "STORED_ANSWER_CHECK_NOT_PASSING",
        "STORED_MATH_CHECK_NOT_PASSING",
        "TEMPLATE_CONTRACT_MISMATCH",
      ]),
    );
  });

  it("reports an exact match against another current Math version", () => {
    const record = validRecord();
    const duplicate = { ...documentFor(record), id: "published-duplicate" };
    const report = auditDeterministicDrafts({
      records: [record],
      currentMathCorpus: [documentFor(record), duplicate],
    });

    expect(report.passed).toBe(false);
    expect(report.similarity.blockingPairs).toBe(1);
    expect(report.findings.items[0]?.code).toBe("ORIGINALITY_EXACT_TEXT");
  });
});

function validRecord(): DeterministicDraftAuditRecord {
  return {
    versionId: "draft-version",
    templateKey: template.key,
    templateVersion: template.version,
    templateQuestionType: template.questionType,
    templateDifficulty: template.difficulty,
    skillCode: template.targetSkillCode,
    candidate,
    sourceCount: 1,
    activePublicationCount: 0,
    answerContractOutcome: "PASS",
    mathOutcome: "PASS",
    latestDecision: "UNREVIEWED",
  };
}

function documentFor(record: DeterministicDraftAuditRecord) {
  const parsed = candidate.content;
  return {
    id: record.versionId,
    prompt: parsed.prompt,
    choices: parsed.choices,
  };
}
