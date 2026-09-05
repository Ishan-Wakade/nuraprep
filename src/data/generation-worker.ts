import "server-only";

import { and, eq, max, sql } from "drizzle-orm";
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
import { questionContentSchema } from "@/lib/questions/contracts";

const storedRequestPayloadSchema = z.object({
  reviewerInstruction: z.string(),
  reviewerAttestedNoSourceText: z.literal(true),
});

export async function loadPendingGenerationJob(
  runId: string,
): Promise<PendingGenerationJob | undefined> {
  const parsedRunId = z.uuid().safeParse(runId);
  if (!parsedRunId.success) return undefined;
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
    .where(eq(generationRuns.id, parsedRunId.data))
    .limit(1);

  if (!row || row.status !== "PENDING" || row.templateStatus !== "APPROVED") {
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
        .where(eq(generationRuns.id, input.runId))
        .limit(1);
      if (!run || run.status !== "PENDING") {
        throw new Error("GENERATION_RUN_NOT_PENDING");
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
        .where(eq(generationRuns.id, input.runId));
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
        .select({ status: generationRuns.status })
        .from(generationRuns)
        .where(eq(generationRuns.id, input.runId))
        .limit(1);
      if (!run || run.status !== "PENDING") return;
      await transaction
        .update(generationRuns)
        .set({
          provider: input.provider,
          model: input.model,
          status: "FAILED",
          failureCode: input.failureCode,
          completedAt: new Date(),
        })
        .where(eq(generationRuns.id, input.runId));
    });
  },
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
}
