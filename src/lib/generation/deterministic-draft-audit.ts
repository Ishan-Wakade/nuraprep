import { generatedCandidateSchema } from "./contracts";
import {
  findInternalSimilaritySignals,
  type OriginalityDocument,
  type SimilaritySignal,
} from "@/lib/questions/originality";
import {
  validateMathVerification,
  validateMisconceptionRules,
  validateQuestionContent,
} from "@/lib/questions/validation";

export type DeterministicDraftAuditRecord = {
  versionId: string;
  templateKey: string;
  templateVersion: number;
  templateQuestionType: string;
  templateDifficulty: string;
  skillCode: string;
  candidate: unknown;
  sourceCount: number;
  activePublicationCount: number;
  answerContractOutcome: string | null;
  mathOutcome: string | null;
  latestDecision: string;
};

export type DeterministicDraftAuditFinding = {
  versionId: string;
  code: string;
  severity: "error" | "warning";
  detail: string;
};

export function auditDeterministicDrafts(input: {
  records: readonly DeterministicDraftAuditRecord[];
  currentMathCorpus: readonly OriginalityDocument[];
}) {
  const findings: DeterministicDraftAuditFinding[] = [];
  const validDocuments: OriginalityDocument[] = [];
  const counts = {
    byQuestionType: {} as Record<string, number>,
    byDifficulty: {} as Record<string, number>,
    bySkill: {} as Record<string, number>,
    byDecision: {} as Record<string, number>,
    byTemplate: {} as Record<string, number>,
    withTutorGuidance: 0,
  };

  for (const record of input.records) {
    increment(counts.bySkill, record.skillCode);
    increment(counts.byDecision, record.latestDecision);
    increment(
      counts.byTemplate,
      `${record.templateKey}@${record.templateVersion}`,
    );

    if (record.sourceCount < 1) {
      findings.push(
        error(record, "PROVENANCE_MISSING", "No source record is linked."),
      );
    }
    if (record.activePublicationCount > 0) {
      findings.push(
        error(
          record,
          "DRAFT_PUBLISHED",
          "A deterministic audit candidate has an active learner publication.",
        ),
      );
    }
    if (record.answerContractOutcome !== "PASS") {
      findings.push(
        error(
          record,
          "STORED_ANSWER_CHECK_NOT_PASSING",
          `Latest stored answer-contract outcome is ${record.answerContractOutcome ?? "missing"}.`,
        ),
      );
    }
    if (record.mathOutcome !== "PASS") {
      findings.push(
        error(
          record,
          "STORED_MATH_CHECK_NOT_PASSING",
          `Latest stored mathematical-correctness outcome is ${record.mathOutcome ?? "missing"}.`,
        ),
      );
    }

    const parsed = generatedCandidateSchema.safeParse(record.candidate);
    if (!parsed.success) {
      findings.push(
        error(
          record,
          "CANDIDATE_SCHEMA_INVALID",
          parsed.error.issues[0]?.message ?? "Candidate schema is invalid.",
        ),
      );
      continue;
    }
    const candidate = parsed.data;
    increment(counts.byQuestionType, candidate.content.questionType);
    increment(counts.byDifficulty, candidate.difficulty);
    if (candidate.tutorGuidance) counts.withTutorGuidance += 1;

    if (
      candidate.content.questionType !== record.templateQuestionType ||
      candidate.difficulty !== record.templateDifficulty
    ) {
      findings.push(
        error(
          record,
          "TEMPLATE_CONTRACT_MISMATCH",
          "Persisted question type or difficulty differs from its template contract.",
        ),
      );
    }

    const content = validateQuestionContent(candidate.content);
    if (!content.valid) {
      findings.push(
        error(
          record,
          "CONTENT_INVALID",
          content.issues[0]?.message ?? "Content validation failed.",
        ),
      );
      continue;
    }
    const math = validateMathVerification(
      content.content,
      candidate.verificationSpec,
    );
    if (!math.valid) {
      findings.push(error(record, "MATH_INVALID", math.failureCode));
    }
    for (const issue of validateMisconceptionRules(
      content.content,
      candidate.commonMisconceptions,
      candidate.misconceptionRules,
    )) {
      findings.push({
        versionId: record.versionId,
        code: issue.code,
        severity: issue.severity,
        detail: issue.message,
      });
    }
    validDocuments.push({
      id: record.versionId,
      prompt: content.content.prompt,
      choices: content.content.choices,
    });
  }

  const similarityPairs = collectSimilarityPairs(
    validDocuments,
    input.currentMathCorpus,
  );
  for (const pair of similarityPairs.filter((item) => item.signal.blocking)) {
    findings.push({
      versionId: pair.draftVersionId,
      code: `ORIGINALITY_${pair.signal.reason ?? "BLOCK"}`,
      severity: "error",
      detail: `Blocking internal similarity with ${pair.signal.comparedWithId}.`,
    });
  }

  const errorCount = findings.filter(
    (finding) => finding.severity === "error",
  ).length;
  return {
    passed: errorCount === 0,
    machineOnly: true,
    auditedDrafts: input.records.length,
    validCandidateSchemas: validDocuments.length,
    templateVersions: Object.keys(counts.byTemplate).length,
    counts,
    similarity: {
      blockingPairs: similarityPairs.filter((item) => item.signal.blocking)
        .length,
      nearOverlapPairs: similarityPairs.filter((item) => !item.signal.blocking)
        .length,
      signals: similarityPairs.slice(0, 20),
    },
    findings: {
      errors: errorCount,
      warnings: findings.length - errorCount,
      items: findings,
    },
    caveats: [
      "This report recomputes machine-checkable contracts and internal similarity only; it creates no review decision or validator evidence.",
      "It does not establish TEAS alignment, educational quality, accessibility in context, difficulty calibration, or legal originality.",
      "Human decisions remain exact-version judgments and never approve sibling variants automatically.",
    ],
  };
}

function collectSimilarityPairs(
  drafts: readonly OriginalityDocument[],
  corpus: readonly OriginalityDocument[],
) {
  const pairs = new Map<
    string,
    {
      draftVersionId: string;
      signal: SimilaritySignal;
    }
  >();
  for (const draft of drafts) {
    const signals = findInternalSimilaritySignals(
      draft,
      corpus.filter((candidate) => candidate.id !== draft.id),
    );
    for (const signal of signals) {
      const identity = [draft.id, signal.comparedWithId].sort().join(":");
      const current = pairs.get(identity);
      if (
        !current ||
        Number(signal.blocking) > Number(current.signal.blocking) ||
        signal.fiveGramContainment > current.signal.fiveGramContainment
      ) {
        pairs.set(identity, { draftVersionId: draft.id, signal });
      }
    }
  }
  return [...pairs.values()].sort(
    (left, right) =>
      Number(right.signal.blocking) - Number(left.signal.blocking) ||
      right.signal.fiveGramContainment - left.signal.fiveGramContainment,
  );
}

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function error(
  record: DeterministicDraftAuditRecord,
  code: string,
  detail: string,
): DeterministicDraftAuditFinding {
  return { versionId: record.versionId, code, severity: "error", detail };
}
