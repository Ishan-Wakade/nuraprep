import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });

void main();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const questions = await pool.query<ReviewedQuestionRow>(
      `SELECT question.id AS question_id,
              question.internal_slug,
              version.id AS version_id,
              version.version,
              version.question_type,
              version.prompt,
              version.stimulus,
              version.choices,
              version.answer_spec,
              version.explanation,
              version.distractor_rationales,
              version.verification_spec,
              skill.code AS skill_code,
              version.learning_objective,
              version.difficulty,
              version.difficulty_rationale,
              version.estimated_seconds,
              version.calculator_policy,
              version.common_misconceptions,
              version.misconception_rules,
              version.tutor_guidance,
              version.provenance_summary,
              decision.reviewer_id,
              decision.rubric_scores,
              decision.notes AS decision_notes,
              decision.decided_at
         FROM question_publications AS publication
         INNER JOIN questions AS question ON question.id = publication.question_id
         INNER JOIN question_versions AS version
           ON version.id = publication.question_version_id
         INNER JOIN skills AS skill ON skill.id = version.primary_skill_id
         INNER JOIN LATERAL (
           SELECT review.reviewer_id, review.rubric_scores, review.notes,
                  review.decided_at, review.decision
             FROM review_decisions AS review
            WHERE review.question_version_id = version.id
              AND review.synthetic = false
            ORDER BY review.decided_at DESC, review.id DESC
            LIMIT 1
         ) AS decision ON true
        WHERE publication.retired_at IS NULL
          AND question.section = 'MATH'
          AND question.internal_slug NOT LIKE 'e2e-%'
          AND decision.decision = 'APPROVED'
        ORDER BY question.internal_slug`,
    );
    if (questions.rows.length !== 38) {
      throw new Error(
        `Expected exactly 38 active owner-approved Math families, found ${questions.rows.length}.`,
      );
    }
    const versionIds = questions.rows.map((question) => question.version_id);
    const sources = await pool.query<SourceRow>(
      `SELECT link.question_version_id, source.canonical_url,
              link.relationship, link.transformation_notes
         FROM question_version_sources AS link
         INNER JOIN source_artifacts AS source ON source.id = link.source_artifact_id
        WHERE link.question_version_id = ANY($1::uuid[])
        ORDER BY link.question_version_id, source.canonical_url`,
      [versionIds],
    );
    const sourcesByVersion = Map.groupBy(
      sources.rows,
      (source) => source.question_version_id,
    );
    const snapshot = {
      schemaVersion: "reviewed-math-bank-v1",
      reviewCompletedAt: questions.rows
        .map((question) => question.decided_at)
        .sort()
        .at(-1),
      scope:
        "Exact learner content and latest genuine owner decision for the 38-family local Math MVP bank. Operational history remains in the database backup.",
      questions: questions.rows.map((question) => ({
        questionId: question.question_id,
        versionId: question.version_id,
        originalVersionNumber: question.version,
        slug: question.internal_slug,
        skillCode: question.skill_code,
        content: {
          questionType: question.question_type,
          prompt: question.prompt,
          ...(question.stimulus ? { stimulus: question.stimulus } : {}),
          ...(question.choices ? { choices: question.choices } : {}),
          answerSpec: question.answer_spec,
          explanation: question.explanation,
          distractorRationales: question.distractor_rationales,
        },
        verificationSpec: question.verification_spec,
        learningObjective: question.learning_objective,
        difficulty: question.difficulty,
        difficultyRationale: question.difficulty_rationale,
        estimatedSeconds: question.estimated_seconds,
        calculatorPolicy: question.calculator_policy,
        commonMisconceptions: question.common_misconceptions,
        misconceptionRules: question.misconception_rules,
        tutorGuidance: question.tutor_guidance,
        provenanceSummary: question.provenance_summary,
        sources: (sourcesByVersion.get(question.version_id) ?? []).map(
          (source) => ({
            canonicalUrl: source.canonical_url,
            relationship: source.relationship,
            transformationNotes: source.transformation_notes,
          }),
        ),
        ownerDecision: {
          reviewerId: question.reviewer_id,
          decision: "APPROVED",
          rubricScores: question.rubric_scores,
          notes: question.decision_notes,
          decidedAt: question.decided_at,
        },
      })),
    };
    process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
  } finally {
    await pool.end();
  }
}

type ReviewedQuestionRow = {
  question_id: string;
  internal_slug: string;
  version_id: string;
  version: number;
  question_type: string;
  prompt: string;
  stimulus: unknown;
  choices: unknown;
  answer_spec: unknown;
  explanation: string;
  distractor_rationales: unknown;
  verification_spec: unknown;
  skill_code: string;
  learning_objective: string;
  difficulty: string;
  difficulty_rationale: string;
  estimated_seconds: number;
  calculator_policy: string;
  common_misconceptions: unknown;
  misconception_rules: unknown;
  tutor_guidance: unknown;
  provenance_summary: string;
  reviewer_id: string;
  rubric_scores: unknown;
  decision_notes: string;
  decided_at: string;
};

type SourceRow = {
  question_version_id: string;
  canonical_url: string;
  relationship: string;
  transformation_notes: string;
};
