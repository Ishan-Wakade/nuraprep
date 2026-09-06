import { randomUUID } from "node:crypto";

import { config } from "dotenv";
import { Pool } from "pg";

import { MAX_GENERATION_ATTEMPTS } from "../src/lib/generation/retry-policy";

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

    await client.query("SAVEPOINT source_permission_check");
    let sourcePermissionWasBlocked = false;
    try {
      await client.query(
        `INSERT INTO source_artifacts
         (canonical_url, publisher, title, artifact_type, accessed_at,
          access_class, decision, allow_metadata, allow_model_input,
          decision_rationale, reviewed_by)
         VALUES ($1, 'CI publisher', 'CI metadata source', 'WEB_PAGE', now(),
                 'PUBLIC', 'METADATA_ONLY', true, true, $2, 'ci-smoke-test')`,
        [
          `https://example.invalid/${randomUUID()}`,
          "This invalid record must not grant model-input rights from a metadata-only decision.",
        ],
      );
    } catch (error) {
      sourcePermissionWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23514";
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT source_permission_check");
    }
    if (!sourcePermissionWasBlocked) {
      throw new Error(
        "The source policy allowed metadata-only material into model input.",
      );
    }

    const sourceArtifactId = randomUUID();
    const sourcePolicyReviewId = randomUUID();
    await client.query(
      `INSERT INTO source_artifacts
       (id, canonical_url, publisher, title, artifact_type, accessed_at,
        access_class, decision, allow_metadata, decision_rationale,
        reviewed_by, recheck_at)
       VALUES ($1, $2, 'CI publisher', 'CI governed source', 'WEB_PAGE', now(),
               'PUBLIC', 'METADATA_ONLY', true, $3, 'ci-smoke-test',
               now() + interval '90 days')`,
      [
        sourceArtifactId,
        `https://example.invalid/governed-${sourceArtifactId}`,
        "The smoke test retains metadata only and grants no content reuse rights.",
      ],
    );
    await client.query(
      `INSERT INTO source_policy_reviews
       (id, source_artifact_id, review_kind, resulting_policy, reviewed_by)
       VALUES ($1, $2, 'INITIAL', $3::jsonb, 'ci-smoke-test')`,
      [
        sourcePolicyReviewId,
        sourceArtifactId,
        JSON.stringify({
          accessClass: "PUBLIC",
          decision: "METADATA_ONLY",
          allowMetadata: true,
          allowCoverageAnalysis: false,
          allowQuotation: false,
          allowStorage: false,
          allowModelInput: false,
          decisionRationale:
            "The smoke test retains metadata only and grants no content reuse rights.",
          recheckAt: null,
        }),
      ],
    );
    await client.query("SAVEPOINT source_review_history_check");
    let sourceReviewMutationWasBlocked = false;
    try {
      await client.query(
        `UPDATE source_policy_reviews
         SET reviewed_by = 'mutated'
         WHERE id = $1`,
        [sourcePolicyReviewId],
      );
    } catch (error) {
      sourceReviewMutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT source_review_history_check");
    }
    if (!sourceReviewMutationWasBlocked) {
      throw new Error(
        "The source-policy review audit allowed an in-place mutation.",
      );
    }

    const validatorKey = `ci-validator-${randomUUID()}`;
    const validatorRule = await client.query<{
      id: string;
      version: number;
    }>(
      `INSERT INTO validator_rules
       (key, version, description, blocks_publication, active,
        change_notes, created_by)
       VALUES ($1, 1, $2, true, true, $3, 'ci-smoke-test')
       RETURNING id, version`,
      [
        validatorKey,
        "CI verifies that active validator content cannot be mutated in place.",
        "Temporary smoke-test rule created to verify lifecycle constraints independently.",
      ],
    );
    const activeValidator = validatorRule.rows[0];
    if (!activeValidator) {
      throw new Error("The smoke-test validator rule was not created.");
    }
    await client.query("SAVEPOINT validator_content_guard_check");
    let validatorContentMutationWasBlocked = false;
    try {
      await client.query(
        "UPDATE validator_rules SET description = 'mutated' WHERE id = $1",
        [activeValidator.id],
      );
    } catch (error) {
      validatorContentMutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT validator_content_guard_check");
    }
    if (!validatorContentMutationWasBlocked) {
      throw new Error("An active validator rule allowed content mutation.");
    }
    const replacementValidatorId = randomUUID();
    await client.query(
      `UPDATE validator_rules
       SET active = false, retired_at = now(), retired_by = 'ci-smoke-test'
       WHERE id = $1`,
      [activeValidator.id],
    );
    await client.query(
      `INSERT INTO validator_rules
       (id, key, version, description, blocks_publication, active,
        change_notes, created_by)
       VALUES ($1, $2, $3, $4, true, true, $5, 'ci-smoke-test')`,
      [
        replacementValidatorId,
        validatorKey,
        activeValidator.version + 1,
        "CI verifies that versioned reviewer accessibility evidence can be activated safely.",
        "Temporary smoke-test revision verifies retirement and uniqueness constraints.",
      ],
    );
    await client.query("SAVEPOINT retired_validator_guard_check");
    let retiredValidatorMutationWasBlocked = false;
    try {
      await client.query(
        "UPDATE validator_rules SET retired_by = 'mutated' WHERE id = $1",
        [activeValidator.id],
      );
    } catch (error) {
      retiredValidatorMutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT retired_validator_guard_check");
    }
    if (!retiredValidatorMutationWasBlocked) {
      throw new Error("A retired validator rule allowed mutation.");
    }

    const generationTemplateId = randomUUID();
    const generationRunId = randomUUID();
    const generationClaimToken = randomUUID();
    const exhaustedGenerationRunId = randomUUID();
    const exhaustedGenerationClaimToken = randomUUID();
    const cancelledGenerationRunId = randomUUID();
    const generatedVersionId = randomUUID();
    await client.query(
      `INSERT INTO generation_templates
       (id, template_key, version, status, target_skill_id, question_type,
        difficulty, instructions, parameter_constraints, prohibited_patterns,
        validator_contract, authored_by, approved_by, approval_notes, approved_at)
       VALUES ($1, $2, 1, 'APPROVED', $3, 'SINGLE_CHOICE', 'FOUNDATIONAL',
               $4, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, 'ci-smoke-test',
               'ci-smoke-test', $5, now())`,
      [
        generationTemplateId,
        `ci-template-${generationTemplateId}`,
        skillId,
        "Generate an original development candidate without source-question text.",
        "The smoke test records approval evidence for this temporary template.",
      ],
    );
    await client.query("SAVEPOINT generation_template_history_check");
    let generationTemplateMutationWasBlocked = false;
    try {
      await client.query(
        "UPDATE generation_templates SET instructions = 'mutated' WHERE id = $1",
        [generationTemplateId],
      );
    } catch (error) {
      generationTemplateMutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query(
        "ROLLBACK TO SAVEPOINT generation_template_history_check",
      );
    }
    if (!generationTemplateMutationWasBlocked) {
      throw new Error(
        "The approved generation template allowed a content mutation.",
      );
    }
    await client.query(
      `INSERT INTO generation_runs
       (id, idempotency_key, template_id, source_question_version_id,
        request_kind, requested_by, provider, model, prompt_hash, parameters,
        request_payload, status, max_cost_micros)
       VALUES ($1, $2, $3, $4, 'FULL_REVISION', 'ci-smoke-test',
               'CI_PROVIDER', 'ci-model', $5, $6::jsonb, $7::jsonb,
               'PENDING', 1000)`,
      [
        generationRunId,
        `ci-generation-${generationRunId}`,
        generationTemplateId,
        versionId,
        "ci-prompt-hash",
        JSON.stringify({ sourceQuestionTextProvided: false }),
        JSON.stringify({ sourceQuestionTextProvided: false }),
      ],
    );
    await client.query("SAVEPOINT generation_claim_required_check");
    let unclaimedCompletionWasBlocked = false;
    try {
      await client.query(
        `UPDATE generation_runs
         SET status = 'FAILED', failure_code = 'UNCLAIMED_EXECUTION',
             completed_at = now()
         WHERE id = $1`,
        [generationRunId],
      );
    } catch (error) {
      unclaimedCompletionWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query(
        "ROLLBACK TO SAVEPOINT generation_claim_required_check",
      );
    }
    if (!unclaimedCompletionWasBlocked) {
      throw new Error("An unclaimed generation run reached execution.");
    }
    await client.query(
      `UPDATE generation_runs
       SET status = 'RUNNING', claim_token = $2, claimed_by = 'ci-smoke-worker',
           lease_expires_at = now() + interval '5 minutes',
           last_heartbeat_at = now(), attempt_count = 1
       WHERE id = $1`,
      [generationRunId, generationClaimToken],
    );
    await client.query("SAVEPOINT active_generation_lease_check");
    let activeLeaseStealWasBlocked = false;
    try {
      await client.query(
        `UPDATE generation_runs
         SET claim_token = $2, claimed_by = 'ci-competing-worker',
             lease_expires_at = now() + interval '5 minutes',
             last_heartbeat_at = now(), attempt_count = 2
         WHERE id = $1`,
        [generationRunId, randomUUID()],
      );
    } catch (error) {
      activeLeaseStealWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT active_generation_lease_check");
    }
    if (!activeLeaseStealWasBlocked) {
      throw new Error(
        "An active generation lease was stolen by another worker.",
      );
    }
    await client.query(
      `UPDATE generation_runs
       SET lease_expires_at = now() + interval '6 minutes',
           last_heartbeat_at = now()
       WHERE id = $1 AND claim_token = $2`,
      [generationRunId, generationClaimToken],
    );
    await client.query(
      `INSERT INTO question_versions
       (id, question_id, version, question_type, prompt, choices, answer_spec,
        explanation, distractor_rationales, primary_skill_id, learning_objective,
        difficulty, difficulty_rationale, estimated_seconds, calculator_policy,
        common_misconceptions, authoring_mode, generation_run_id,
        provenance_summary)
       SELECT $1, question_id, 2, question_type, prompt, choices, answer_spec,
              explanation, distractor_rationales, primary_skill_id,
              learning_objective, difficulty, difficulty_rationale,
              estimated_seconds, calculator_policy, common_misconceptions,
              'GENERATED', $2, $3
       FROM question_versions WHERE id = $4`,
      [
        generatedVersionId,
        generationRunId,
        "Generated only to exercise the rolled-back generation-run boundary.",
        versionId,
      ],
    );
    await client.query("SAVEPOINT generation_candidate_uniqueness_check");
    let duplicateCandidateWasBlocked = false;
    try {
      await client.query(
        `INSERT INTO question_versions
         (id, question_id, version, question_type, prompt, choices, answer_spec,
          explanation, distractor_rationales, primary_skill_id,
          learning_objective, difficulty, difficulty_rationale,
          estimated_seconds, calculator_policy, common_misconceptions,
          authoring_mode, generation_run_id, provenance_summary)
         SELECT $1, question_id, 3, question_type, prompt, choices, answer_spec,
                explanation, distractor_rationales, primary_skill_id,
                learning_objective, difficulty, difficulty_rationale,
                estimated_seconds, calculator_policy, common_misconceptions,
                'GENERATED', $2, $3
         FROM question_versions WHERE id = $4`,
        [
          randomUUID(),
          generationRunId,
          "A duplicate candidate for one run must be rejected.",
          versionId,
        ],
      );
    } catch (error) {
      duplicateCandidateWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505";
    } finally {
      await client.query(
        "ROLLBACK TO SAVEPOINT generation_candidate_uniqueness_check",
      );
    }
    if (!duplicateCandidateWasBlocked) {
      throw new Error(
        "One generation run produced multiple candidate versions.",
      );
    }
    await client.query(
      `UPDATE generation_runs
       SET status = 'SUCCEEDED', completed_at = now(),
           input_tokens = 10, output_tokens = 10, estimated_cost_micros = 500
       WHERE id = $1`,
      [generationRunId],
    );
    await client.query("SAVEPOINT generation_history_check");
    let generationMutationWasBlocked = false;
    try {
      await client.query(
        "UPDATE generation_runs SET max_cost_micros = 2000 WHERE id = $1",
        [generationRunId],
      );
    } catch (error) {
      generationMutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT generation_history_check");
    }
    if (!generationMutationWasBlocked) {
      throw new Error(
        "The terminal generation-run history allowed a mutation.",
      );
    }

    await client.query(
      `INSERT INTO generation_runs
       (id, idempotency_key, template_id, source_question_version_id,
        request_kind, requested_by, provider, model, prompt_hash, parameters,
        request_payload, status, claim_token, claimed_by, lease_expires_at,
        last_heartbeat_at, attempt_count, max_cost_micros)
       VALUES ($1, $2, $3, $4, 'FULL_REVISION', 'ci-smoke-test',
               'CI_PROVIDER', 'ci-model', $5, $6::jsonb, $7::jsonb,
               'RUNNING', $8, 'ci-expired-worker', now() - interval '1 minute',
               now() - interval '2 minutes', $9, 1000)`,
      [
        exhaustedGenerationRunId,
        `ci-generation-exhausted-${exhaustedGenerationRunId}`,
        generationTemplateId,
        versionId,
        "ci-exhausted-prompt-hash",
        JSON.stringify({ sourceQuestionTextProvided: false }),
        JSON.stringify({ sourceQuestionTextProvided: false }),
        exhaustedGenerationClaimToken,
        MAX_GENERATION_ATTEMPTS,
      ],
    );
    await client.query("SAVEPOINT running_generation_cancel_check");
    let runningCancellationWasBlocked = false;
    try {
      await client.query(
        `UPDATE generation_runs
         SET status = 'CANCELLED', cancelled_by = 'ci-smoke-test',
             cancellation_reason = $2, completed_at = now()
         WHERE id = $1`,
        [
          exhaustedGenerationRunId,
          "A running request must be fenced by its lease instead of reviewer cancellation.",
        ],
      );
    } catch (error) {
      runningCancellationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query(
        "ROLLBACK TO SAVEPOINT running_generation_cancel_check",
      );
    }
    if (!runningCancellationWasBlocked) {
      throw new Error("A running generation request accepted cancellation.");
    }
    const expiredHeartbeat = await client.query(
      `UPDATE generation_runs
       SET lease_expires_at = now() + interval '5 minutes',
           last_heartbeat_at = now()
       WHERE id = $1 AND status = 'RUNNING' AND claim_token = $2
         AND lease_expires_at > now()
       RETURNING id`,
      [exhaustedGenerationRunId, exhaustedGenerationClaimToken],
    );
    if (expiredHeartbeat.rowCount !== 0) {
      throw new Error("An expired generation claim renewed its lease.");
    }
    const exhaustedRuns = await client.query<{
      id: string;
      status: string;
      failure_code: string;
      claim_token: string;
    }>(
      `WITH exhausted AS (
         SELECT id
         FROM generation_runs
         WHERE status = 'RUNNING'
           AND lease_expires_at <= now()
           AND attempt_count >= $1
         ORDER BY lease_expires_at, id
         FOR UPDATE SKIP LOCKED
         LIMIT 100
       )
       UPDATE generation_runs AS run
       SET status = 'FAILED', failure_code = 'LEASE_ATTEMPTS_EXHAUSTED',
           completed_at = now()
       FROM exhausted
       WHERE run.id = exhausted.id
       RETURNING run.id, run.status, run.failure_code, run.claim_token`,
      [MAX_GENERATION_ATTEMPTS],
    );
    const exhaustedRun = exhaustedRuns.rows.find(
      (run) => run.id === exhaustedGenerationRunId,
    );
    if (
      exhaustedRun?.status !== "FAILED" ||
      exhaustedRun.failure_code !== "LEASE_ATTEMPTS_EXHAUSTED" ||
      exhaustedRun.claim_token !== exhaustedGenerationClaimToken
    ) {
      throw new Error(
        "An expired generation run did not preserve attribution when exhausting retries.",
      );
    }

    await client.query(
      `INSERT INTO generation_runs
       (id, idempotency_key, template_id, source_question_version_id,
        request_kind, requested_by, provider, model, prompt_hash, parameters,
        request_payload, status, max_cost_micros)
       VALUES ($1, $2, $3, $4, 'EXPLANATION_ONLY', 'ci-smoke-test',
               'UNCONFIGURED', 'not-dispatched', $5, $6::jsonb, $7::jsonb,
               'PENDING', 1000)`,
      [
        cancelledGenerationRunId,
        `ci-generation-cancelled-${cancelledGenerationRunId}`,
        generationTemplateId,
        versionId,
        "ci-cancelled-prompt-hash",
        JSON.stringify({ sourceQuestionTextProvided: false }),
        JSON.stringify({ sourceQuestionTextProvided: false }),
      ],
    );
    await client.query("SAVEPOINT cancellation_evidence_check");
    let missingCancellationEvidenceWasBlocked = false;
    try {
      await client.query(
        `UPDATE generation_runs
         SET status = 'CANCELLED', completed_at = now()
         WHERE id = $1`,
        [cancelledGenerationRunId],
      );
    } catch (error) {
      missingCancellationEvidenceWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23514";
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT cancellation_evidence_check");
    }
    if (!missingCancellationEvidenceWasBlocked) {
      throw new Error("A generation request was cancelled without evidence.");
    }
    await client.query(
      `UPDATE generation_runs
       SET status = 'CANCELLED', cancelled_by = 'ci-smoke-test',
           cancellation_reason = $2, completed_at = now()
       WHERE id = $1`,
      [
        cancelledGenerationRunId,
        "The queued smoke-test request is intentionally cancelled to verify immutable audit evidence.",
      ],
    );
    await client.query("SAVEPOINT cancellation_history_check");
    let cancellationMutationWasBlocked = false;
    try {
      await client.query(
        `UPDATE generation_runs
         SET cancellation_reason = 'This terminal reason must not change after cancellation.'
         WHERE id = $1`,
        [cancelledGenerationRunId],
      );
    } catch (error) {
      cancellationMutationWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "55000";
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT cancellation_history_check");
    }
    if (!cancellationMutationWasBlocked) {
      throw new Error("Cancellation audit evidence remained mutable.");
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

    const reviewerFeedbackIds = [randomUUID(), randomUUID()];
    await client.query(
      `INSERT INTO reviewer_feedback
       (id, question_version_id, reviewer_id, category, feedback,
        recurring_issue_code, status)
       VALUES
       ($1, $3, 'ci-smoke-test', 'ORIGINALITY', $4,
        'CI_RECURRING_PATTERN', 'OPEN'),
       ($2, $3, 'ci-smoke-test', 'ORIGINALITY', $5,
        'CI_RECURRING_PATTERN', 'OPEN')`,
      [
        reviewerFeedbackIds[0],
        reviewerFeedbackIds[1],
        versionId,
        "First temporary signal for the improvement-proposal smoke test.",
        "Second temporary signal for the improvement-proposal smoke test.",
      ],
    );
    const proposalId = randomUUID();
    await client.query(
      `INSERT INTO improvement_proposals
       (id, proposal_key, pattern_key, category, target, title,
        problem_summary, proposed_change, regression_plan, created_by)
       VALUES ($1, $2, 'CI_RECURRING_PATTERN', 'ORIGINALITY',
               'EVALUATION_CASE', 'CI recurring-pattern proposal', $3, $4, $5,
               'ci-smoke-test')`,
      [
        proposalId,
        `ci-proposal-${proposalId}`,
        "Two temporary reports describe the same recurring originality risk.",
        "Add a regression case that distinguishes original and near-copy candidates.",
        "Run the originality evaluator against positive and adversarial fixtures before implementation.",
      ],
    );

    await client.query("SAVEPOINT proposal_evidence_minimum_check");
    let evidenceMinimumWasBlocked = false;
    try {
      await client.query(
        `INSERT INTO improvement_proposal_decisions
         (proposal_id, decision, notes, decided_by)
         VALUES ($1, 'APPROVED', $2, 'ci-smoke-test')`,
        [
          proposalId,
          "This premature decision must fail without two linked evidence records.",
        ],
      );
    } catch (error) {
      evidenceMinimumWasBlocked =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23514";
    } finally {
      await client.query(
        "ROLLBACK TO SAVEPOINT proposal_evidence_minimum_check",
      );
    }
    if (!evidenceMinimumWasBlocked) {
      throw new Error(
        "An improvement proposal was decided without enough linked evidence.",
      );
    }

    const evidenceIds = [randomUUID(), randomUUID()];
    await client.query(
      `INSERT INTO improvement_proposal_evidence
       (id, proposal_id, evidence_key, source_kind, question_version_id,
        details_snapshot, reviewer_feedback_id)
       VALUES ($1, $3, $4, 'REVIEWER', $5, $6, $7),
              ($2, $3, $8, 'REVIEWER', $5, $9, $10)`,
      [
        evidenceIds[0],
        evidenceIds[1],
        proposalId,
        `REVIEWER:${reviewerFeedbackIds[0]}`,
        versionId,
        "First temporary signal for the improvement-proposal smoke test.",
        reviewerFeedbackIds[0],
        `REVIEWER:${reviewerFeedbackIds[1]}`,
        "Second temporary signal for the improvement-proposal smoke test.",
        reviewerFeedbackIds[1],
      ],
    );
    const proposalDecisionId = randomUUID();
    await client.query(
      `INSERT INTO improvement_proposal_decisions
       (id, proposal_id, decision, notes, decided_by)
       VALUES ($1, $2, 'APPROVED', $3, 'ci-smoke-test')`,
      [
        proposalDecisionId,
        proposalId,
        "Approve only the plan represented by this rolled-back smoke fixture.",
      ],
    );

    for (const [savepoint, query, id, label] of [
      [
        "proposal_immutability_check",
        "UPDATE improvement_proposals SET title = 'mutated' WHERE id = $1",
        proposalId,
        "improvement proposal",
      ],
      [
        "proposal_evidence_immutability_check",
        "DELETE FROM improvement_proposal_evidence WHERE id = $1",
        evidenceIds[0],
        "improvement proposal evidence",
      ],
      [
        "proposal_decision_immutability_check",
        "UPDATE improvement_proposal_decisions SET notes = 'mutated decision' WHERE id = $1",
        proposalDecisionId,
        "improvement proposal decision",
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
        throw new Error(`The ${label} allowed an audit-history mutation.`);
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
