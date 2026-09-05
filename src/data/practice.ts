import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { connection } from "next/server";

import { getDatabase } from "@/db/client";
import {
  attempts,
  learnerProfiles,
  practiceSessionItems,
  practiceSessions,
  questionPublications,
  questions,
  questionVersions,
  skills,
} from "@/db/schema";
import { requireLearner, type LearnerIdentity } from "@/lib/auth/learner";

export async function ensureLearnerProfile(identity: LearnerIdentity) {
  const [profile] = await getDatabase()
    .insert(learnerProfiles)
    .values({
      authSubject: identity.subject,
      displayName: identity.displayName,
    })
    .onConflictDoUpdate({
      target: learnerProfiles.authSubject,
      set: { displayName: identity.displayName, updatedAt: new Date() },
    })
    .returning();

  if (!profile) throw new Error("Failed to resolve the learner profile.");
  return profile;
}

export async function getPracticeSetupData() {
  await connection();
  const identity = requireLearner();
  const database = getDatabase();

  const [availability, recentSessions] = await Promise.all([
    database
      .select({
        skillCode: skills.code,
        skillTitle: skills.title,
        availableCount: sql<number>`count(*)::int`,
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
        ),
      )
      .groupBy(skills.code, skills.title)
      .orderBy(asc(skills.title)),
    database
      .select({
        id: practiceSessions.id,
        status: practiceSessions.status,
        timingMode: practiceSessions.timingMode,
        requestedQuestionCount: practiceSessions.requestedQuestionCount,
        startedAt: practiceSessions.startedAt,
        endedAt: practiceSessions.endedAt,
      })
      .from(practiceSessions)
      .innerJoin(
        learnerProfiles,
        eq(learnerProfiles.id, practiceSessions.learnerId),
      )
      .where(eq(learnerProfiles.authSubject, identity.subject))
      .orderBy(desc(practiceSessions.startedAt))
      .limit(5),
  ]);

  return {
    identity,
    availability,
    totalAvailable: availability.reduce(
      (total, item) => total + item.availableCount,
      0,
    ),
    recentSessions: recentSessions.map((session) => ({
      ...session,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
    })),
  };
}

