import { createHash, randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import type {
  AcceptedDeterministicVariant,
  DeterministicVariantBatch,
  DeterministicVariantTemplate,
} from "@/lib/generation/deterministic-variants";
import {
  validateMathVerification,
  validateMisconceptionRules,
  validateQuestionContent,
} from "@/lib/questions/validation";

const CONTENT_OUTLINE_URL =
  "https://www.atitesting.com/docs/default-source/teas-resources/ati_teas7_content_outline.pdf";
const REQUIRED_VALIDATORS = [
  "answer-contract",
  "mathematical-correctness",
] as const;

export type StagedDeterministicBatchResult = {
  created: number;
  skipped: number;
  questionVersionIds: string[];
};

export async function stageDeterministicVariantBatches(input: {
  client: PoolClient;
  templates: readonly DeterministicVariantTemplate[];
  batches: readonly DeterministicVariantBatch[];
  requestedBy: string;
}): Promise<StagedDeterministicBatchResult> {
  const templateByKey = new Map(
    input.templates.map((template) => [template.key, template]),
  );
  const sourceArtifactId = await loadContentOutlineSource(input.client);
  const validatorIds = await loadValidatorIds(input.client);
  const result: StagedDeterministicBatchResult = {
    created: 0,
    skipped: 0,
    questionVersionIds: [],
  };

  for (const batch of input.batches) {
    const template = templateByKey.get(batch.templateKey);
    if (!template || template.version !== batch.templateVersion) {
      throw new Error(`Template registry mismatch for ${batch.templateKey}.`);
    }
    const { templateId, skillId } = await ensureTemplate(
      input.client,
      template,
      input.requestedBy,
    );

    for (const accepted of batch.accepted) {
      const staged = await stageVariant({
        client: input.client,
        template,
        templateId,
        skillId,
        sourceArtifactId,
        validatorIds,
        batch,
        accepted,
        requestedBy: input.requestedBy,
      });
      if (!staged) {
        result.skipped += 1;
        continue;
      }
      result.created += 1;
      result.questionVersionIds.push(staged);
    }
  }

  return result;
}

async function stageVariant(input: {
  client: PoolClient;
  template: DeterministicVariantTemplate;
  templateId: string;
  skillId: string;
  sourceArtifactId: string;
  validatorIds: Record<(typeof REQUIRED_VALIDATORS)[number], string>;
  batch: DeterministicVariantBatch;
  accepted: AcceptedDeterministicVariant;
  requestedBy: string;
}) {
  const idempotencyKey = hash({
    kind: "deterministic-question-draft",
    templateKey: input.template.key,
    templateVersion: input.template.version,
    contentHash: input.accepted.contentHash,
  });
  const existing = await input.client.query<{ version_id: string | null }>(
    `SELECT version.id AS version_id
       FROM generation_runs AS run
       LEFT JOIN question_versions AS version ON version.generation_run_id = run.id
      WHERE run.idempotency_key = $1
      LIMIT 1`,
    [idempotencyKey],
  );
  if (existing.rows.length > 0) return null;

  const content = validateQuestionContent(input.accepted.candidate.content);
  if (!content.valid) {
    throw new Error("Accepted variant no longer passes its content contract.");
  }
  const math = validateMathVerification(
    content.content,
    input.accepted.candidate.verificationSpec,
  );
  if (!math.valid) {
    throw new Error(
      `Accepted variant no longer passes math validation: ${math.failureCode}.`,
    );
  }
  const misconceptionIssues = validateMisconceptionRules(
    content.content,
    input.accepted.candidate.commonMisconceptions,
    input.accepted.candidate.misconceptionRules,
  );
  if (misconceptionIssues.length > 0) {
    throw new Error(
      "Accepted variant no longer passes its misconception contract.",
    );
  }

  const runId = randomUUID();
  const questionId = randomUUID();
  const versionId = randomUUID();
  const claimToken = hash({
    runId,
    idempotencyKey,
    requestedBy: input.requestedBy,
  });
  const slug = `${input.template.key.replaceAll(".", "-")}-v${input.template.version}-${input.accepted.contentHash.slice(0, 16)}`;
  const promptHash = hash({
    templateKey: input.template.key,
    templateVersion: input.template.version,
    structureKey: input.accepted.structureKey,
    parameters: input.accepted.parameters,
  });

  await input.client.query(
    `INSERT INTO generation_runs
       (id, idempotency_key, template_id, request_kind, requested_by,
        provider, model, prompt_hash, parameters, request_payload, random_seed,
        status, claim_token, claimed_by, lease_expires_at, last_heartbeat_at,
        attempt_count, max_cost_micros, input_tokens, output_tokens,
        estimated_cost_micros)
     VALUES
       ($1, $2, $3, 'NEW_QUESTION', $4, 'NuraPrep', $5, $6, $7::jsonb,
        $8::jsonb, $9, 'RUNNING', $10, $4, now() + interval '15 minutes',
        now(), 1, 0, 0, 0, 0)`,
    [
      runId,
      idempotencyKey,
      input.templateId,
      input.requestedBy,
      `deterministic/${input.template.key}/v${input.template.version}`,
      promptHash,
      JSON.stringify(input.accepted.parameters),
      JSON.stringify({
        purpose: "reviewer-queue-draft",
        batchId: input.batch.batchId,
        batchSeed: input.batch.batchSeed,
        structureKey: input.accepted.structureKey,
        contentHash: input.accepted.contentHash,
        sourceQuestionTextProvided: false,
      }),
      input.accepted.candidateSeed,
      claimToken,
    ],
  );

  await input.client.query(
    `INSERT INTO questions (id, internal_slug, section, lifecycle)
     VALUES ($1, $2, 'MATH', 'DRAFT')`,
    [questionId, slug],
  );
  await input.client.query(
    `INSERT INTO question_versions
       (id, question_id, version, question_type, prompt, stimulus, choices,
        answer_spec, explanation, distractor_rationales, verification_spec,
        primary_skill_id, learning_objective, difficulty, difficulty_rationale,
        estimated_seconds, calculator_policy, common_misconceptions,
        misconception_rules, tutor_guidance, authoring_mode, generation_run_id,
        provenance_summary)
     VALUES
       ($1, $2, 1, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9::jsonb,
        $10::jsonb, $11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb,
        $19::jsonb, 'GENERATED', $20, $21)`,
    [
      versionId,
      questionId,
      content.content.questionType,
      content.content.prompt,
      jsonOrNull(content.content.stimulus),
      jsonOrNull(content.content.choices),
      JSON.stringify(content.content.answerSpec),
      content.content.explanation,
      JSON.stringify(content.content.distractorRationales),
      JSON.stringify(input.accepted.candidate.verificationSpec),
      input.skillId,
      input.accepted.candidate.learningObjective,
      input.accepted.candidate.difficulty,
      input.accepted.candidate.difficultyRationale,
      input.accepted.candidate.estimatedSeconds,
      input.accepted.candidate.calculatorPolicy,
      JSON.stringify(input.accepted.candidate.commonMisconceptions),
      JSON.stringify(input.accepted.candidate.misconceptionRules),
      jsonOrNull(input.accepted.candidate.tutorGuidance),
      runId,
      `Original deterministic NuraPrep draft from ${input.template.key} v${input.template.version}, batch ${input.batch.batchId}, structure ${input.accepted.structureKey}. Generated from in-house parameters without source-question text. Cost: $0. Human publication approval is still required.`,
    ],
  );

  await input.client.query(
    `INSERT INTO question_version_sources
       (question_version_id, source_artifact_id, relationship, transformation_notes)
     VALUES ($1, $2, 'SPECIFICATION', $3)`,
    [
      versionId,
      input.sourceArtifactId,
      "High-level public content-outline alignment only. The deterministic template received no source question wording, values, choices, or distinctive structure.",
    ],
  );
  await input.client.query(
    `INSERT INTO validation_runs
       (question_version_id, validator_rule_id, outcome, evidence)
     VALUES
       ($1, $2, 'PASS', $3::jsonb),
       ($1, $4, 'PASS', $5::jsonb)`,
    [
      versionId,
      input.validatorIds["answer-contract"],
      JSON.stringify({
        context: "AUTOMATED_REVIEW",
        method: "deterministic-variant-staging",
        executedBy: input.requestedBy,
        batchId: input.batch.batchId,
        contentHash: input.accepted.contentHash,
        structureKey: input.accepted.structureKey,
        similaritySignals: input.accepted.similaritySignals,
        issues: [],
        originalityLimit:
          "Internal comparison is a rejection aid, not proof of legal originality.",
      }),
      input.validatorIds["mathematical-correctness"],
      JSON.stringify({
        context: "AUTOMATED_REVIEW",
        ...math.evidence,
        executedBy: input.requestedBy,
        batchId: input.batch.batchId,
      }),
    ],
  );
  await input.client.query(
    `UPDATE generation_runs
        SET status = 'SUCCEEDED', completed_at = now()
      WHERE id = $1`,
    [runId],
  );

  return versionId;
}

async function ensureTemplate(
  client: PoolClient,
  template: DeterministicVariantTemplate,
  requestedBy: string,
) {
  const skill = await client.query<{ id: string }>(
    `SELECT id FROM skills
      WHERE code = $1 AND section = 'MATH' AND active = true
      LIMIT 1`,
    [template.targetSkillCode],
  );
  const skillId = skill.rows[0]?.id;
  if (!skillId) {
    throw new Error(
      `Active Math skill not found: ${template.targetSkillCode}.`,
    );
  }

  const existing = await client.query<{
    id: string;
    target_skill_id: string;
    question_type: string;
    difficulty: string;
  }>(
    `SELECT id, target_skill_id, question_type, difficulty
       FROM generation_templates
      WHERE template_key = $1 AND version = $2
      LIMIT 1`,
    [template.key, template.version],
  );
  const row = existing.rows[0];
  if (row) {
    if (
      row.target_skill_id !== skillId ||
      row.question_type !== template.questionType ||
      row.difficulty !== template.difficulty
    ) {
      throw new Error(`Stored template contract differs for ${template.key}.`);
    }
    return { templateId: row.id, skillId };
  }

  const templateId = randomUUID();
  await client.query(
    `INSERT INTO generation_templates
       (id, template_key, version, status, target_skill_id, question_type,
        difficulty, instructions, parameter_constraints, prohibited_patterns,
        validator_contract, authored_by)
     VALUES ($1, $2, $3, 'DRAFT', $4, $5, $6, $7, $8::jsonb, $9::jsonb,
             $10::jsonb, $11)`,
    [
      templateId,
      template.key,
      template.version,
      skillId,
      template.questionType,
      template.difficulty,
      `Generate an original ${template.difficulty.toLocaleLowerCase("en-US")} ${template.questionType.toLocaleLowerCase("en-US")} draft for ${template.targetSkillCode} using only the versioned deterministic implementation. Do not use source-question text.`,
      JSON.stringify({
        deterministic: true,
        stableSeedRequired: true,
        structureKeyUniqueWithinBatch: true,
        sourceQuestionTextProvided: false,
      }),
      JSON.stringify([
        "copied source wording",
        "numbers-only variation",
        "unverified answer key",
        "automatic publication",
      ]),
      JSON.stringify({
        required: REQUIRED_VALIDATORS,
        humanPublicationDecisionRequired: true,
      }),
      requestedBy,
    ],
  );
  return { templateId, skillId };
}

async function loadContentOutlineSource(client: PoolClient) {
  const source = await client.query<{ id: string }>(
    `SELECT id FROM source_artifacts
      WHERE canonical_url = $1
        AND decision IN ('COVERAGE_ANALYSIS', 'LICENSED_STORAGE')
        AND allow_metadata = true
      LIMIT 1`,
    [CONTENT_OUTLINE_URL],
  );
  const id = source.rows[0]?.id;
  if (!id) {
    throw new Error(
      "The governed public Math content-outline source is missing.",
    );
  }
  return id;
}

async function loadValidatorIds(client: PoolClient) {
  const validators = await client.query<{ id: string; key: string }>(
    `SELECT id, key FROM validator_rules
      WHERE active = true AND key = ANY($1::varchar[])`,
    [REQUIRED_VALIDATORS],
  );
  const byKey = Object.fromEntries(
    validators.rows.map((validator) => [validator.key, validator.id]),
  ) as Partial<Record<(typeof REQUIRED_VALIDATORS)[number], string>>;
  for (const key of REQUIRED_VALIDATORS) {
    if (!byKey[key]) throw new Error(`Active validator not found: ${key}.`);
  }
  return byKey as Record<(typeof REQUIRED_VALIDATORS)[number], string>;
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function jsonOrNull(value: unknown) {
  return value === undefined || value === null ? null : JSON.stringify(value);
}
