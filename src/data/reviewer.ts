import "server-only";

import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { connection } from "next/server";

import { getDatabase } from "@/db/client";
import {
  generationRuns,
  generationTemplates,
  questionPublications,
  questions,
  questionVersionSources,
  questionVersions,
  reviewDecisions,
  reviewerFeedback,
  skills,
  sourceArtifacts,
  validationRuns,
  validatorRules,
} from "@/db/schema";
import { requireReviewer } from "@/lib/auth/reviewer";
import {
  evaluatePublicationGate,
  REQUIRED_PUBLICATION_VALIDATORS,
} from "@/lib/questions/validation";

export type ReviewQueueFilters = {
  query?: string;
  difficulty?: (typeof questionVersions.difficulty.enumValues)[number];
  questionType?: (typeof questionVersions.questionType.enumValues)[number];
  reviewStatus?:
    "UNREVIEWED" | (typeof reviewDecisions.decision.enumValues)[number];
  skillCode?: string;
};

export async function getReviewQueue(filters: ReviewQueueFilters) {
  await connection();
  requireReviewer();
  const database = getDatabase();

  const rows = await database
    .select({
      versionId: questionVersions.id,
      questionId: questionVersions.questionId,
      version: questionVersions.version,
      slug: questions.internalSlug,
      lifecycle: questions.lifecycle,
      prompt: questionVersions.prompt,
      questionType: questionVersions.questionType,
      difficulty: questionVersions.difficulty,
      skillCode: skills.code,
      skillTitle: skills.title,
      createdAt: questionVersions.createdAt,
    })
    .from(questionVersions)
    .innerJoin(questions, eq(questions.id, questionVersions.questionId))
    .innerJoin(skills, eq(skills.id, questionVersions.primarySkillId))
    .where(
      and(
        filters.query
          ? or(
              ilike(questionVersions.prompt, `%${filters.query}%`),
              ilike(questions.internalSlug, `%${filters.query}%`),
              ilike(skills.title, `%${filters.query}%`),
            )
          : undefined,
        filters.difficulty
          ? eq(questionVersions.difficulty, filters.difficulty)
          : undefined,
        filters.questionType
          ? eq(questionVersions.questionType, filters.questionType)
          : undefined,
        filters.skillCode ? eq(skills.code, filters.skillCode) : undefined,
      ),
    )
    .orderBy(desc(questionVersions.createdAt), desc(questionVersions.version))
    .limit(200);

  const versionIds = rows.map((row) => row.versionId);
  const [decisionRows, validationRows, sourceRows, skillRows] =
    await Promise.all([
      versionIds.length
        ? database
            .select({
              questionVersionId: reviewDecisions.questionVersionId,
              decision: reviewDecisions.decision,
              decidedAt: reviewDecisions.decidedAt,
            })
            .from(reviewDecisions)
            .where(inArray(reviewDecisions.questionVersionId, versionIds))
            .orderBy(desc(reviewDecisions.decidedAt))
        : [],
      versionIds.length
        ? database
            .select({
              questionVersionId: validationRuns.questionVersionId,
              key: validatorRules.key,
              outcome: validationRuns.outcome,
              executedAt: validationRuns.executedAt,
            })
            .from(validationRuns)
            .innerJoin(
              validatorRules,
              eq(validatorRules.id, validationRuns.validatorRuleId),
            )
            .where(inArray(validationRuns.questionVersionId, versionIds))
            .orderBy(desc(validationRuns.executedAt))
        : [],
      versionIds.length
        ? database
            .select({
              questionVersionId: questionVersionSources.questionVersionId,
            })
            .from(questionVersionSources)
            .where(
              inArray(questionVersionSources.questionVersionId, versionIds),
            )
        : [],
      database
        .select({ code: skills.code, title: skills.title })
        .from(skills)
        .where(eq(skills.active, true))
        .orderBy(skills.title),
    ]);

  const latestDecision = new Map<string, (typeof decisionRows)[number]>();
  for (const decision of decisionRows) {
    if (!latestDecision.has(decision.questionVersionId)) {
      latestDecision.set(decision.questionVersionId, decision);
    }
  }

  const latestValidationByVersion = new Map<string, Map<string, string>>();
  for (const validation of validationRows) {
    const byKey =
      latestValidationByVersion.get(validation.questionVersionId) ?? new Map();
    if (!byKey.has(validation.key))
      byKey.set(validation.key, validation.outcome);
    latestValidationByVersion.set(validation.questionVersionId, byKey);
  }

  const provenanceCount = new Map<string, number>();
  for (const source of sourceRows) {
    provenanceCount.set(
      source.questionVersionId,
      (provenanceCount.get(source.questionVersionId) ?? 0) + 1,
    );
  }

  const items = rows
    .map((row) => {
      const decision =
        latestDecision.get(row.versionId)?.decision ?? "UNREVIEWED";
      const passingValidatorCount = [
        ...(latestValidationByVersion.get(row.versionId)?.values() ?? []),
      ].filter((outcome) => outcome === "PASS").length;

      return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        latestDecision: decision,
        passingValidatorCount,
        requiredValidatorCount: REQUIRED_PUBLICATION_VALIDATORS.length,
        provenanceCount: provenanceCount.get(row.versionId) ?? 0,
      };
    })
    .filter(
      (row) =>
        !filters.reviewStatus || row.latestDecision === filters.reviewStatus,
    );

  return {
    items,
    skills: skillRows,
    summary: {
      total: items.length,
      unreviewed: items.filter((item) => item.latestDecision === "UNREVIEWED")
        .length,
      needsRevision: items.filter(
        (item) => item.latestDecision === "NEEDS_REVISION",
      ).length,
      approved: items.filter((item) => item.latestDecision === "APPROVED")
        .length,
    },
  };
}

