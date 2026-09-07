import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { connection } from "next/server";
import { z } from "zod";

import { ensureLearnerProfile } from "@/data/practice";
import { getDatabase } from "@/db/client";
import {
  attempts,
  examSpecifications,
  learnerProfiles,
  practiceSessionItems,
  practiceSessions,
  questionPublications,
  questions,
  questionVersions,
  scoreEstimates,
  skills,
  studyPlanItems,
  studyPlans,
} from "@/db/schema";
import { requireLearner } from "@/lib/auth/learner";
import { learnerSafePublicationCondition } from "@/lib/questions/publication";
import {
  estimateMathReadiness,
  type ScoreAttemptEvidence,
} from "@/lib/score/estimator";

const domainSkills = alias(skills, "score_domain_skills");

export async function getScoreDashboardData(selectedEstimateId?: string) {
  await connection();
  const identity = await requireLearner();
  const learner = await ensureLearnerProfile(identity);
  const database = getDatabase();
  const estimateConditions = [eq(scoreEstimates.learnerId, learner.id)];
  const parsedEstimateId = z.uuid().safeParse(selectedEstimateId);
  if (parsedEstimateId.success) {
    estimateConditions.push(eq(scoreEstimates.id, parsedEstimateId.data));
  }

  const [estimate] = await database
    .select()
    .from(scoreEstimates)
    .where(and(...estimateConditions))
    .orderBy(desc(scoreEstimates.createdAt))
    .limit(1);
  const history = await database
    .select({
      id: scoreEstimates.id,
      estimateBasisPoints: scoreEstimates.estimateBasisPoints,
      lowerBasisPoints: scoreEstimates.lowerBasisPoints,
      upperBasisPoints: scoreEstimates.upperBasisPoints,
      evidenceLevel: scoreEstimates.evidenceLevel,
      evidenceCount: scoreEstimates.evidenceCount,
      modelVersion: scoreEstimates.modelVersion,
      createdAt: scoreEstimates.createdAt,
    })
    .from(scoreEstimates)
    .where(eq(scoreEstimates.learnerId, learner.id))
    .orderBy(desc(scoreEstimates.createdAt))
    .limit(10);

  if (!estimate) {
    return { identity, estimate: null, plan: null, history };
  }

  const [plan] = await database
    .select()
    .from(studyPlans)
    .where(
      and(
        eq(studyPlans.learnerId, learner.id),
        eq(studyPlans.scoreEstimateId, estimate.id),
      ),
    )
    .limit(1);
  const items = plan
    ? await database
        .select({
          id: studyPlanItems.id,
          skillCode: skills.code,
          skillTitle: skills.title,
          priority: studyPlanItems.priority,
          status: studyPlanItems.status,
          targetMinutes: studyPlanItems.targetMinutes,
          rationale: studyPlanItems.rationale,
        })
        .from(studyPlanItems)
        .innerJoin(skills, eq(skills.id, studyPlanItems.skillId))
        .where(eq(studyPlanItems.studyPlanId, plan.id))
        .orderBy(studyPlanItems.priority)
    : [];

  return {
    identity,
    estimate: {
      ...estimate,
      createdAt: estimate.createdAt.toISOString(),
    },
    plan: plan
      ? {
          ...plan,
          createdAt: plan.createdAt.toISOString(),
          updatedAt: plan.updatedAt.toISOString(),
          items,
        }
      : null,
    history: history.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function calculateLearnerScoreEstimate(learnerId: string) {
  const database = getDatabase();
  const [specification] = await database
    .select({
      domainDistribution: examSpecifications.domainDistribution,
    })
    .from(examSpecifications)
    .where(
      and(
        eq(examSpecifications.section, "MATH"),
        eq(examSpecifications.verificationStatus, "VERIFIED"),
      ),
    )
    .orderBy(desc(examSpecifications.lastVerifiedAt))
    .limit(1);
  if (!specification) {
    throw new Error("No verified Math exam specification is available.");
  }

  const [attemptRows, publishedSkillRows] = await Promise.all([
    database
      .select({
        sessionId: practiceSessions.id,
        questionId: questions.id,
        domainTitle: domainSkills.title,
        skillCode: skills.code,
        skillTitle: skills.title,
        difficulty: questionVersions.difficulty,
        correct: attempts.correct,
        mode: practiceSessions.mode,
        timingMode: practiceSessions.timingMode,
        sessionStatus: practiceSessions.status,
        sessionQuestionCount: practiceSessions.requestedQuestionCount,
        elapsedMilliseconds: attempts.elapsedMilliseconds,
        estimatedSeconds: questionVersions.estimatedSeconds,
        submittedAt: attempts.submittedAt,
      })
      .from(attempts)
      .innerJoin(
        practiceSessionItems,
        eq(practiceSessionItems.id, attempts.sessionItemId),
      )
      .innerJoin(
        practiceSessions,
        eq(practiceSessions.id, practiceSessionItems.sessionId),
      )
      .innerJoin(
        learnerProfiles,
        eq(learnerProfiles.id, practiceSessions.learnerId),
      )
      .innerJoin(
        questionVersions,
        eq(questionVersions.id, practiceSessionItems.questionVersionId),
      )
      .innerJoin(questions, eq(questions.id, questionVersions.questionId))
      .innerJoin(skills, eq(skills.id, questionVersions.primarySkillId))
      .innerJoin(domainSkills, eq(domainSkills.id, skills.parentSkillId))
      .where(
        and(eq(learnerProfiles.id, learnerId), eq(questions.section, "MATH")),
      )
      .orderBy(desc(attempts.submittedAt)),
    database
      .select({
        skillId: skills.id,
        skillCode: skills.code,
        skillTitle: skills.title,
      })
      .from(questionPublications)
      .innerJoin(
        questionVersions,
        eq(questionVersions.id, questionPublications.questionVersionId),
      )
      .innerJoin(questions, eq(questions.id, questionPublications.questionId))
      .innerJoin(skills, eq(skills.id, questionVersions.primarySkillId))
      .where(
        and(
          isNull(questionPublications.retiredAt),
          eq(questions.lifecycle, "ACTIVE"),
          eq(questions.section, "MATH"),
          learnerSafePublicationCondition(),
        ),
      ),
  ]);
  const answeredBySession = new Map<string, number>();
  for (const attempt of attemptRows) {
    answeredBySession.set(
      attempt.sessionId,
      (answeredBySession.get(attempt.sessionId) ?? 0) + 1,
    );
  }
  const evidence: ScoreAttemptEvidence[] = attemptRows.map((attempt) => ({
    sessionId: attempt.sessionId,
    questionId: attempt.questionId,
    domainTitle: attempt.domainTitle,
    skillCode: attempt.skillCode,
    skillTitle: attempt.skillTitle,
    difficulty: attempt.difficulty,
    correct: attempt.correct,
    mode: attempt.mode,
    timingMode: attempt.timingMode,
    sessionCompleted: attempt.sessionStatus === "COMPLETED",
    sessionAnsweredCount: answeredBySession.get(attempt.sessionId) ?? 0,
    sessionQuestionCount: attempt.sessionQuestionCount,
    elapsedMilliseconds: attempt.elapsedMilliseconds,
    estimatedSeconds: attempt.estimatedSeconds,
    submittedAt: attempt.submittedAt,
  }));
  const uniqueSkills = [
    ...new Map(
      publishedSkillRows.map((skill) => [skill.skillCode, skill]),
    ).values(),
  ];
  return {
    result: estimateMathReadiness({
      attempts: evidence,
      domainDistribution: specification.domainDistribution,
      availableSkills: uniqueSkills,
    }),
    skillIds: new Map(
      uniqueSkills.map((skill) => [skill.skillCode, skill.skillId]),
    ),
  };
}
