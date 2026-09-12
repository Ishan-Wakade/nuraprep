import { reviewedMathBankSnapshotSchema } from "./reviewed-bank-snapshot";

export type PublishedMathAuditRow = {
  questionId: string;
  versionId: string;
  slug: string;
  questionType: string;
  difficulty: string;
  skillCode: string;
  domainCode: string | null;
  skillIsActiveLeaf: boolean;
  publishedBy: string;
  latestDecision: string | null;
  latestDecisionSynthetic: boolean | null;
  decisionNotesLength: number;
  latestAnswerContractOutcome: string | null;
  latestMathOutcome: string | null;
  sourceCount: number;
  sourcePolicyReady: boolean;
};

export type PublishedMathAuditFinding = {
  code: string;
  detail: string;
  versionId?: string;
};

const MINIMUM_FOUNDATION_DOMAIN_COUNTS = {
  "MATH.MEASUREMENT_DATA": 18,
  "MATH.NUMBERS_ALGEBRA": 20,
} as const;

export function auditPublishedMathBank(input: {
  snapshot: unknown;
  rows: PublishedMathAuditRow[];
}) {
  const findings: PublishedMathAuditFinding[] = [];
  const parsedSnapshot = reviewedMathBankSnapshotSchema.safeParse(
    input.snapshot,
  );
  if (!parsedSnapshot.success) {
    findings.push({
      code: "SNAPSHOT_INVALID",
      detail:
        parsedSnapshot.error.issues[0]?.message ??
        "The checked-in reviewed bank snapshot is invalid.",
    });
  }

  if (input.rows.length < 38) {
    findings.push({
      code: "ACTIVE_COUNT_BELOW_FOUNDATION",
      detail: `Expected at least 38 active Math publications, found ${input.rows.length}.`,
    });
  }

  const questionIds = input.rows.map((row) => row.questionId);
  const versionIds = input.rows.map((row) => row.versionId);
  for (const [label, values] of [
    ["question family", questionIds],
    ["question version", versionIds],
  ] as const) {
    if (new Set(values).size !== values.length) {
      findings.push({
        code: "DUPLICATE_PUBLICATION_IDENTITY",
        detail: `The active bank contains a duplicate ${label}.`,
      });
    }
  }

  if (parsedSnapshot.success) {
    const expectedVersionIds = new Set(
      parsedSnapshot.data.questions.map((question) => question.versionId),
    );
    const actualVersionIds = new Set(versionIds);
    const missing = [...expectedVersionIds].filter(
      (versionId) => !actualVersionIds.has(versionId),
    );
    if (missing.length > 0) {
      findings.push({
        code: "SNAPSHOT_FOUNDATION_MISSING",
        detail: `The active database is missing ${missing.length} version(s) from the immutable 38-question reviewed foundation snapshot.`,
      });
    }
  }

  for (const row of input.rows) {
    const versionId = row.versionId;
    if (
      row.slug.startsWith("e2e-") ||
      row.publishedBy === "e2e-fixture-reviewer"
    ) {
      findings.push({
        code: "SYNTHETIC_PUBLICATION_ACTIVE",
        detail: `Synthetic publication ${row.slug} is active.`,
        versionId,
      });
    }
    if (!row.skillIsActiveLeaf || !row.skillCode.startsWith("MATH.")) {
      findings.push({
        code: "INVALID_SKILL_MAPPING",
        detail: `${row.slug} is not mapped to an active Math leaf skill.`,
        versionId,
      });
    }
    if (
      row.latestDecision !== "APPROVED" ||
      row.latestDecisionSynthetic !== false ||
      row.decisionNotesLength < 5
    ) {
      findings.push({
        code: "OWNER_APPROVAL_MISSING",
        detail: `${row.slug} lacks a latest genuine approval with useful notes.`,
        versionId,
      });
    }
    if (row.latestAnswerContractOutcome !== "PASS") {
      findings.push({
        code: "ANSWER_CONTRACT_NOT_PASSING",
        detail: `${row.slug} lacks a latest PASS under the active answer-contract rule.`,
        versionId,
      });
    }
    if (row.latestMathOutcome !== "PASS") {
      findings.push({
        code: "MATH_VALIDATION_NOT_PASSING",
        detail: `${row.slug} lacks a latest PASS under the active mathematical-correctness rule.`,
        versionId,
      });
    }
    if (row.sourceCount < 1 || !row.sourcePolicyReady) {
      findings.push({
        code: "SOURCE_POLICY_NOT_READY",
        detail: `${row.slug} lacks governed public-outline provenance with restrictive retention permissions.`,
        versionId,
      });
    }
  }

  const domainCounts = countBy(input.rows, (row) => row.domainCode ?? "NONE");
  for (const [domainCode, expected] of Object.entries(
    MINIMUM_FOUNDATION_DOMAIN_COUNTS,
  )) {
    const actual = domainCounts[domainCode] ?? 0;
    if (actual < expected) {
      findings.push({
        code: "FOUNDATION_DOMAIN_BELOW_MINIMUM",
        detail: `${domainCode} requires at least ${expected} active families from the reviewed foundation; found ${actual}.`,
      });
    }
  }
  const unexpectedDomains = Object.keys(domainCounts).filter(
    (domainCode) => !(domainCode in MINIMUM_FOUNDATION_DOMAIN_COUNTS),
  );
  if (unexpectedDomains.length > 0) {
    findings.push({
      code: "UNEXPECTED_BLUEPRINT_DOMAIN",
      detail: `The active bank includes unexpected domain mappings: ${unexpectedDomains.join(", ")}.`,
    });
  }

  return {
    passed: findings.length === 0,
    activePublications: input.rows.length,
    snapshotVersions: parsedSnapshot.success
      ? parsedSnapshot.data.questions.length
      : 0,
    counts: {
      byDomain: domainCounts,
      bySkill: countBy(input.rows, (row) => row.skillCode),
      byQuestionType: countBy(input.rows, (row) => row.questionType),
      byDifficulty: countBy(input.rows, (row) => row.difficulty),
    },
    findings,
    caveats: [
      "This audit proves exact local publication identity and machine-checkable release gates; it is not independent educational review.",
      "The 20/18 domain minimum preserves NuraPrep's reviewed foundation blueprint; generated expansion counts are internal and not an official ATI distribution.",
      "Passing source policy proves configured handling restrictions and provenance links, not a legal opinion.",
    ],
  };
}

function countBy(
  rows: PublishedMathAuditRow[],
  selector: (row: PublishedMathAuditRow) => string,
) {
  return Object.fromEntries(
    [...new Set(rows.map(selector))]
      .sort()
      .map((value) => [
        value,
        rows.filter((row) => selector(row) === value).length,
      ]),
  );
}