export async function getQuestionReviewDetail(versionId: string) {
  await connection();
  requireReviewer();
  const database = getDatabase();

  const [question] = await database
    .select({
      versionId: questionVersions.id,
      questionId: questionVersions.questionId,
      version: questionVersions.version,
      slug: questions.internalSlug,
      lifecycle: questions.lifecycle,
      prompt: questionVersions.prompt,
      stimulus: questionVersions.stimulus,
      choices: questionVersions.choices,
      answerSpec: questionVersions.answerSpec,
      explanation: questionVersions.explanation,
      distractorRationales: questionVersions.distractorRationales,
      verificationSpec: questionVersions.verificationSpec,
      skillCode: skills.code,
      skillTitle: skills.title,
      primarySkillId: questionVersions.primarySkillId,
      learningObjective: questionVersions.learningObjective,
      difficulty: questionVersions.difficulty,
      difficultyRationale: questionVersions.difficultyRationale,
      estimatedSeconds: questionVersions.estimatedSeconds,
      calculatorPolicy: questionVersions.calculatorPolicy,
      commonMisconceptions: questionVersions.commonMisconceptions,
      questionType: questionVersions.questionType,
      authoringMode: questionVersions.authoringMode,
      authorId: questionVersions.authorId,
      generationRunId: questionVersions.generationRunId,
      generationProvider: generationRuns.provider,
      generationModel: generationRuns.model,
      generationPromptHash: generationRuns.promptHash,
      generationTemplateKey: generationTemplates.templateKey,
      generationTemplateVersion: generationTemplates.version,
      provenanceSummary: questionVersions.provenanceSummary,
      createdAt: questionVersions.createdAt,
    })
    .from(questionVersions)
    .innerJoin(questions, eq(questions.id, questionVersions.questionId))
    .innerJoin(skills, eq(skills.id, questionVersions.primarySkillId))
    .leftJoin(
      generationRuns,
      eq(generationRuns.id, questionVersions.generationRunId),
    )
    .leftJoin(
      generationTemplates,
      eq(generationTemplates.id, generationRuns.templateId),
    )
    .where(eq(questionVersions.id, versionId))
    .limit(1);

  if (!question) return undefined;

  const [sources, validations, decisions, feedback, versions, publications] =
    await Promise.all([
      database
        .select({
          id: sourceArtifacts.id,
          title: sourceArtifacts.title,
          publisher: sourceArtifacts.publisher,
          canonicalUrl: sourceArtifacts.canonicalUrl,
          decision: sourceArtifacts.decision,
          allowModelInput: sourceArtifacts.allowModelInput,
          relationship: questionVersionSources.relationship,
          transformationNotes: questionVersionSources.transformationNotes,
        })
        .from(questionVersionSources)
        .innerJoin(
          sourceArtifacts,
          eq(sourceArtifacts.id, questionVersionSources.sourceArtifactId),
        )
        .where(eq(questionVersionSources.questionVersionId, versionId)),
      database
        .select({
          id: validationRuns.id,
          key: validatorRules.key,
          version: validatorRules.version,
          blocksPublication: validatorRules.blocksPublication,
          outcome: validationRuns.outcome,
          failureCode: validationRuns.failureCode,
          evidence: validationRuns.evidence,
          executedAt: validationRuns.executedAt,
        })
        .from(validationRuns)
        .innerJoin(
          validatorRules,
          eq(validatorRules.id, validationRuns.validatorRuleId),
        )
        .where(eq(validationRuns.questionVersionId, versionId))
        .orderBy(desc(validationRuns.executedAt)),
      database
        .select()
        .from(reviewDecisions)
        .where(eq(reviewDecisions.questionVersionId, versionId))
        .orderBy(desc(reviewDecisions.decidedAt)),
      database
        .select()
        .from(reviewerFeedback)
        .where(eq(reviewerFeedback.questionVersionId, versionId))
        .orderBy(desc(reviewerFeedback.createdAt)),
      database
        .select({
          id: questionVersions.id,
          version: questionVersions.version,
          createdAt: questionVersions.createdAt,
        })
        .from(questionVersions)
        .where(eq(questionVersions.questionId, question.questionId))
        .orderBy(desc(questionVersions.version)),
      database
        .select()
        .from(questionPublications)
        .where(eq(questionPublications.questionId, question.questionId))
        .orderBy(desc(questionPublications.publishedAt)),
    ]);

  const latestValidationByKey: Record<
    string,
    "PASS" | "FAIL" | "WARNING" | "ERROR"
  > = {};
  for (const validation of validations) {
    if (!(validation.key in latestValidationByKey)) {
      latestValidationByKey[validation.key] = validation.outcome;
    }
  }

  const publicationGate = evaluatePublicationGate({
    lifecycle: question.lifecycle,
    provenanceCount: sources.length,
    latestReviewDecision: decisions[0]?.decision,
    latestValidationByKey,
  });
  const publicationReadiness = evaluatePublicationGate({
    lifecycle: "ACTIVE",
    provenanceCount: sources.length,
    latestReviewDecision: decisions[0]?.decision,
    latestValidationByKey,
  });
  const serializedPublications = publications.map((item) => ({
    ...item,
    publishedAt: item.publishedAt.toISOString(),
    retiredAt: item.retiredAt?.toISOString() ?? null,
  }));

  return {
    ...question,
    createdAt: question.createdAt.toISOString(),
    sources,
    validations: validations.map((item) => ({
      ...item,
      executedAt: item.executedAt.toISOString(),
    })),
    decisions: decisions.map((item) => ({
      ...item,
      decidedAt: item.decidedAt.toISOString(),
    })),
    feedback: feedback.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      resolvedAt: item.resolvedAt?.toISOString() ?? null,
    })),
    versions: versions.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    publications: serializedPublications,
    currentPublication:
      serializedPublications.find((item) => item.retiredAt === null) ?? null,
    publicationGate,
    publicationReadiness,
  };
}
