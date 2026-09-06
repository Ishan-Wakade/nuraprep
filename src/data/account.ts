import "server-only";

import { asc, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  accountAuditEvents,
  attempts,
  authSessions,
  learnerProfiles,
  learnerQuestionReportEvents,
  learnerQuestionReports,
  practiceSessionItems,
  practiceSessions,
  questionVersions,
  scoreEstimates,
  skills,
  studyPlanItems,
  studyPlans,
  tutorInteractions,
} from "@/db/schema";
import type { LearnerIdentity } from "@/lib/auth/learner";

export async function buildLearnerDataExport(identity: LearnerIdentity) {
  const database = getDatabase();
  const [profile] = await database
    .select({
      id: learnerProfiles.id,
      authUserId: learnerProfiles.authUserId,
      displayName: learnerProfiles.displayName,
      email: learnerProfiles.email,
      createdAt: learnerProfiles.createdAt,
      updatedAt: learnerProfiles.updatedAt,
    })
    .from(learnerProfiles)
    .where(eq(learnerProfiles.authSubject, identity.subject))
    .limit(1);

  const accountSessions = identity.authUserId
    ? await database
        .select({
          id: authSessions.id,
          createdAt: authSessions.createdAt,
          updatedAt: authSessions.updatedAt,
          expiresAt: authSessions.expiresAt,
          ipAddress: authSessions.ipAddress,
          userAgent: authSessions.userAgent,
        })
        .from(authSessions)
        .where(eq(authSessions.userId, identity.authUserId))
        .orderBy(asc(authSessions.createdAt))
    : [];
  const auditEvents = identity.authUserId
    ? await database
        .select({
          eventType: accountAuditEvents.eventType,
          createdAt: accountAuditEvents.createdAt,
        })
        .from(accountAuditEvents)
        .where(eq(accountAuditEvents.userId, identity.authUserId))
        .orderBy(asc(accountAuditEvents.createdAt))
    : [];

  if (!profile) {
    return {
      exportVersion: "nuraprep-learner-export-v1",
      generatedAt: new Date(),
      account: {
        displayName: identity.displayName,
        email: identity.email,
        mode: identity.mode,
      },
      profile: null,
      accountSessions,
      accountAuditEvents: auditEvents,
      practiceSessions: [],
      practiceItems: [],
      tutorInteractions: [],
      questionReports: [],
      questionReportStatusHistory: [],
      scoreEstimates: [],
      studyPlans: [],
      studyPlanItems: [],
    };
  }

  const [sessionRows, reportRows, estimateRows, planRows] = await Promise.all([
    database
      .select({
        id: practiceSessions.id,
        mode: practiceSessions.mode,
        status: practiceSessions.status,
        timingMode: practiceSessions.timingMode,
        requestedQuestionCount: practiceSessions.requestedQuestionCount,
        filters: practiceSessions.filters,
        timeLimitSeconds: practiceSessions.timeLimitSeconds,
        startedAt: practiceSessions.startedAt,
        endedAt: practiceSessions.endedAt,
      })
      .from(practiceSessions)
      .where(eq(practiceSessions.learnerId, profile.id))
      .orderBy(asc(practiceSessions.startedAt)),
    database
      .select({
        id: learnerQuestionReports.id,
        questionVersionId: learnerQuestionReports.questionVersionId,
        attemptId: learnerQuestionReports.attemptId,
        category: learnerQuestionReports.category,
        details: learnerQuestionReports.details,
        createdAt: learnerQuestionReports.createdAt,
      })
      .from(learnerQuestionReports)
      .where(eq(learnerQuestionReports.learnerId, profile.id))
      .orderBy(asc(learnerQuestionReports.createdAt)),
    database
      .select({
        id: scoreEstimates.id,
        modelVersion: scoreEstimates.modelVersion,
        estimateBasisPoints: scoreEstimates.estimateBasisPoints,
        lowerBasisPoints: scoreEstimates.lowerBasisPoints,
        upperBasisPoints: scoreEstimates.upperBasisPoints,
        evidenceLevel: scoreEstimates.evidenceLevel,
        evidenceCount: scoreEstimates.evidenceCount,
        effectiveEvidenceMilli: scoreEstimates.effectiveEvidenceMilli,
        featureSnapshot: scoreEstimates.featureSnapshot,
        caveats: scoreEstimates.caveats,
        createdAt: scoreEstimates.createdAt,
      })
      .from(scoreEstimates)
      .where(eq(scoreEstimates.learnerId, profile.id))
      .orderBy(asc(scoreEstimates.createdAt)),
    database
      .select({
        id: studyPlans.id,
        scoreEstimateId: studyPlans.scoreEstimateId,
        modelVersion: studyPlans.modelVersion,
        weeklyMinutes: studyPlans.weeklyMinutes,
        learnerNotes: studyPlans.learnerNotes,
        createdAt: studyPlans.createdAt,
        updatedAt: studyPlans.updatedAt,
      })
      .from(studyPlans)
      .where(eq(studyPlans.learnerId, profile.id))
      .orderBy(asc(studyPlans.createdAt)),
  ]);

  const sessionIds = sessionRows.map((session) => session.id);
  const itemRows = sessionIds.length
    ? await database
        .select({
          id: practiceSessionItems.id,
          sessionId: practiceSessionItems.sessionId,
          questionVersionId: practiceSessionItems.questionVersionId,
          position: practiceSessionItems.position,
          selectionReason: practiceSessionItems.selectionReason,
          prompt: questionVersions.prompt,
          skillCode: skills.code,
          skillTitle: skills.title,
          attemptId: attempts.id,
          answerPayload: attempts.answerPayload,
          correct: attempts.correct,
          evaluationReason: attempts.evaluationReason,
          evaluatorVersion: attempts.evaluatorVersion,
          elapsedMilliseconds: attempts.elapsedMilliseconds,
          confidence: attempts.confidence,
          misconceptionAttributions: attempts.misconceptionAttributions,
          submittedAt: attempts.submittedAt,
        })
        .from(practiceSessionItems)
        .innerJoin(
          questionVersions,
          eq(questionVersions.id, practiceSessionItems.questionVersionId),
        )
        .innerJoin(skills, eq(skills.id, questionVersions.primarySkillId))
        .leftJoin(attempts, eq(attempts.sessionItemId, practiceSessionItems.id))
        .where(inArray(practiceSessionItems.sessionId, sessionIds))
        .orderBy(
          asc(practiceSessionItems.sessionId),
          asc(practiceSessionItems.position),
        )
    : [];
  const itemIds = itemRows.map((item) => item.id);
  const tutorRows = itemIds.length
    ? await database
        .select({
          sessionItemId: tutorInteractions.sessionItemId,
          stepIndex: tutorInteractions.stepIndex,
          stepId: tutorInteractions.stepId,
          requestedAt: tutorInteractions.requestedAt,
        })
        .from(tutorInteractions)
        .where(inArray(tutorInteractions.sessionItemId, itemIds))
        .orderBy(
          asc(tutorInteractions.sessionItemId),
          asc(tutorInteractions.stepIndex),
        )
    : [];
  const reportIds = reportRows.map((report) => report.id);
  const reportEventRows = reportIds.length
    ? await database
        .select({
          reportId: learnerQuestionReportEvents.reportId,
          status: learnerQuestionReportEvents.status,
          createdAt: learnerQuestionReportEvents.createdAt,
        })
        .from(learnerQuestionReportEvents)
        .where(inArray(learnerQuestionReportEvents.reportId, reportIds))
        .orderBy(
          asc(learnerQuestionReportEvents.reportId),
          asc(learnerQuestionReportEvents.createdAt),
        )
    : [];
  const planIds = planRows.map((plan) => plan.id);
  const planItemRows = planIds.length
    ? await database
        .select({
          studyPlanId: studyPlanItems.studyPlanId,
          priority: studyPlanItems.priority,
          status: studyPlanItems.status,
          targetMinutes: studyPlanItems.targetMinutes,
          rationale: studyPlanItems.rationale,
          skillCode: skills.code,
          skillTitle: skills.title,
          createdAt: studyPlanItems.createdAt,
          updatedAt: studyPlanItems.updatedAt,
        })
        .from(studyPlanItems)
        .innerJoin(skills, eq(skills.id, studyPlanItems.skillId))
        .where(inArray(studyPlanItems.studyPlanId, planIds))
        .orderBy(asc(studyPlanItems.studyPlanId), asc(studyPlanItems.priority))
    : [];

  return {
    exportVersion: "nuraprep-learner-export-v1",
    generatedAt: new Date(),
    account: {
      displayName: identity.displayName,
      email: identity.email,
      mode: identity.mode,
    },
    profile,
    accountSessions,
    accountAuditEvents: auditEvents,
    practiceSessions: sessionRows,
    practiceItems: itemRows,
    tutorInteractions: tutorRows,
    questionReports: reportRows,
    questionReportStatusHistory: reportEventRows,
    scoreEstimates: estimateRows,
    studyPlans: planRows,
    studyPlanItems: planItemRows,
  };
}
