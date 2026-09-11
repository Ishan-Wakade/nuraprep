import { config } from "dotenv";
import { Pool } from "pg";

import { auditDeterministicDrafts } from "@/lib/generation/deterministic-draft-audit";
import type { OriginalityDocument } from "@/lib/questions/originality";

config({ path: ".env.local", quiet: true });

type AuditRow = {
  version_id: string;
  template_key: string;
  template_version: number;
  template_question_type: string;
  template_difficulty: string;
  skill_code: string;
  question_type: string;
  prompt: string;
  stimulus: unknown;
  choices: unknown;
  answer_spec: unknown;
  explanation: string;
  distractor_rationales: unknown;
  verification_spec: unknown;
  learning_objective: string;
  difficulty: string;
  difficulty_rationale: string;
  estimated_seconds: number;
  calculator_policy: string;
  common_misconceptions: unknown;
  misconception_rules: unknown;
  tutor_guidance: unknown;
  source_count: number;
  active_publication_count: number;
  answer_contract_outcome: string | null;
  math_outcome: string | null;
  latest_decision: string;
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const [draftResult, corpusResult] = await Promise.all([
      pool.query<AuditRow>(auditQuery),
      pool.query<{
        id: string;
        prompt: string;
        stimulus: OriginalityDocument["stimulus"];
        choices: { content: string }[] | null;
      }>(corpusQuery),
    ]);
    const report = auditDeterministicDrafts({
      records: draftResult.rows.map((row) => ({
        versionId: row.version_id,
        templateKey: row.template_key,
        templateVersion: row.template_version,
        templateQuestionType: row.template_question_type,
        templateDifficulty: row.template_difficulty,
        skillCode: row.skill_code,
        candidate: {
          content: {
            questionType: row.question_type,
            prompt: row.prompt,
            ...(row.stimulus ? { stimulus: row.stimulus } : {}),
            ...(row.choices ? { choices: row.choices } : {}),
            answerSpec: row.answer_spec,
            explanation: row.explanation,
            distractorRationales: row.distractor_rationales,
          },
          verificationSpec: row.verification_spec,
          learningObjective: row.learning_objective,
          difficulty: row.difficulty,
          difficultyRationale: row.difficulty_rationale,
          estimatedSeconds: row.estimated_seconds,
          calculatorPolicy: row.calculator_policy,
          commonMisconceptions: row.common_misconceptions,
          misconceptionRules: row.misconception_rules,
          tutorGuidance: row.tutor_guidance,
        },
        sourceCount: row.source_count,
        activePublicationCount: row.active_publication_count,
        answerContractOutcome: row.answer_contract_outcome,
        mathOutcome: row.math_outcome,
        latestDecision: row.latest_decision,
      })),
      currentMathCorpus: corpusResult.rows,
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.passed) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

const auditQuery = `
  SELECT version.id AS version_id,
         template.template_key,
         template.version AS template_version,
         template.question_type::text AS template_question_type,
         template.difficulty::text AS template_difficulty,
         skill.code AS skill_code,
         version.question_type::text AS question_type,
         version.prompt,
         version.stimulus,
         version.choices,
         version.answer_spec,
         version.explanation,
         version.distractor_rationales,
         version.verification_spec,
         version.learning_objective,
         version.difficulty::text AS difficulty,
         version.difficulty_rationale,
         version.estimated_seconds,
         version.calculator_policy::text AS calculator_policy,
         version.common_misconceptions,
         version.misconception_rules,
         version.tutor_guidance,
         (SELECT count(*)::int FROM question_version_sources source
           WHERE source.question_version_id = version.id) AS source_count,
         (SELECT count(*)::int FROM question_publications publication
           WHERE publication.question_version_id = version.id
             AND publication.retired_at IS NULL) AS active_publication_count,
         (SELECT run.outcome::text
            FROM validation_runs run
            INNER JOIN validator_rules rule ON rule.id = run.validator_rule_id
           WHERE run.question_version_id = version.id
             AND rule.key = 'answer-contract'
             AND rule.active = true
           ORDER BY run.executed_at DESC, run.id DESC LIMIT 1) AS answer_contract_outcome,
         (SELECT run.outcome::text
            FROM validation_runs run
            INNER JOIN validator_rules rule ON rule.id = run.validator_rule_id
           WHERE run.question_version_id = version.id
             AND rule.key = 'mathematical-correctness'
             AND rule.active = true
           ORDER BY run.executed_at DESC, run.id DESC LIMIT 1) AS math_outcome,
         coalesce((SELECT decision.decision::text
            FROM review_decisions decision
           WHERE decision.question_version_id = version.id
             AND decision.synthetic = false
           ORDER BY decision.decided_at DESC, decision.id DESC LIMIT 1),
           'UNREVIEWED') AS latest_decision
    FROM question_versions version
    INNER JOIN questions question ON question.id = version.question_id
    INNER JOIN skills skill ON skill.id = version.primary_skill_id
    INNER JOIN generation_runs generation ON generation.id = version.generation_run_id
    INNER JOIN generation_templates template ON template.id = generation.template_id
   WHERE question.section = 'MATH'
     AND question.lifecycle = 'DRAFT'
     AND question.internal_slug NOT LIKE 'e2e-%'
     AND generation.provider = 'NuraPrep'
     AND generation.model LIKE 'deterministic/%'
     AND version.version = (
       SELECT max(latest.version) FROM question_versions latest
        WHERE latest.question_id = version.question_id
     )
   ORDER BY template.template_key, template.version, generation.prompt_hash`;

const corpusQuery = `
  SELECT version.id, version.prompt, version.stimulus, version.choices
    FROM question_versions version
    INNER JOIN questions question ON question.id = version.question_id
   WHERE question.section = 'MATH'
     AND question.internal_slug NOT LIKE 'e2e-%'
     AND version.version = (
       SELECT max(latest.version) FROM question_versions latest
        WHERE latest.question_id = version.question_id
     )
   ORDER BY question.internal_slug`;

void main();
