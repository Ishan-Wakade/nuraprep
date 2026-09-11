import { config } from "dotenv";
import { Pool } from "pg";

import reviewedMathBank from "@/content/reviewed-math-bank.json";
import {
  auditPublishedMathBank,
  type PublishedMathAuditRow,
} from "@/lib/questions/published-bank-audit";

config({ path: ".env.local", quiet: true });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const result = await pool.query<PublishedMathAuditRow>(auditQuery);
    const report = auditPublishedMathBank({
      snapshot: reviewedMathBank,
      rows: result.rows,
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.passed) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

const auditQuery = `
  SELECT question.id AS "questionId",
         version.id AS "versionId",
         question.internal_slug AS slug,
         version.question_type::text AS "questionType",
         version.difficulty::text AS difficulty,
         skill.code AS "skillCode",
         domain.code AS "domainCode",
         (skill.active = true AND NOT EXISTS (
           SELECT 1 FROM skills child
            WHERE child.parent_skill_id = skill.id AND child.active = true
         )) AS "skillIsActiveLeaf",
         publication.published_by AS "publishedBy",
         decision.decision::text AS "latestDecision",
         decision.synthetic AS "latestDecisionSynthetic",
         coalesce(length(trim(decision.notes)), 0)::int AS "decisionNotesLength",
         answer_run.outcome::text AS "latestAnswerContractOutcome",
         math_run.outcome::text AS "latestMathOutcome",
         source_state.source_count::int AS "sourceCount",
         coalesce(source_state.policy_ready, false) AS "sourcePolicyReady"
    FROM question_publications publication
    INNER JOIN questions question ON question.id = publication.question_id
    INNER JOIN question_versions version ON version.id = publication.question_version_id
    INNER JOIN skills skill ON skill.id = version.primary_skill_id
    LEFT JOIN skills domain ON domain.id = skill.parent_skill_id
    LEFT JOIN LATERAL (
      SELECT review.decision, review.synthetic, review.notes
        FROM review_decisions review
       WHERE review.question_version_id = version.id
       ORDER BY review.decided_at DESC, review.id DESC
       LIMIT 1
    ) decision ON true
    LEFT JOIN LATERAL (
      SELECT run.outcome
        FROM validation_runs run
        INNER JOIN validator_rules rule ON rule.id = run.validator_rule_id
       WHERE run.question_version_id = version.id
         AND run.synthetic = false
         AND rule.key = 'answer-contract'
         AND rule.active = true
       ORDER BY run.executed_at DESC, run.id DESC
       LIMIT 1
    ) answer_run ON true
    LEFT JOIN LATERAL (
      SELECT run.outcome
        FROM validation_runs run
        INNER JOIN validator_rules rule ON rule.id = run.validator_rule_id
       WHERE run.question_version_id = version.id
         AND run.synthetic = false
         AND rule.key = 'mathematical-correctness'
         AND rule.active = true
       ORDER BY run.executed_at DESC, run.id DESC
       LIMIT 1
    ) math_run ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS source_count,
             bool_and(
               link.relationship = 'SPECIFICATION'
               AND source.canonical_url = 'https://www.atitesting.com/docs/default-source/teas-resources/ati_teas7_content_outline.pdf'
               AND source.access_class = 'PUBLIC'
               AND source.decision = 'COVERAGE_ANALYSIS'
               AND source.allow_metadata = true
               AND source.allow_coverage_analysis = true
               AND source.allow_quotation = false
               AND source.allow_storage = false
               AND source.allow_model_input = false
               AND source.object_storage_key IS NULL
               AND source.takedown_status = 'NONE'
             ) AS policy_ready
        FROM question_version_sources link
        INNER JOIN source_artifacts source ON source.id = link.source_artifact_id
       WHERE link.question_version_id = version.id
    ) source_state ON true
   WHERE publication.retired_at IS NULL
     AND question.section = 'MATH'
   ORDER BY question.internal_slug`;

void main();
