import "server-only";

import { asc, count, desc, eq, sql } from "drizzle-orm";
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
  sourcePolicyReviews,
  validationRuns,
  validatorRules,
} from "@/db/schema";
import { requireReviewer } from "@/lib/auth/reviewer";

export async function getSourceRegistry() {
  await connection();
  requireReviewer();
  const database = getDatabase();

  const [sources, skillRows, reviewRows] = await Promise.all([
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
        robotsSummary: sourceArtifacts.robotsSummary,
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
    database
      .select({
        id: sourcePolicyReviews.id,
        sourceArtifactId: sourcePolicyReviews.sourceArtifactId,
        reviewKind: sourcePolicyReviews.reviewKind,
        resultingPolicy: sourcePolicyReviews.resultingPolicy,
        reviewedBy: sourcePolicyReviews.reviewedBy,
        reviewedAt: sourcePolicyReviews.reviewedAt,
      })
      .from(sourcePolicyReviews)
      .orderBy(desc(sourcePolicyReviews.reviewedAt))
      .limit(1_000),
  ]);

  const reviewsBySource = new Map<string, (typeof reviewRows)[number][]>();
  for (const review of reviewRows) {
    const reviews = reviewsBySource.get(review.sourceArtifactId) ?? [];
    reviews.push(review);
    reviewsBySource.set(review.sourceArtifactId, reviews);
  }

  const now = Date.now();
  const dueSoonBoundary = now + 30 * 24 * 60 * 60 * 1_000;
  const serializedSources = sources.map((source) => {
    const recheckTimestamp = source.recheckAt?.getTime();
    const recheckStatus = !recheckTimestamp
      ? ("UNSCHEDULED" as const)
      : recheckTimestamp <= now
        ? ("OVERDUE" as const)
        : recheckTimestamp <= dueSoonBoundary
          ? ("DUE_SOON" as const)
          : ("CURRENT" as const);
    return {
      ...source,
      accessedAt: source.accessedAt.toISOString(),
      recheckAt: source.recheckAt?.toISOString() ?? null,
      recheckStatus,
      reviews: (reviewsBySource.get(source.id) ?? []).map((review) => ({
        ...review,
        reviewedAt: review.reviewedAt.toISOString(),
      })),
    };
  });

  const recheckPriority = ["OVERDUE", "DUE_SOON", "UNSCHEDULED", "CURRENT"];
  serializedSources.sort(
    (left, right) =>
      recheckPriority.indexOf(left.recheckStatus) -
      recheckPriority.indexOf(right.recheckStatus),
  );

  return {
    sources: serializedSources,
    recheckSummary: {
      overdue: serializedSources.filter(
        (source) => source.recheckStatus === "OVERDUE",
      ).length,
      dueSoon: serializedSources.filter(
        (source) => source.recheckStatus === "DUE_SOON",
      ).length,
      unscheduled: serializedSources.filter(
        (source) => source.recheckStatus === "UNSCHEDULED",
      ).length,
    },
    skills: skillRows,
  };
}

export async function getValidatorRuleRegistry() {
  await connection();
  requireReviewer();
  const rows = await getDatabase()
    .select({
      id: validatorRules.id,
      key: validatorRules.key,
      version: validatorRules.version,
      description: validatorRules.description,
      blocksPublication: validatorRules.blocksPublication,
      active: validatorRules.active,
      implementationHash: validatorRules.implementationHash,
      changeNotes: validatorRules.changeNotes,
      createdBy: validatorRules.createdBy,
      activatedAt: validatorRules.activatedAt,
      retiredAt: validatorRules.retiredAt,
      retiredBy: validatorRules.retiredBy,
      evidenceCount: count(validationRuns.id),
    })
    .from(validatorRules)
    .leftJoin(
      validationRuns,
      eq(validationRuns.validatorRuleId, validatorRules.id),
    )
    .groupBy(validatorRules.id)
    .orderBy(validatorRules.key, desc(validatorRules.version));

  return rows.map((row) => ({
    ...row,
    activatedAt: row.activatedAt.toISOString(),
    retiredAt: row.retiredAt?.toISOString() ?? null,
  }));
}

export async function getGenerationConsole() {
  await connection();
  requireReviewer();
  const database = getDatabase();

  const [templates, runs, [metrics]] = await Promise.all([
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
        claimedBy: generationRuns.claimedBy,
        leaseExpiresAt: generationRuns.leaseExpiresAt,
        attemptCount: generationRuns.attemptCount,
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
        cancelledBy: generationRuns.cancelledBy,
        cancellationReason: generationRuns.cancellationReason,
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
    database
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${generationRuns.status} = 'PENDING')::int`,
        running: sql<number>`count(*) filter (where ${generationRuns.status} = 'RUNNING')::int`,
        staleLeases: sql<number>`count(*) filter (where ${generationRuns.status} = 'RUNNING' and ${generationRuns.leaseExpiresAt} <= now())::int`,
        succeeded: sql<number>`count(*) filter (where ${generationRuns.status} = 'SUCCEEDED')::int`,
        failed: sql<number>`count(*) filter (where ${generationRuns.status} = 'FAILED')::int`,
        cancelled: sql<number>`count(*) filter (where ${generationRuns.status} = 'CANCELLED')::int`,
        retryExhausted: sql<number>`count(*) filter (where ${generationRuns.failureCode} = 'LEASE_ATTEMPTS_EXHAUSTED')::int`,
        activeCeilingMicros:
          sql<number>`coalesce(sum(${generationRuns.maxCostMicros}) filter (where ${generationRuns.status} in ('PENDING', 'RUNNING')), 0)`.mapWith(
            Number,
          ),
        recordedCostMicros:
          sql<number>`coalesce(sum(${generationRuns.estimatedCostMicros}), 0)`.mapWith(
            Number,
          ),
      })
      .from(generationRuns),
  ]);

  return {
    templates: templates.map((template) => ({
      ...template,
      approvedAt: template.approvedAt?.toISOString() ?? null,
    })),
    runs: runs.map((run) => ({
      ...run,
      startedAt: run.startedAt.toISOString(),
      leaseExpiresAt: run.leaseExpiresAt?.toISOString() ?? null,
      completedAt: run.completedAt?.toISOString() ?? null,
    })),
    metrics: metrics ?? {
      total: 0,
      pending: 0,
      running: 0,
      staleLeases: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      retryExhausted: 0,
      activeCeilingMicros: 0,
      recordedCostMicros: 0,
    },
  };
}
