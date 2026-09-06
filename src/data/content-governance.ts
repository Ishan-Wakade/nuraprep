import "server-only";

import { asc, count, desc, eq } from "drizzle-orm";
import { connection } from "next/server";

import { getDatabase } from "@/db/client";
import {
  coverageObservations,
  generationRuns,
  generationTemplates,
  questionVersions,
  questions,
  skills,
  sourceArtifacts,
} from "@/db/schema";
import { requireReviewer } from "@/lib/auth/reviewer";

export async function getSourceRegistry() {
  await connection();
  requireReviewer();
  const database = getDatabase();

  const [sources, skillRows] = await Promise.all([
    database
      .select({
        id: sourceArtifacts.id,
        canonicalUrl: sourceArtifacts.canonicalUrl,
        publisher: sourceArtifacts.publisher,
        title: sourceArtifacts.title,
        artifactType: sourceArtifacts.artifactType,
        accessClass: sourceArtifacts.accessClass,
        decision: sourceArtifacts.decision,
        statedLicense: sourceArtifacts.statedLicense,
        termsUrl: sourceArtifacts.termsUrl,
        allowMetadata: sourceArtifacts.allowMetadata,
        allowCoverageAnalysis: sourceArtifacts.allowCoverageAnalysis,
        allowQuotation: sourceArtifacts.allowQuotation,
        allowStorage: sourceArtifacts.allowStorage,
        allowModelInput: sourceArtifacts.allowModelInput,
        decisionRationale: sourceArtifacts.decisionRationale,
        reviewedBy: sourceArtifacts.reviewedBy,
        recheckAt: sourceArtifacts.recheckAt,
        accessedAt: sourceArtifacts.accessedAt,
        observationCount: count(coverageObservations.id),
      })
      .from(sourceArtifacts)
      .leftJoin(
        coverageObservations,
        eq(coverageObservations.sourceArtifactId, sourceArtifacts.id),
      )
      .groupBy(sourceArtifacts.id)
      .orderBy(desc(sourceArtifacts.createdAt)),
    database
      .select({ id: skills.id, code: skills.code, title: skills.title })
      .from(skills)
      .where(eq(skills.active, true))
      .orderBy(asc(skills.title)),
  ]);

  return {
    sources: sources.map((source) => ({
      ...source,
      accessedAt: source.accessedAt.toISOString(),
      recheckAt: source.recheckAt?.toISOString() ?? null,
    })),
    skills: skillRows,
  };
}

export async function getGenerationConsole() {
  await connection();
  requireReviewer();
  const database = getDatabase();

  const [templates, runs] = await Promise.all([
    database
      .select({
        id: generationTemplates.id,
        templateKey: generationTemplates.templateKey,
        version: generationTemplates.version,
        status: generationTemplates.status,
        skillTitle: skills.title,
        questionType: generationTemplates.questionType,
        difficulty: generationTemplates.difficulty,
        instructions: generationTemplates.instructions,
        authoredBy: generationTemplates.authoredBy,
        approvedBy: generationTemplates.approvedBy,
        approvalNotes: generationTemplates.approvalNotes,
        approvedAt: generationTemplates.approvedAt,
      })
      .from(generationTemplates)
      .innerJoin(skills, eq(skills.id, generationTemplates.targetSkillId))
      .orderBy(desc(generationTemplates.createdAt)),
    database
      .select({
        id: generationRuns.id,
        idempotencyKey: generationRuns.idempotencyKey,
        requestKind: generationRuns.requestKind,
        status: generationRuns.status,
        provider: generationRuns.provider,
        model: generationRuns.model,
        maxCostMicros: generationRuns.maxCostMicros,
        estimatedCostMicros: generationRuns.estimatedCostMicros,
        sourceQuestionVersionId: generationRuns.sourceQuestionVersionId,
        questionSlug: questions.internalSlug,
        templateKey: generationTemplates.templateKey,
        templateVersion: generationTemplates.version,
        requestedBy: generationRuns.requestedBy,
        startedAt: generationRuns.startedAt,
        completedAt: generationRuns.completedAt,
        failureCode: generationRuns.failureCode,
      })
      .from(generationRuns)
      .innerJoin(
        generationTemplates,
        eq(generationTemplates.id, generationRuns.templateId),
      )
      .leftJoin(
        questionVersions,
        eq(questionVersions.id, generationRuns.sourceQuestionVersionId),
      )
      .leftJoin(questions, eq(questions.id, questionVersions.questionId))
      .orderBy(desc(generationRuns.startedAt))
      .limit(100),
  ]);

  return {
    templates: templates.map((template) => ({
      ...template,
      approvedAt: template.approvedAt?.toISOString() ?? null,
    })),
    runs: runs.map((run) => ({
      ...run,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    })),
  };
}