export async function getPracticeSessionView(
  sessionId: string,
  requestedPosition?: number,
) {
  await connection();
  const identity = requireLearner();
  const database = getDatabase();

  const [session] = await database
    .select({
      id: practiceSessions.id,
      status: practiceSessions.status,
      timingMode: practiceSessions.timingMode,
      filters: practiceSessions.filters,
      timeLimitSeconds: practiceSessions.timeLimitSeconds,
      startedAt: practiceSessions.startedAt,
      endedAt: practiceSessions.endedAt,
      learnerName: learnerProfiles.displayName,
    })
    .from(practiceSessions)
    .innerJoin(
      learnerProfiles,
      eq(learnerProfiles.id, practiceSessions.learnerId),
    )
    .where(
      and(
        eq(practiceSessions.id, sessionId),
        eq(learnerProfiles.authSubject, identity.subject),
      ),
    )
    .limit(1);
  if (!session) return undefined;

  const rows = await database
    .select({
      itemId: practiceSessionItems.id,
      position: practiceSessionItems.position,
      selectionReason: practiceSessionItems.selectionReason,
      versionId: questionVersions.id,
      questionType: questionVersions.questionType,
      prompt: questionVersions.prompt,
      stimulus: questionVersions.stimulus,
      choices: questionVersions.choices,
      answerSpec: questionVersions.answerSpec,
      explanation: questionVersions.explanation,
      distractorRationales: questionVersions.distractorRationales,
      learningObjective: questionVersions.learningObjective,
      difficulty: questionVersions.difficulty,
      estimatedSeconds: questionVersions.estimatedSeconds,
      calculatorPolicy: questionVersions.calculatorPolicy,
      skillCode: skills.code,
      skillTitle: skills.title,
      attemptId: attempts.id,
      answerPayload: attempts.answerPayload,
      correct: attempts.correct,
      evaluationReason: attempts.evaluationReason,
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
    .where(eq(practiceSessionItems.sessionId, session.id))
    .orderBy(asc(practiceSessionItems.position));

  const firstUnanswered = rows.find((row) => !row.attemptId)?.position;
  const position =
    requestedPosition && rows.some((row) => row.position === requestedPosition)
      ? requestedPosition
      : (firstUnanswered ?? rows.at(-1)?.position ?? 1);
  const selected = rows.find((row) => row.position === position);
  if (!selected) return undefined;

  const answeredCount = rows.filter((row) => row.attemptId).length;
  const feedback = selected.attemptId
    ? {
        attemptId: selected.attemptId,
        correct: selected.correct ?? false,
        answerPayload: selected.answerPayload,
        evaluationReason: selected.evaluationReason,
        explanation: selected.explanation,
        distractorRationales: selected.distractorRationales,
        correctAnswer: formatCorrectAnswer(
          selected.answerSpec,
          selected.choices ?? [],
        ),
        elapsedMilliseconds: selected.elapsedMilliseconds ?? 0,
        confidence: selected.confidence,
        misconceptionAttributions: selected.misconceptionAttributions ?? [],
        submittedAt: selected.submittedAt?.toISOString() ?? null,
      }
    : null;

  return {
    session: {
      ...session,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      actualQuestionCount: rows.length,
      answeredCount,
      correctCount: rows.filter((row) => row.correct).length,
    },
    item: {
      itemId: selected.itemId,
      position: selected.position,
      versionId: selected.versionId,
      questionType: selected.questionType,
      prompt: selected.prompt,
      stimulus: selected.stimulus,
      choices: selected.choices,
      learningObjective: selected.learningObjective,
      difficulty: selected.difficulty,
      estimatedSeconds: selected.estimatedSeconds,
      calculatorPolicy: selected.calculatorPolicy,
      skillCode: selected.skillCode,
      skillTitle: selected.skillTitle,
      unitRequired:
        selected.answerSpec.type === "numeric" &&
        selected.answerSpec.unitRequired,
      selectionReason: selected.selectionReason,
      feedback,
    },
    positions: rows.map((row) => ({
      position: row.position,
      answered: Boolean(row.attemptId),
      correct: row.attemptId ? Boolean(row.correct) : null,
    })),
  };
}

export async function getPracticeSessionSummary(sessionId: string) {
  const view = await getPracticeSessionView(sessionId);
  if (!view) return undefined;

  const database = getDatabase();
  const skillRows = await database
    .select({
      skillCode: skills.code,
      skillTitle: skills.title,
      correct: attempts.correct,
      elapsedMilliseconds: attempts.elapsedMilliseconds,
    })
    .from(practiceSessionItems)
    .innerJoin(
      questionVersions,
      eq(questionVersions.id, practiceSessionItems.questionVersionId),
    )
    .innerJoin(skills, eq(skills.id, questionVersions.primarySkillId))
    .leftJoin(attempts, eq(attempts.sessionItemId, practiceSessionItems.id))
    .where(eq(practiceSessionItems.sessionId, sessionId));

  const skillsByCode = new Map<
    string,
    { skillCode: string; skillTitle: string; answered: number; correct: number }
  >();
  for (const row of skillRows) {
    const summary = skillsByCode.get(row.skillCode) ?? {
      skillCode: row.skillCode,
      skillTitle: row.skillTitle,
      answered: 0,
      correct: 0,
    };
    if (row.correct !== null) {
      summary.answered += 1;
      if (row.correct) summary.correct += 1;
    }
    skillsByCode.set(row.skillCode, summary);
  }

  return {
    session: view.session,
    totalElapsedMilliseconds: skillRows.reduce(
      (total, row) => total + (row.elapsedMilliseconds ?? 0),
      0,
    ),
    skillBreakdown: [...skillsByCode.values()],
  };
}

function formatCorrectAnswer(
  answerSpec: typeof questionVersions.$inferSelect.answerSpec,
  choices: NonNullable<typeof questionVersions.$inferSelect.choices>,
) {
  if (answerSpec.type === "numeric") {
    return `${answerSpec.value}${answerSpec.unit ? ` ${answerSpec.unit}` : ""}`;
  }
  if (answerSpec.type === "single_choice") {
    return formatChoice(answerSpec.choiceId, choices);
  }
  if (answerSpec.type === "multiple_select") {
    return answerSpec.choiceIds
      .map((choiceId) => formatChoice(choiceId, choices))
      .join("; ");
  }
  return answerSpec.itemIds
    .map(
      (choiceId, index) => `${index + 1}. ${formatChoice(choiceId, choices)}`,
    )
    .join("; ");
}

function formatChoice(
  choiceId: string,
  choices: NonNullable<typeof questionVersions.$inferSelect.choices>,
) {
  const choice = choices.find((item) => item.id === choiceId);
  return `${choiceId.toLocaleUpperCase("en-US")}. ${choice?.content ?? "Unknown choice"}`;
}
