import { randomUUID } from "node:crypto";

import "server-only";

import { and, eq, gt, max, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import {
  coverageObservations,
  generationRuns,
  generationTemplates,
  questions,
  questionVersionSkills,
  questionVersionSources,
  questionVersions,
  sourceArtifacts,
} from "@/db/schema";
import {
  generationRequestSchema,
  type GeneratedCandidate,
} from "@/lib/generation/contracts";
import type {
  GenerationWorkerRepository,
  PendingGenerationJob,
} from "@/lib/generation/worker";
import type {
  GenerationClaim,
  GenerationQueueRepository,
} from "@/lib/generation/queue";
import { MAX_GENERATION_ATTEMPTS } from "@/lib/generation/retry-policy";
import { questionContentSchema } from "@/lib/questions/contracts";

const storedRequestPayloadSchema = z.object({
  reviewerInstruction: z.string(),
  reviewerAttestedNoSourceText: z.literal(true),
});

const EXHAUSTION_SWEEP_LIMIT = 100;

const claimRequestSchema = z.object({
  workerId: z
    .string()
    .trim()
    .min(3)
    .max(160)
    .regex(/^[A-Za-z0-9._:-]+$/),
  leaseSeconds: z.number().int().min(30).max(900),
  maxClaimCostMicros: z.number().int().nonnegative(),
});

export async function claimNextGenerationRun(input: {
  workerId: string;
  leaseSeconds: number;
  maxClaimCostMicros: number;
}): Promise<GenerationClaim | undefined> {
  const claim = claimRequestSchema.parse(input);
  const claimToken = randomUUID();
  const database = getDatabase();
  await exhaustExpiredGenerationRuns();
  const result = await database.execute<{
    id: string;
    attempt_count: number;
    lease_expires_at: Date;
    max_cost_micros: number;
  }>(sql`
    WITH candidate AS (
      SELECT run.id
      FROM generation_runs AS run
      INNER JOIN generation_templates AS template
        ON template.id = run.template_id
      WHERE (
        run.status = 'PENDING'
        OR (
          run.status = 'RUNNING'
          AND run.lease_expires_at <= now()
          AND run.attempt_count < ${MAX_GENERATION_ATTEMPTS}
        )
      )
        AND template.status = 'APPROVED'
        AND run.source_question_version_id IS NOT NULL
        AND run.request_kind <> 'NEW_QUESTION'
        AND run.max_cost_micros <= ${claim.maxClaimCostMicros}
      ORDER BY run.started_at, run.id
      FOR UPDATE OF run SKIP LOCKED
      LIMIT 1
    )
    UPDATE generation_runs AS run
    SET status = 'RUNNING',
        claim_token = ${claimToken},
        claimed_by = ${claim.workerId},
        lease_expires_at = now() + make_interval(secs => ${claim.leaseSeconds}),
        last_heartbeat_at = now(),
        attempt_count = run.attempt_count + 1
    FROM candidate
    WHERE run.id = candidate.id
    RETURNING run.id, run.attempt_count, run.lease_expires_at, run.max_cost_micros
  `);
  const row = result.rows[0];
  return row
    ? {
        runId: row.id,
        claimToken,
        workerId: claim.workerId,
        attemptCount: row.attempt_count,
        leaseExpiresAt: row.lease_expires_at,
        reservedCostMicros: row.max_cost_micros,
      }
    : undefined;
}

export async function exhaustExpiredGenerationRuns(): Promise<number> {
  const result = await getDatabase().execute<{ id: string }>(sql`
    WITH exhausted AS (
      SELECT id
      FROM generation_runs
      WHERE status = 'RUNNING'
        AND lease_expires_at <= now()
        AND attempt_count >= ${MAX_GENERATION_ATTEMPTS}
      ORDER BY lease_expires_at, id
      FOR UPDATE SKIP LOCKED
      LIMIT ${EXHAUSTION_SWEEP_LIMIT}
    )
    UPDATE generation_runs AS run
    SET status = 'FAILED',
        failure_code = 'LEASE_ATTEMPTS_EXHAUSTED',
        completed_at = now()
    FROM exhausted
    WHERE run.id = exhausted.id
    RETURNING run.id
  `);
  return result.rows.length;
}

export async function loadClaimedGenerationJob(
  claim: GenerationClaim,
): Promise<PendingGenerationJob | undefined> {
  const parsedClaim = z
    .object({ runId: z.uuid(), claimToken: z.uuid() })
    .safeParse(claim);
  if (!parsedClaim.success) return undefined;
  const database = getDatabase();

  const [row] = await database
    .select({
      runId: generationRuns.id,
      idempotencyKey: generationRuns.idempotencyKey,
      status: generationRuns.status,
      maxCostMicros: generationRuns.maxCostMicros,
      requestKind: generationRuns.requestKind,
      requestPayload: generationRuns.requestPayload,
      sourceQuestionVersionId: generationRuns.sourceQuestionVersionId,
      templateId: generationTemplates.id,
      templateStatus: generationTemplates.status,
      templateKey: generationTemplates.templateKey,
      templateVersion: generationTemplates.version,
      templateInstructions: generationTemplates.instructions,
      parameterConstraints: generationTemplates.parameterConstraints,
      prohibitedPatterns: generationTemplates.prohibitedPatterns,
      validatorContract: generationTemplates.validatorContract,
      questionType: questionVersions.questionType,
      prompt: questionVersions.prompt,
      stimulus: questionVersions.stimulus,
      choices: questionVersions.choices,
      answerSpec: questionVersions.answerSpec,
      explanation: questionVersions.explanation,
      distractorRationales: questionVersions.distractorRationales,
      verificationSpec: questionVersions.verificationSpec,
      learningObjective: questionVersions.learningObjective,
      difficulty: questionVersions.difficulty,
      difficultyRationale: questionVersions.difficultyRationale,
      estimatedSeconds: questionVersions.estimatedSeconds,
      calculatorPolicy: questionVersions.calculatorPolicy,
      commonMisconceptions: questionVersions.commonMisconceptions,
      misconceptionRules: questionVersions.misconceptionRules,
      tutorGuidance: questionVersions.tutorGuidance,
    })
    .from(generationRuns)
    .innerJoin(
      generationTemplates,
      eq(generationTemplates.id, generationRuns.templateId),
    )
    .innerJoin(
      questionVersions,
      eq(questionVersions.id, generationRuns.sourceQuestionVersionId),
    )
    .where(
      and(
        eq(generationRuns.id, parsedClaim.data.runId),
        eq(generationRuns.status, "RUNNING"),
        eq(generationRuns.claimToken, parsedClaim.data.claimToken),
        gt(generationRuns.leaseExpiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row || row.status !== "RUNNING" || row.templateStatus !== "APPROVED") {
    return undefined;
  }
  if (row.requestKind === "NEW_QUESTION") return undefined;

  const payload = storedRequestPayloadSchema.safeParse(row.requestPayload);
  if (!payload.success || !row.sourceQuestionVersionId) return undefined;
  const request = generationRequestSchema.parse({
    sourceQuestionVersionId: row.sourceQuestionVersionId,
    templateId: row.templateId,
    requestKind: row.requestKind,
    reviewerInstruction: payload.data.reviewerInstruction,
    maxCostMicros: row.maxCostMicros,
    noSourceTextAttestation: "on",
  });
  const content = questionContentSchema.parse({
    questionType: row.questionType,
    prompt: row.prompt,
    stimulus: row.stimulus ?? undefined,
    choices: row.choices ?? undefined,
    answerSpec: row.answerSpec,
    explanation: row.explanation,
    distractorRationales: row.distractorRationales,
  });
  const observations = await database
    .select({ observation: coverageObservations.observation })
    .from(coverageObservations)
    .innerJoin(
      sourceArtifacts,
      eq(sourceArtifacts.id, coverageObservations.sourceArtifactId),
    )
    .innerJoin(
      generationTemplates,
      eq(generationTemplates.targetSkillId, coverageObservations.skillId),
    )
    .where(
      and(
        eq(generationTemplates.id, row.templateId),
        eq(sourceArtifacts.allowCoverageAnalysis, true),
      ),
    );

  return {
    runId: row.runId,
    claimToken: parsedClaim.data.claimToken,
    maxCostMicros: row.maxCostMicros,
    envelope: {
      execution: {
        runId: row.runId,
        idempotencyKey: row.idempotencyKey,
        maxCostMicros: row.maxCostMicros,
      },
      template: {
        key: row.templateKey,
        version: row.templateVersion,
        instructions: row.templateInstructions,
        parameterConstraints: row.parameterConstraints,
        prohibitedPatterns: row.prohibitedPatterns,
        validatorContract: row.validatorContract,
      },
      request,
      internalQuestionVersion: {
        content,
        verificationSpec: row.verificationSpec,
        learningObjective: row.learningObjective,
        difficulty: row.difficulty,
        difficultyRationale: row.difficultyRationale,
        estimatedSeconds: row.estimatedSeconds,
        calculatorPolicy: row.calculatorPolicy,
        commonMisconceptions: row.commonMisconceptions,
        misconceptionRules: row.misconceptionRules,
        tutorGuidance: row.tutorGuidance,
      },
      abstractCoverageObservations: observations.map(
        (observation) => observation.observation,
      ),
      sourceQuestionTextProvided: false,
    },
  };
}

export const postgresGenerationWorkerRepository: GenerationWorkerRepository = {
  async complete(input) {
    const database = getDatabase();
    await database.transaction(async (transaction) => {
      await lockRun(transaction, input.runId);
      const [run] = await transaction
        .select({
          status: generationRuns.status,
          claimToken: generationRuns.claimToken,
          sourceQuestionVersionId: generationRuns.sourceQuestionVersionId,
          maxCostMicros: generationRuns.maxCostMicros,
          templateKey: generationTemplates.templateKey,
          templateVersion: generationTemplates.version,
          templateStatus: generationTemplates.status,
          targetSkillId: generationTemplates.targetSkillId,
          questionType: generationTemplates.questionType,
          difficulty: generationTemplates.difficulty,
        })
        .from(generationRuns)
        .innerJoin(
          generationTemplates,
          eq(generationTemplates.id, generationRuns.templateId),
        )
        .where(
          and(
            eq(generationRuns.id, input.runId),
            eq(generationRuns.status, "RUNNING"),
            eq(generationRuns.claimToken, input.claimToken),
            gt(generationRuns.leaseExpiresAt, sql`now()`),
          ),
        )
        .limit(1);
      if (!run) {
        throw new Error("GENERATION_RUN_CLAIM_LOST");
      }
      if (!run.sourceQuestionVersionId) {
        throw new Error("GENERATION_SOURCE_VERSION_REQUIRED");
      }
      if (run.templateStatus !== "APPROVED") {
        throw new Error("GENERATION_TEMPLATE_NOT_APPROVED");
      }
      if (input.usage.estimatedCostMicros > run.maxCostMicros) {
        throw new Error("GENERATION_COST_LIMIT_EXCEEDED");
      }
      if (
        input.candidate.content.questionType !== run.questionType ||
        input.candidate.difficulty !== run.difficulty
      ) {
        throw new Error("GENERATION_TEMPLATE_CONTRACT_MISMATCH");
      }

      const [sourceVersion] = await transaction
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, run.sourceQuestionVersionId))
        .limit(1);
      if (
        !sourceVersion ||
        sourceVersion.primarySkillId !== run.targetSkillId
      ) {
        throw new Error("GENERATION_SOURCE_CONTRACT_MISMATCH");
      }

      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${sourceVersion.questionId}::text, 0))`,
      );
      const [versionResult] = await transaction
        .select({ maximumVersion: max(questionVersions.version) })
        .from(questionVersions)
        .where(eq(questionVersions.questionId, sourceVersion.questionId));
      const nextVersion = (versionResult?.maximumVersion ?? 0) + 1;

      const [candidateVersion] = await transaction
        .insert(questionVersions)
        .values(
          candidateVersionValues({
            candidate: input.candidate,
            sourceVersion,
            nextVersion,
            runId: input.runId,
            provider: input.provider,
            model: input.model,
            templateKey: run.templateKey,
            templateVersion: run.templateVersion,
          }),
        )
        .returning({ id: questionVersions.id });
      if (!candidateVersion) throw new Error("GENERATION_PERSIST_FAILED");

      const [sourceLinks, skillLinks] = await Promise.all([
        transaction
          .select()
          .from(questionVersionSources)
          .where(
            eq(questionVersionSources.questionVersionId, sourceVersion.id),
          ),
        transaction
          .select()
          .from(questionVersionSkills)
          .where(eq(questionVersionSkills.questionVersionId, sourceVersion.id)),
      ]);
      if (sourceLinks.length) {
        await transaction.insert(questionVersionSources).values(
          sourceLinks.map((link) => ({
            questionVersionId: candidateVersion.id,
            sourceArtifactId: link.sourceArtifactId,
            relationship: link.relationship,
            transformationNotes: `${link.transformationNotes} Carried into generated revision run ${input.runId}.`,
          })),
        );
      }
      if (skillLinks.length) {
        await transaction.insert(questionVersionSkills).values(
          skillLinks.map((link) => ({
            questionVersionId: candidateVersion.id,
            skillId: link.skillId,
            relationship: link.relationship,
          })),
        );
      }

      await transaction
        .update(generationRuns)
        .set({
          provider: input.provider,
          model: input.model,
          status: "SUCCEEDED",
          inputTokens: input.usage.inputTokens,
          outputTokens: input.usage.outputTokens,
          estimatedCostMicros: input.usage.estimatedCostMicros,
          providerRequestId: input.providerRequestId,
          failureCode: null,
          completedAt: new Date(),
        })
        .where(
          and(
            eq(generationRuns.id, input.runId),
            eq(generationRuns.status, "RUNNING"),
            eq(generationRuns.claimToken, input.claimToken),
          ),
        );
      await transaction
        .update(questions)
        .set({ updatedAt: new Date() })
        .where(eq(questions.id, sourceVersion.questionId));
    });
  },

  async fail(input) {
    const database = getDatabase();
    await database.transaction(async (transaction) => {
      await lockRun(transaction, input.runId);
      const [run] = await transaction
        .select({
          status: generationRuns.status,
          claimToken: generationRuns.claimToken,
        })
        .from(generationRuns)
        .where(
          and(
            eq(generationRuns.id, input.runId),
            eq(generationRuns.status, "RUNNING"),
            eq(generationRuns.claimToken, input.claimToken),
            gt(generationRuns.leaseExpiresAt, sql`now()`),
          ),
        )
        .limit(1);
      if (!run) return;
      await transaction
        .update(generationRuns)
        .set({
          provider: input.provider,
          model: input.model,
          status: "FAILED",
          failureCode: input.failureCode,
          completedAt: new Date(),
        })
        .where(
          and(
            eq(generationRuns.id, input.runId),
            eq(generationRuns.status, "RUNNING"),
            eq(generationRuns.claimToken, input.claimToken),
          ),
        );
    });
  },
};

export async function heartbeatGenerationClaim(input: {
  runId: string;
  claimToken: string;
  leaseSeconds: number;
}) {
  const parsed = z
    .object({
      runId: z.uuid(),
      claimToken: z.string().uuid(),
      leaseSeconds: z.number().int().min(30).max(900),
    })
    .safeParse(input);
  if (!parsed.success) return false;
  const now = new Date();
  const [updated] = await getDatabase()
    .update(generationRuns)
    .set({
      lastHeartbeatAt: now,
      leaseExpiresAt: new Date(
        now.getTime() + parsed.data.leaseSeconds * 1_000,
      ),
    })
    .where(
      and(
        eq(generationRuns.id, parsed.data.runId),
        eq(generationRuns.status, "RUNNING"),
        eq(generationRuns.claimToken, parsed.data.claimToken),
        gt(generationRuns.leaseExpiresAt, sql`now()`),
      ),
    )
    .returning({ id: generationRuns.id });
  return Boolean(updated);
}

export const postgresGenerationQueueRepository: GenerationQueueRepository = {
  ...postgresGenerationWorkerRepository,
  claimNext: claimNextGenerationRun,
  loadClaimed: loadClaimedGenerationJob,
  heartbeat: heartbeatGenerationClaim,
};

function candidateVersionValues(input: {
  candidate: GeneratedCandidate;
  sourceVersion: typeof questionVersions.$inferSelect;
  nextVersion: number;
  runId: string;
  provider: string;
  model: string;
  templateKey: string;
  templateVersion: number;
}): typeof questionVersions.$inferInsert {
  return {
    questionId: input.sourceVersion.questionId,
    version: input.nextVersion,
    questionType: input.candidate.content.questionType,
    prompt: input.candidate.content.prompt,
    stimulus: input.candidate.content.stimulus,
    choices: input.candidate.content.choices,
    answerSpec: input.candidate.content.answerSpec,
    explanation: input.candidate.content.explanation,
    distractorRationales: input.candidate.content.distractorRationales,
    verificationSpec: input.candidate.verificationSpec,
    primarySkillId: input.sourceVersion.primarySkillId,
    learningObjective: input.candidate.learningObjective,
    difficulty: input.candidate.difficulty,
    difficultyRationale: input.candidate.difficultyRationale,
    estimatedSeconds: input.candidate.estimatedSeconds,
    calculatorPolicy: input.candidate.calculatorPolicy,
    commonMisconceptions: input.candidate.commonMisconceptions,
    misconceptionRules: input.candidate.misconceptionRules,
    tutorGuidance: input.candidate.tutorGuidance,
    authoringMode: "GENERATED",
    generationRunId: input.runId,
    provenanceSummary: `Generated as a draft from NuraPrep template ${input.templateKey} v${input.templateVersion} by ${input.provider}/${input.model}; run ${input.runId}. No source-question text was provided to the adapter.`,
  };
}

async function lockRun(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
  runId: string,
) {
  await transaction.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${runId}::text, 0))`,
  );
  await transaction.execute(
    sql`select id from generation_runs where id = ${runId} for update`,
  );
}
