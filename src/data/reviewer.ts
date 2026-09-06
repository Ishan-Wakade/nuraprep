import "server-only";

import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { connection } from "next/server";

import { getDatabase } from "@/db/client";
import {
  generationRuns,
  generationTemplates,
  examSpecifications,
  improvementProposalDecisions,
  improvementProposalEvidence,
  improvementProposals,
  learnerProfiles,
  learnerQuestionReportEvents,
  learnerQuestionReports,
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
  REVIEWER_PUBLICATION_VALIDATORS,
} from "@/lib/questions/validation";

export type ReviewQueueFilters = {
  query?: string;
  difficulty?: (typeof questionVersions.difficulty.enumValues)[number];
  questionType?: (typeof questionVersions.questionType.enumValues)[number];
  reviewStatus?:
    "UNREVIEWED" | (typeof reviewDecisions.decision.enumValues)[number];
  skillCode?: string;
};

export type FeedbackOverviewFilters = {
  query?: string;
  category?: (typeof reviewerFeedback.category.enumValues)[number];
  status?: (typeof reviewerFeedback.status.enumValues)[number];
  source?: "LEARNER" | "REVIEWER";
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
  const [
    decisionRows,
    validationRows,
    sourceRows,
    learnerReportRows,
    skillRows,
    coverageRows,
    [examSpecification],
  ] = await Promise.all([
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
          .where(
            and(
              inArray(validationRuns.questionVersionId, versionIds),
              eq(validatorRules.active, true),
            ),
          )
          .orderBy(desc(validationRuns.executedAt))
      : [],
    versionIds.length
      ? database
          .select({
            questionVersionId: questionVersionSources.questionVersionId,
          })
          .from(questionVersionSources)
          .where(inArray(questionVersionSources.questionVersionId, versionIds))
      : [],
    versionIds.length
      ? database
          .select({
            id: learnerQuestionReports.id,
            questionVersionId: learnerQuestionReports.questionVersionId,
          })
          .from(learnerQuestionReports)
          .where(inArray(learnerQuestionReports.questionVersionId, versionIds))
      : [],
    database
      .select({ code: skills.code, title: skills.title })
      .from(skills)
      .where(eq(skills.active, true))
      .orderBy(skills.title),
    database.execute<{
      skill_id: string;
      skill_code: string;
      skill_title: string;
      candidate_families: number;
      published_families: number;
      published_formats: string[];
    }>(sql`
      WITH leaf_skills AS (
        SELECT skill.id, skill.code, skill.title
        FROM skills AS skill
        WHERE skill.active = true
          AND skill.section = 'MATH'
          AND NOT EXISTS (
            SELECT 1
            FROM skills AS child
            WHERE child.parent_skill_id = skill.id
              AND child.active = true
          )
      ), candidate_counts AS (
        SELECT version.primary_skill_id AS skill_id,
               count(DISTINCT version.question_id)::int AS candidate_families
        FROM question_versions AS version
        GROUP BY version.primary_skill_id
      ), published_counts AS (
        SELECT version.primary_skill_id AS skill_id,
               count(DISTINCT publication.question_id)::int AS published_families,
               array_agg(DISTINCT version.question_type::text) AS published_formats
        FROM question_publications AS publication
        INNER JOIN question_versions AS version
          ON version.id = publication.question_version_id
        WHERE publication.retired_at IS NULL
        GROUP BY version.primary_skill_id
      )
      SELECT leaf.id AS skill_id,
             leaf.code AS skill_code,
             leaf.title AS skill_title,
             coalesce(candidate.candidate_families, 0)::int AS candidate_families,
             coalesce(published.published_families, 0)::int AS published_families,
             coalesce(published.published_formats, ARRAY[]::text[]) AS published_formats
      FROM leaf_skills AS leaf
      LEFT JOIN candidate_counts AS candidate ON candidate.skill_id = leaf.id
      LEFT JOIN published_counts AS published ON published.skill_id = leaf.id
      ORDER BY coalesce(published.published_families, 0),
               coalesce(candidate.candidate_families, 0), leaf.title
    `),
    database
      .select({ totalQuestions: examSpecifications.totalQuestions })
      .from(examSpecifications)
      .where(
        and(
          eq(examSpecifications.section, "MATH"),
          eq(examSpecifications.verificationStatus, "VERIFIED"),
        ),
      )
      .orderBy(desc(examSpecifications.lastVerifiedAt))
      .limit(1),
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

  const learnerReportCount = new Map<string, number>();
  for (const report of learnerReportRows) {
    learnerReportCount.set(
      report.questionVersionId,
      (learnerReportCount.get(report.questionVersionId) ?? 0) + 1,
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
        learnerReportCount: learnerReportCount.get(row.versionId) ?? 0,
      };
    })
    .filter(
      (row) =>
        !filters.reviewStatus || row.latestDecision === filters.reviewStatus,
    );

  return {
    items,
    skills: skillRows,
    bankCoverage: {
      rows: coverageRows.rows.map((row) => ({
        skillId: row.skill_id,
        skillCode: row.skill_code,
        skillTitle: row.skill_title,
        candidateFamilies: row.candidate_families,
        publishedFamilies: row.published_families,
        publishedFormats: row.published_formats,
      })),
      publishedFamilies: coverageRows.rows.reduce(
        (total, row) => total + row.published_families,
        0,
      ),
      questionTarget: examSpecification?.totalQuestions ?? 0,
      skillsWithoutPublishedItems: coverageRows.rows.filter(
        (row) => row.published_families === 0,
      ).length,
    },
    summary: {
      total: items.length,
      unreviewed: items.filter((item) => item.latestDecision === "UNREVIEWED")
        .length,
      needsRevision: items.filter(
        (item) => item.latestDecision === "NEEDS_REVISION",
      ).length,
      approved: items.filter((item) => item.latestDecision === "APPROVED")
        .length,
      learnerReports: items.reduce(
        (total, item) => total + item.learnerReportCount,
        0,
      ),
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
      misconceptionRules: questionVersions.misconceptionRules,
      tutorGuidance: questionVersions.tutorGuidance,
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

  const [
    sources,
    validations,
    decisions,
    feedback,
    versions,
    publications,
    learnerReports,
    approvedTemplates,
    regenerationRuns,
    activeReviewerValidatorRows,
  ] = await Promise.all([
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
        active: validatorRules.active,
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
    database
      .select({
        id: learnerQuestionReports.id,
        attemptId: learnerQuestionReports.attemptId,
        category: learnerQuestionReports.category,
        details: learnerQuestionReports.details,
        learnerName: learnerProfiles.displayName,
        createdAt: learnerQuestionReports.createdAt,
      })
      .from(learnerQuestionReports)
      .innerJoin(
        learnerProfiles,
        eq(learnerProfiles.id, learnerQuestionReports.learnerId),
      )
      .where(eq(learnerQuestionReports.questionVersionId, versionId))
      .orderBy(desc(learnerQuestionReports.createdAt)),
    database
      .select({
        id: generationTemplates.id,
        templateKey: generationTemplates.templateKey,
        version: generationTemplates.version,
        difficulty: generationTemplates.difficulty,
      })
      .from(generationTemplates)
      .where(
        and(
          eq(generationTemplates.status, "APPROVED"),
          eq(generationTemplates.targetSkillId, question.primarySkillId),
          eq(generationTemplates.questionType, question.questionType),
        ),
      )
      .orderBy(desc(generationTemplates.version)),
    database
      .select({
        id: generationRuns.id,
        requestKind: generationRuns.requestKind,
        status: generationRuns.status,
        provider: generationRuns.provider,
        model: generationRuns.model,
        maxCostMicros: generationRuns.maxCostMicros,
        failureCode: generationRuns.failureCode,
        cancelledBy: generationRuns.cancelledBy,
        cancellationReason: generationRuns.cancellationReason,
        startedAt: generationRuns.startedAt,
        completedAt: generationRuns.completedAt,
      })
      .from(generationRuns)
      .where(eq(generationRuns.sourceQuestionVersionId, versionId))
      .orderBy(desc(generationRuns.startedAt)),
    database
      .select({
        key: validatorRules.key,
        version: validatorRules.version,
        description: validatorRules.description,
      })
      .from(validatorRules)
      .where(
        and(
          eq(validatorRules.active, true),
          inArray(validatorRules.key, [...REVIEWER_PUBLICATION_VALIDATORS]),
        ),
      )
      .orderBy(validatorRules.key, desc(validatorRules.version)),
  ]);

  const latestActiveRuleByKey = new Map<
    string,
    (typeof activeReviewerValidatorRows)[number]
  >();
  for (const rule of activeReviewerValidatorRows) {
    if (!latestActiveRuleByKey.has(rule.key)) {
      latestActiveRuleByKey.set(rule.key, rule);
    }
  }
  const activeReviewerValidators = REVIEWER_PUBLICATION_VALIDATORS.flatMap(
    (key) => {
      const rule = latestActiveRuleByKey.get(key);
      return rule ? [rule] : [];
    },
  );

  const learnerReportEvents = learnerReports.length
    ? await database
        .select()
        .from(learnerQuestionReportEvents)
        .where(
          inArray(
            learnerQuestionReportEvents.reportId,
            learnerReports.map((report) => report.id),
          ),
        )
        .orderBy(
          desc(learnerQuestionReportEvents.createdAt),
          desc(learnerQuestionReportEvents.id),
        )
    : [];
  const eventsByReport = new Map<
    string,
    (typeof learnerReportEvents)[number][]
  >();
  for (const event of learnerReportEvents) {
    const events = eventsByReport.get(event.reportId) ?? [];
    events.push(event);
    eventsByReport.set(event.reportId, events);
  }

  const latestValidationByKey: Record<
    string,
    "PASS" | "FAIL" | "WARNING" | "ERROR"
  > = {};
  for (const validation of validations) {
    if (validation.active && !(validation.key in latestValidationByKey)) {
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
    learnerReports: learnerReports.map((report) => {
      const events = eventsByReport.get(report.id) ?? [];
      return {
        ...report,
        createdAt: report.createdAt.toISOString(),
        currentStatus: events[0]?.status ?? ("OPEN" as const),
        events: events.map((event) => ({
          ...event,
          createdAt: event.createdAt.toISOString(),
        })),
      };
    }),
    versions: versions.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    publications: serializedPublications,
    currentPublication:
      serializedPublications.find((item) => item.retiredAt === null) ?? null,
    approvedTemplates,
    activeReviewerValidators,
    regenerationRuns: regenerationRuns.map((run) => ({
      ...run,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    })),
    publicationGate,
    publicationReadiness,
  };
}

export async function getFeedbackOverview(filters: FeedbackOverviewFilters) {
  await connection();
  requireReviewer();
  const database = getDatabase();

  const [reviewerRows, learnerRows, proposalRows] = await Promise.all([
    database
      .select({
        id: reviewerFeedback.id,
        questionVersionId: reviewerFeedback.questionVersionId,
        category: reviewerFeedback.category,
        details: reviewerFeedback.feedback,
        recurringIssueCode: reviewerFeedback.recurringIssueCode,
        status: reviewerFeedback.status,
        createdAt: reviewerFeedback.createdAt,
        slug: questions.internalSlug,
        prompt: questionVersions.prompt,
        skillTitle: skills.title,
      })
      .from(reviewerFeedback)
      .innerJoin(
        questionVersions,
        eq(questionVersions.id, reviewerFeedback.questionVersionId),
      )
      .innerJoin(questions, eq(questions.id, questionVersions.questionId))
      .innerJoin(skills, eq(skills.id, questionVersions.primarySkillId))
      .orderBy(desc(reviewerFeedback.createdAt))
      .limit(200),
    database
      .select({
        id: learnerQuestionReports.id,
        questionVersionId: learnerQuestionReports.questionVersionId,
        category: learnerQuestionReports.category,
        details: learnerQuestionReports.details,
        createdAt: learnerQuestionReports.createdAt,
        slug: questions.internalSlug,
        prompt: questionVersions.prompt,
        skillTitle: skills.title,
      })
      .from(learnerQuestionReports)
      .innerJoin(
        questionVersions,
        eq(questionVersions.id, learnerQuestionReports.questionVersionId),
      )
      .innerJoin(questions, eq(questions.id, questionVersions.questionId))
      .innerJoin(skills, eq(skills.id, questionVersions.primarySkillId))
      .orderBy(desc(learnerQuestionReports.createdAt))
      .limit(200),
    database
      .select({
        id: improvementProposals.id,
        patternKey: improvementProposals.patternKey,
        category: improvementProposals.category,
        target: improvementProposals.target,
        title: improvementProposals.title,
        problemSummary: improvementProposals.problemSummary,
        proposedChange: improvementProposals.proposedChange,
        regressionPlan: improvementProposals.regressionPlan,
        createdBy: improvementProposals.createdBy,
        createdAt: improvementProposals.createdAt,
      })
      .from(improvementProposals)
      .orderBy(desc(improvementProposals.createdAt))
      .limit(100),
  ]);

  const proposalIds = proposalRows.map((proposal) => proposal.id);
  const [proposalEvidenceRows, proposalDecisionRows] = proposalIds.length
    ? await Promise.all([
        database
          .select({
            id: improvementProposalEvidence.id,
            proposalId: improvementProposalEvidence.proposalId,
            evidenceKey: improvementProposalEvidence.evidenceKey,
            source: improvementProposalEvidence.sourceKind,
            questionVersionId: improvementProposalEvidence.questionVersionId,
            details: improvementProposalEvidence.detailsSnapshot,
          })
          .from(improvementProposalEvidence)
          .where(inArray(improvementProposalEvidence.proposalId, proposalIds))
          .orderBy(improvementProposalEvidence.evidenceKey)
          .limit(2_000),
        database
          .select({
            proposalId: improvementProposalDecisions.proposalId,
            decision: improvementProposalDecisions.decision,
            notes: improvementProposalDecisions.notes,
            decidedBy: improvementProposalDecisions.decidedBy,
            decidedAt: improvementProposalDecisions.decidedAt,
          })
          .from(improvementProposalDecisions)
          .where(inArray(improvementProposalDecisions.proposalId, proposalIds)),
      ])
    : [[], []];

  const learnerEvents = learnerRows.length
    ? await database
        .select({
          reportId: learnerQuestionReportEvents.reportId,
          status: learnerQuestionReportEvents.status,
          createdAt: learnerQuestionReportEvents.createdAt,
          id: learnerQuestionReportEvents.id,
        })
        .from(learnerQuestionReportEvents)
        .where(
          inArray(
            learnerQuestionReportEvents.reportId,
            learnerRows.map((row) => row.id),
          ),
        )
        .orderBy(
          desc(learnerQuestionReportEvents.createdAt),
          desc(learnerQuestionReportEvents.id),
        )
    : [];
  const latestLearnerStatus = new Map<
    string,
    (typeof learnerEvents)[number]["status"]
  >();
  for (const event of learnerEvents) {
    if (!latestLearnerStatus.has(event.reportId)) {
      latestLearnerStatus.set(event.reportId, event.status);
    }
  }

  const allItems = [
    ...reviewerRows.map((row) => ({ ...row, source: "REVIEWER" as const })),
    ...learnerRows.map((row) => ({
      ...row,
      source: "LEARNER" as const,
      status: latestLearnerStatus.get(row.id) ?? ("OPEN" as const),
      recurringIssueCode: null,
    })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  const normalizedQuery = filters.query?.toLocaleLowerCase("en-US");
  const items = allItems.filter(
    (item) =>
      (!filters.source || item.source === filters.source) &&
      (!filters.category || item.category === filters.category) &&
      (!filters.status || item.status === filters.status) &&
      (!normalizedQuery ||
        [
          item.details,
          item.recurringIssueCode,
          item.slug,
          item.prompt,
          item.skillTitle,
        ].some((value) =>
          value?.toLocaleLowerCase("en-US").includes(normalizedQuery),
        )),
  );

  const patterns = new Map<
    string,
    {
      key: string;
      category: (typeof items)[number]["category"];
      count: number;
      openCount: number;
      learnerCount: number;
      reviewerCount: number;
    }
  >();
  for (const item of items) {
    const key = item.recurringIssueCode || item.category;
    const pattern = patterns.get(key) ?? {
      key,
      category: item.category,
      count: 0,
      openCount: 0,
      learnerCount: 0,
      reviewerCount: 0,
    };
    pattern.count += 1;
    if (item.status === "OPEN") pattern.openCount += 1;
    if (item.source === "LEARNER") pattern.learnerCount += 1;
    else pattern.reviewerCount += 1;
    patterns.set(key, pattern);
  }

  const evidenceByProposal = new Map<
    string,
    Array<{
      id: string;
      source: "LEARNER" | "REVIEWER";
      questionVersionId: string;
      details: string;
    }>
  >();
  for (const evidence of proposalEvidenceRows) {
    if (!["LEARNER", "REVIEWER"].includes(evidence.source)) continue;
    const normalized = {
      id: evidence.id,
      source: evidence.source as "LEARNER" | "REVIEWER",
      questionVersionId: evidence.questionVersionId,
      details: evidence.details,
    };
    evidenceByProposal.set(evidence.proposalId, [
      ...(evidenceByProposal.get(evidence.proposalId) ?? []),
      normalized,
    ]);
  }
  const decisionByProposal = new Map(
    proposalDecisionRows.map((decision) => [
      decision.proposalId,
      {
        ...decision,
        decidedAt: decision.decidedAt.toISOString(),
      },
    ]),
  );

  return {
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    patterns: [...patterns.values()].sort(
      (left, right) =>
        right.count - left.count || left.key.localeCompare(right.key),
    ),
    proposals: proposalRows.map((proposal) => ({
      ...proposal,
      createdAt: proposal.createdAt.toISOString(),
      evidence: evidenceByProposal.get(proposal.id) ?? [],
      decision: decisionByProposal.get(proposal.id) ?? null,
    })),
    summary: {
      total: items.length,
      open: items.filter((item) => item.status === "OPEN").length,
      learner: items.filter((item) => item.source === "LEARNER").length,
      reviewer: items.filter((item) => item.source === "REVIEWER").length,
    },
  };
}
