import { randomUUID } from "node:crypto";

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the database smoke test.");
}

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const skillId = randomUUID();
    const questionId = randomUUID();
    const versionId = randomUUID();

    await client.query(
      `INSERT INTO skills
      (id, code, section, title, learning_objective)
     VALUES ($1, $2, 'MATH', $3, $4)`,
      [
        skillId,
        `smoke-${skillId}`,
        "Database smoke-test skill",
        "Verify that the relational content model accepts a valid question version.",
      ],
    );

    await client.query(
      `INSERT INTO questions (id, internal_slug, section, lifecycle)
     VALUES ($1, $2, 'MATH', 'DRAFT')`,
      [questionId, `smoke-${questionId}`],
    );

    await client.query(
      `INSERT INTO question_versions
      (id, question_id, version, question_type, prompt, choices, answer_spec,
       explanation, distractor_rationales, primary_skill_id, learning_objective,
       difficulty, difficulty_rationale, estimated_seconds, calculator_policy,
       common_misconceptions, authoring_mode, author_id, provenance_summary)
     VALUES
      ($1, $2, 1, 'SINGLE_CHOICE', $3, $4::jsonb, $5::jsonb, $6, $7::jsonb,
       $8, $9, 'FOUNDATIONAL', $10, 60, 'NOT_NEEDED', $11::jsonb,
       'HUMAN', 'ci-smoke-test', $12)`,
      [
        versionId,
        questionId,
        "What is 6 × 7?",
        JSON.stringify([
          { id: "a", content: "36" },
          { id: "b", content: "42" },
        ]),
        JSON.stringify({ type: "single_choice", choiceId: "b" }),
        "Six groups of seven contain 42 items.",
        JSON.stringify({ a: "This result comes from multiplying 6 by 6." }),
        skillId,
        "Multiply whole numbers.",
        "Requires one direct whole-number multiplication step.",
        JSON.stringify(["MULTIPLICATION_FACT_ERROR"]),
        "Created solely inside the rolled-back CI smoke-test transaction.",
      ],
    );

    await client.query("SAVEPOINT immutability_check");
    let mutationWasBlocked = false;
    try {
      await client.query(
        "UPDATE question_versions SET prompt = 'mutated' WHERE id = $1",
        [versionId],
      );
    } catch (error) {
      mutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT immutability_check");
    }

    if (!mutationWasBlocked) {
      throw new Error(
        "The question-version append-only trigger did not reject an update.",
      );
    }

    const publicationId = randomUUID();
    await client.query(
      `INSERT INTO question_publications
       (id, question_id, question_version_id, published_by)
       VALUES ($1, $2, $3, 'ci-smoke-test')`,
      [publicationId, questionId, versionId],
    );

    await client.query("SAVEPOINT publication_identity_check");
    let publicationMutationWasBlocked = false;
    try {
      await client.query(
        "UPDATE question_publications SET published_by = 'mutated' WHERE id = $1",
        [publicationId],
      );
    } catch (error) {
      publicationMutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT publication_identity_check");
    }

    if (!publicationMutationWasBlocked) {
      throw new Error(
        "The publication-history trigger allowed immutable attribution to change.",
      );
    }

    await client.query(
      `UPDATE question_publications
       SET retired_at = now(), retired_by = 'ci-smoke-test',
           retirement_reason = 'Verify the controlled retirement path.'
       WHERE id = $1`,
      [publicationId],
    );

    await client.query("SAVEPOINT retired_publication_check");
    let retiredMutationWasBlocked = false;
    try {
      await client.query(
        "UPDATE question_publications SET retirement_reason = 'mutated' WHERE id = $1",
        [publicationId],
      );
    } catch (error) {
      retiredMutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT retired_publication_check");
    }

    if (!retiredMutationWasBlocked) {
      throw new Error(
        "The publication-history trigger allowed a retired record to change.",
      );
    }

    const learnerId = randomUUID();
    const sessionId = randomUUID();
    const sessionItemId = randomUUID();
    const attemptId = randomUUID();
    await client.query(
      `INSERT INTO learner_profiles (id, auth_subject, display_name)
       VALUES ($1, $2, 'CI smoke learner')`,
      [learnerId, `ci-smoke-${learnerId}`],
    );

    const scoreEstimateId = randomUUID();
    const studyPlanId = randomUUID();
    const studyPlanItemId = randomUUID();
    await client.query(
      `INSERT INTO score_estimates
       (id, learner_id, model_version, estimate_basis_points,
        lower_basis_points, upper_basis_points, evidence_level,
        evidence_count, effective_evidence_milli, feature_snapshot, caveats)
       VALUES ($1, $2, 'ci-score-baseline', 6000, 4000, 8000, 'LOW',
               1, 500, $3::jsonb, $4::jsonb)`,
      [
        scoreEstimateId,
        learnerId,
        JSON.stringify({ source: "rolled-back database smoke test" }),
        JSON.stringify(["Not an official ATI score."]),
      ],
    );
    await client.query("SAVEPOINT score_estimate_immutability_check");
    let scoreEstimateMutationWasBlocked = false;
    try {
      await client.query(
        "UPDATE score_estimates SET estimate_basis_points = 7000 WHERE id = $1",
        [scoreEstimateId],
      );
    } catch (error) {
      scoreEstimateMutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query(
        "ROLLBACK TO SAVEPOINT score_estimate_immutability_check",
      );
    }
    if (!scoreEstimateMutationWasBlocked) {
      throw new Error(
        "The score-estimate append-only trigger allowed an update.",
      );
    }
    await client.query(
      `INSERT INTO study_plans
       (id, learner_id, score_estimate_id, model_version, weekly_minutes)
       VALUES ($1, $2, $3, 'ci-study-plan', 180)`,
      [studyPlanId, learnerId, scoreEstimateId],
    );
    await client.query(
      `INSERT INTO study_plan_items
       (id, study_plan_id, skill_id, priority, target_minutes, rationale)
       VALUES ($1, $2, $3, 1, 90, $4)`,
      [
        studyPlanItemId,
        studyPlanId,
        skillId,
        "Exercise the editable study-plan relationship in a rolled-back smoke test.",
      ],
    );
    await client.query(
      `UPDATE study_plan_items
       SET status = 'IN_PROGRESS', target_minutes = 75, updated_at = now()
       WHERE id = $1`,
      [studyPlanItemId],
    );
    await client.query(
      `INSERT INTO practice_sessions
       (id, learner_id, mode, status, timing_mode, requested_question_count, filters)
       VALUES ($1, $2, 'TOPIC_PRACTICE', 'IN_PROGRESS', 'UNTIMED', 1, $3::jsonb)`,
      [
        sessionId,
        learnerId,
        JSON.stringify({
          questionCount: 1,
          timingMode: "UNTIMED",
          newOnly: false,
          missedOnly: false,
        }),
      ],
    );
    await client.query(
      `INSERT INTO practice_session_items
       (id, session_id, question_version_id, position, selection_reason)
       VALUES ($1, $2, $3, 1, 'CI migration smoke test')`,
      [sessionItemId, sessionId, versionId],
    );
    const reviewEventId = randomUUID();
    await client.query(
      `INSERT INTO practice_item_review_events
       (id, session_item_id, flagged, recorded_by)
       VALUES ($1, $2, true, 'ci-smoke-test')`,
      [reviewEventId, sessionItemId],
    );
    await client.query("SAVEPOINT review_event_immutability_check");
    let reviewEventMutationWasBlocked = false;
    try {
      await client.query(
        "UPDATE practice_item_review_events SET flagged = false WHERE id = $1",
        [reviewEventId],
      );
    } catch (error) {
      reviewEventMutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query(
        "ROLLBACK TO SAVEPOINT review_event_immutability_check",
      );
    }
    if (!reviewEventMutationWasBlocked) {
      throw new Error("The review-flag event trigger allowed an update.");
    }

    await client.query(
      `INSERT INTO attempts
       (id, session_item_id, answer_payload, correct, elapsed_milliseconds)
       VALUES ($1, $2, $3::jsonb, true, 1200)`,
      [
        attemptId,
        sessionItemId,
        JSON.stringify({ type: "single_choice", choiceId: "b" }),
      ],
    );

    await client.query("SAVEPOINT attempt_immutability_check");
    let attemptMutationWasBlocked = false;
    try {
      await client.query("UPDATE attempts SET correct = false WHERE id = $1", [
        attemptId,
      ]);
    } catch (error) {
      attemptMutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT attempt_immutability_check");
    }

    if (!attemptMutationWasBlocked) {
      throw new Error("The attempt append-only trigger allowed an update.");
    }

    const tutorInteractionId = randomUUID();
    await client.query(
      `INSERT INTO tutor_interactions
       (id, session_item_id, step_index, step_id)
       VALUES ($1, $2, 1, 'smoke-hint')`,
      [tutorInteractionId, sessionItemId],
    );
    await client.query("SAVEPOINT tutor_interaction_immutability_check");
    let tutorInteractionMutationWasBlocked = false;
    try {
      await client.query(
        "UPDATE tutor_interactions SET step_id = 'mutated' WHERE id = $1",
        [tutorInteractionId],
      );
    } catch (error) {
      tutorInteractionMutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query(
        "ROLLBACK TO SAVEPOINT tutor_interaction_immutability_check",
      );
    }
    if (!tutorInteractionMutationWasBlocked) {
      throw new Error(
        "The tutor-interaction append-only trigger allowed an update.",
      );
    }

    const reportId = randomUUID();
    const reportEventId = randomUUID();
    await client.query(
      `INSERT INTO learner_question_reports
       (id, question_version_id, learner_id, attempt_id, category, details)
       VALUES ($1, $2, $3, $4, 'AMBIGUITY', $5)`,
      [
        reportId,
        versionId,
        learnerId,
        attemptId,
        "The CI smoke test records an exact-version learner report.",
      ],
    );
    await client.query(
      `INSERT INTO learner_question_report_events
       (id, report_id, status, reviewer_id, notes)
       VALUES ($1, $2, 'RESOLVED', 'ci-smoke-test', $3)`,
      [
        reportEventId,
        reportId,
        "The CI reviewer checked this temporary report.",
      ],
    );

    for (const [savepoint, query, id, label] of [
      [
        "learner_report_immutability_check",
        "UPDATE learner_question_reports SET details = 'mutated report' WHERE id = $1",
        reportId,
        "learner report",
      ],
      [
        "learner_report_event_immutability_check",
        "DELETE FROM learner_question_report_events WHERE id = $1",
        reportEventId,
        "learner report event",
      ],
    ] as const) {
      await client.query(`SAVEPOINT ${savepoint}`);
      let mutationBlocked = false;
      try {
        await client.query(query, [id]);
      } catch (error) {
        mutationBlocked =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "55000";
      } finally {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      }

      if (!mutationBlocked) {
        throw new Error(`The ${label} append-only trigger allowed a mutation.`);
      }
    }

    const result = await client.query<{ version_count: number }>(
      `SELECT count(*)::int AS version_count
     FROM question_versions qv
     JOIN questions q ON q.id = qv.question_id
     JOIN skills s ON s.id = qv.primary_skill_id
     WHERE qv.id = $1 AND q.section = s.section`,
      [versionId],
    );

    if (result.rows[0]?.version_count !== 1) {
      throw new Error(
        "The migrated question-version join did not return the expected row.",
      );
    }

    await client.query("ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
