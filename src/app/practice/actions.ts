"use server";

import { randomUUID } from "node:crypto";

import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { buildAdaptivePlanForLearner } from "@/data/adaptive";
import { ensureLearnerProfile } from "@/data/practice";
import { buildPracticeTest } from "@/data/practice-test";
import { getDatabase } from "@/db/client";
import {
  attempts,
  learnerQuestionReports,
  learnerProfiles,
  practiceItemReviewEvents,
  practiceSessionItems,
  practiceSessions,
  questionPublications,
  questions,
  questionVersions,
  skills,
  tutorInteractions,
} from "@/db/schema";
import { requireLearner } from "@/lib/auth/learner";
import type { LearnerAnswer } from "@/lib/questions/contracts";
import {
  attributeMisconceptions,
  evaluateAnswer,
} from "@/lib/questions/validation";
import { learnerSafePublicationCondition } from "@/lib/questions/publication";
import {
  learnerQuestionReportSchema,
  practiceSessionFiltersSchema,
} from "@/lib/practice/contracts";

export type PracticeActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const startSessionInputSchema = z.object({
  skillCode: z.string(),
  difficulty: z.string(),
  questionType: z.string(),
  questionCount: z.string(),
  timingMode: z.string(),
});

const startAdaptiveInputSchema = z.object({
  questionCount: z.coerce.number().int().min(1).max(10),
});

export async function startPracticeSession(
  _previousState: PracticeActionState,
  formData: FormData,
): Promise<PracticeActionState> {
  const identity = await requireLearner();
  const raw = startSessionInputSchema.safeParse(Object.fromEntries(formData));
  if (!raw.success) {
    return { status: "error", message: "Choose valid practice settings." };
  }

  const parsed = practiceSessionFiltersSchema.safeParse({
    skillCode: raw.data.skillCode || undefined,
    difficulty: raw.data.difficulty || undefined,
    questionType: raw.data.questionType || undefined,
    questionCount: raw.data.questionCount,
    timingMode: raw.data.timingMode,
    newOnly: formData.get("newOnly") === "on",
    missedOnly: formData.get("missedOnly") === "on",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid practice filters.",
    };
  }

  const database = getDatabase();
  const learner = await ensureLearnerProfile(identity);
  const filters = parsed.data;
  const conditions = [
    isNull(questionPublications.retiredAt),
    eq(questions.lifecycle, "ACTIVE"),
    learnerSafePublicationCondition(),
    filters.skillCode ? eq(skills.code, filters.skillCode) : undefined,
    filters.difficulty
      ? eq(questionVersions.difficulty, filters.difficulty)
      : undefined,
    filters.questionType
      ? eq(questionVersions.questionType, filters.questionType)
      : undefined,
  ].filter((condition) => condition !== undefined);

  const allCandidates = await database
    .select({
      questionId: questions.id,
      questionVersionId: questionVersions.id,
      estimatedSeconds: questionVersions.estimatedSeconds,
      skillCode: skills.code,
      difficulty: questionVersions.difficulty,
      questionType: questionVersions.questionType,
    })
    .from(questionPublications)
    .innerJoin(
      questionVersions,
      eq(questionVersions.id, questionPublications.questionVersionId),
    )
    .innerJoin(questions, eq(questions.id, questionPublications.questionId))
    .innerJoin(skills, eq(skills.id, questionVersions.primarySkillId))
    .where(and(...conditions))
    .orderBy(sql`random()`)
    .limit(200);

  const priorAttempts = allCandidates.length
    ? await database
        .select({
          questionId: questionVersions.questionId,
          correct: attempts.correct,
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
          questionVersions,
          eq(questionVersions.id, practiceSessionItems.questionVersionId),
        )
        .where(
          and(
            eq(practiceSessions.learnerId, learner.id),
            inArray(
              questionVersions.questionId,
              allCandidates.map((candidate) => candidate.questionId),
            ),
          ),
        )
    : [];
  const attemptedIds = new Set(
    priorAttempts.map((attempt) => attempt.questionId),
  );
  const missedIds = new Set(
    priorAttempts
      .filter((attempt) => !attempt.correct)
      .map((attempt) => attempt.questionId),
  );
  const selected = allCandidates
    .filter(
      (candidate) =>
        (!filters.newOnly || !attemptedIds.has(candidate.questionId)) &&
        (!filters.missedOnly || missedIds.has(candidate.questionId)),
    )
    .slice(0, filters.questionCount);

  if (!selected.length) {
    return {
      status: "error",
      message:
        "No published questions match those filters yet. Adjust the filters or publish an approved question in the owner review queue.",
    };
  }

  const timeLimitSeconds =
    filters.timingMode === "TIMED"
      ? selected.reduce(
          (total, candidate) => total + candidate.estimatedSeconds,
          0,
        )
      : null;
  const selectionReason = describeSelection(filters);

  const sessionId = await database.transaction(async (transaction) => {
    const [session] = await transaction
      .insert(practiceSessions)
      .values({
        learnerId: learner.id,
        mode: "TOPIC_PRACTICE",
        timingMode: filters.timingMode,
        requestedQuestionCount: filters.questionCount,
        filters,
        timeLimitSeconds,
      })
      .returning({ id: practiceSessions.id });
    if (!session) throw new Error("Failed to create the practice session.");

    await transaction.insert(practiceSessionItems).values(
      selected.map((candidate, index) => ({
        sessionId: session.id,
        questionVersionId: candidate.questionVersionId,
        position: index + 1,
        selectionReason,
      })),
    );
    return session.id;
  });

  redirect(`/practice/${sessionId}?item=1`);
}

export async function startDiagnosticSession(
  _previousState: PracticeActionState,
  _formData: FormData,
): Promise<PracticeActionState> {
  void _previousState;
  void _formData;
  const identity = await requireLearner();
  const database = getDatabase();
  const learner = await ensureLearnerProfile(identity);
  const candidates = await database
    .select({
      questionVersionId: questionVersions.id,
      skillCode: skills.code,
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
        learnerSafePublicationCondition(),
      ),
    )
    .orderBy(sql`random()`);

  const selected: typeof candidates = [];
  const coveredSkills = new Set<string>();
  for (const candidate of candidates) {
    if (coveredSkills.has(candidate.skillCode)) continue;
    coveredSkills.add(candidate.skillCode);
    selected.push(candidate);
    if (selected.length === 6) break;
  }

  if (selected.length < 4) {
    return {
      status: "error",
      message:
        "The diagnostic needs published questions across at least four Math skills. Review and publish more coverage first.",
    };
  }

  const sessionId = await database.transaction(async (transaction) => {
    const [session] = await transaction
      .insert(practiceSessions)
      .values({
        learnerId: learner.id,
        mode: "DIAGNOSTIC",
        timingMode: "UNTIMED",
        requestedQuestionCount: selected.length,
        filters: {
          questionCount: selected.length,
          timingMode: "UNTIMED",
          newOnly: false,
          missedOnly: false,
        },
      })
      .returning({ id: practiceSessions.id });
    if (!session) throw new Error("Failed to create the diagnostic session.");

    await transaction.insert(practiceSessionItems).values(
      selected.map((candidate, index) => ({
        sessionId: session.id,
        questionVersionId: candidate.questionVersionId,
        position: index + 1,
        selectionReason:
          "Diagnostic coverage sample: one current published item per available Math skill.",
      })),
    );
    return session.id;
  });

  redirect(`/practice/${sessionId}?item=1`);
}

export async function startAdaptiveSession(
  _previousState: PracticeActionState,
  formData: FormData,
): Promise<PracticeActionState> {
  void _previousState;
  const identity = await requireLearner();
  const parsed = startAdaptiveInputSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { status: "error", message: "Choose a valid session length." };
  }

  const database = getDatabase();
  const learner = await ensureLearnerProfile(identity);
  const plan = await buildAdaptivePlanForLearner(
    learner.id,
    parsed.data.questionCount,
  );
  if (!plan.selected.length) {
    return {
      status: "error",
      message:
        "No current published question fits the adaptive safety rules. Publish more reviewed coverage or complete a focused session first.",
    };
  }

  const sessionId = await database.transaction(async (transaction) => {
    const [session] = await transaction
      .insert(practiceSessions)
      .values({
        learnerId: learner.id,
        mode: "ADAPTIVE",
        timingMode: "UNTIMED",
        requestedQuestionCount: parsed.data.questionCount,
        filters: {
          questionCount: parsed.data.questionCount,
          timingMode: "UNTIMED",
          newOnly: false,
          missedOnly: false,
        },
      })
      .returning({ id: practiceSessions.id });
    if (!session) throw new Error("Failed to create the adaptive session.");

    await transaction.insert(practiceSessionItems).values(
      plan.selected.map((candidate, index) => ({
        sessionId: session.id,
        questionVersionId: candidate.questionVersionId,
        position: index + 1,
        selectionReason: candidate.selectionReason,
      })),
    );
    return session.id;
  });

  redirect(`/practice/${sessionId}?item=1`);
}

export async function startPracticeTestSession(
  _previousState: PracticeActionState,
  _formData: FormData,
): Promise<PracticeActionState> {
  void _previousState;
  void _formData;
  const identity = await requireLearner();
  const database = getDatabase();
  const learner = await ensureLearnerProfile(identity);
  const test = await buildPracticeTest(randomUUID());
  if (!test) {
    return {
      status: "error",
      message: "No verified Math exam specification is available.",
    };
  }
  if (!test.assembly.ready) {
    const deficit = test.assembly.readiness
      .filter((domain) => domain.deficit > 0)
      .map((domain) => `${domain.domainTitle}: ${domain.deficit} more`)
      .join("; ");
    return {
      status: "error",
      message: `The reviewed bank is not ready for a full test. ${deficit}`,
    };
  }

  const sessionId = await database.transaction(async (transaction) => {
    const [session] = await transaction
      .insert(practiceSessions)
      .values({
        learnerId: learner.id,
        mode: "PRACTICE_TEST",
        timingMode: "TIMED",
        requestedQuestionCount: test.specification.totalQuestions,
        filters: {
          questionCount: test.specification.totalQuestions,
          timingMode: "TIMED",
          newOnly: false,
          missedOnly: false,
        },
        timeLimitSeconds: test.specification.durationMinutes * 60,
      })
      .returning({ id: practiceSessions.id });
    if (!session) throw new Error("Failed to create the practice test.");

    await transaction.insert(practiceSessionItems).values(
      test.assembly.selections.map((selection) => ({
        sessionId: session.id,
        questionVersionId: selection.questionVersionId,
        position: selection.position,
        selectionReason: selection.selectionReason,
      })),
    );
    return session.id;
  });

  redirect(`/practice/${sessionId}?item=1`);
}

const answerSubmissionSchema = z.object({
  sessionId: z.uuid(),
  sessionItemId: z.uuid(),
  elapsedMilliseconds: z.coerce.number().int().min(0).max(86_400_000),
  confidence: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().min(1).max(5).optional(),
  ),
});

export async function submitPracticeAnswer(
  _previousState: PracticeActionState,
  formData: FormData,
): Promise<PracticeActionState> {
  const identity = await requireLearner();
  const parsed = answerSubmissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid answer submission.",
    };
  }

  const database = getDatabase();
  const [item] = await database
    .select({
      itemId: practiceSessionItems.id,
      position: practiceSessionItems.position,
      sessionId: practiceSessions.id,
      status: practiceSessions.status,
      mode: practiceSessions.mode,
      timingMode: practiceSessions.timingMode,
      timeLimitSeconds: practiceSessions.timeLimitSeconds,
      startedAt: practiceSessions.startedAt,
      questionType: questionVersions.questionType,
      answerSpec: questionVersions.answerSpec,
      choices: questionVersions.choices,
      misconceptionRules: questionVersions.misconceptionRules,
    })
    .from(practiceSessionItems)
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
    .where(
      and(
        eq(practiceSessionItems.id, parsed.data.sessionItemId),
        eq(practiceSessions.id, parsed.data.sessionId),
        eq(learnerProfiles.authSubject, identity.subject),
      ),
    )
    .limit(1);
  if (!item) {
    return { status: "error", message: "Practice question not found." };
  }
  if (item.status !== "IN_PROGRESS") {
    return { status: "error", message: "This practice session has ended." };
  }

  if (
    item.timingMode === "TIMED" &&
    item.timeLimitSeconds &&
    Date.now() >= item.startedAt.getTime() + item.timeLimitSeconds * 1_000
  ) {
    await database
      .update(practiceSessions)
      .set({ status: "COMPLETED", endedAt: new Date(), updatedAt: new Date() })
      .where(eq(practiceSessions.id, item.sessionId));
    redirect(`/practice/${item.sessionId}/summary?expired=1`);
  }

  const answer = buildLearnerAnswer(item.questionType, formData);
  if (!answer) {
    return {
      status: "error",
      message: "Enter an answer before checking your work.",
    };
  }
  const evaluation = evaluateAnswer(item.answerSpec, answer);
  const misconceptionAttributions = attributeMisconceptions(
    answer,
    evaluation,
    item.misconceptionRules,
  );

  const result = await database.transaction(async (transaction) => {
    const [attempt] = await transaction
      .insert(attempts)
      .values({
        sessionItemId: item.itemId,
        answerPayload: answer,
        correct: evaluation.correct,
        evaluationReason: evaluation.reason ?? null,
        elapsedMilliseconds: parsed.data.elapsedMilliseconds,
        confidence: parsed.data.confidence,
        misconceptionAttributions,
      })
      .onConflictDoNothing({ target: attempts.sessionItemId })
      .returning({ id: attempts.id });
    if (!attempt) return { inserted: false, completed: false };

    const [totals] = await transaction
      .select({
        itemCount: count(practiceSessionItems.id),
        attemptCount: count(attempts.id),
      })
      .from(practiceSessionItems)
      .leftJoin(attempts, eq(attempts.sessionItemId, practiceSessionItems.id))
      .where(eq(practiceSessionItems.sessionId, item.sessionId));
    const completed = Boolean(
      totals && totals.itemCount === totals.attemptCount,
    );
    if (completed) {
      await transaction
        .update(practiceSessions)
        .set({
          status: "COMPLETED",
          endedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(practiceSessions.id, item.sessionId));
    }
    return { inserted: true, completed };
  });

  if (!result.inserted) {
    return {
      status: "error",
      message: "This question was already answered. Your first answer is kept.",
    };
  }

  if (item.mode === "PRACTICE_TEST") {
    if (result.completed) {
      redirect(`/practice/${item.sessionId}/summary`);
    }
    const [nextItem] = await database
      .select({ position: practiceSessionItems.position })
      .from(practiceSessionItems)
      .leftJoin(attempts, eq(attempts.sessionItemId, practiceSessionItems.id))
      .where(
        and(
          eq(practiceSessionItems.sessionId, item.sessionId),
          isNull(attempts.id),
        ),
      )
      .orderBy(practiceSessionItems.position)
      .limit(1);
    if (nextItem) {
      redirect(`/practice/${item.sessionId}?item=${nextItem.position}`);
    }
  }

  redirect(`/practice/${item.sessionId}?item=${item.position}&result=1`);
}

const sessionMutationSchema = z.object({ sessionId: z.uuid() });
const reviewFlagSchema = sessionMutationSchema.extend({
  sessionItemId: z.uuid(),
  flagged: z.enum(["true", "false"]),
});

export async function setPracticeItemReviewFlag(
  _previousState: PracticeActionState,
  formData: FormData,
): Promise<PracticeActionState> {
  void _previousState;
  const identity = await requireLearner();
  const parsed = reviewFlagSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Invalid review-flag request." };
  }

  const database = getDatabase();
  const [item] = await database
    .select({ id: practiceSessionItems.id })
    .from(practiceSessionItems)
    .innerJoin(
      practiceSessions,
      eq(practiceSessions.id, practiceSessionItems.sessionId),
    )
    .innerJoin(
      learnerProfiles,
      eq(learnerProfiles.id, practiceSessions.learnerId),
    )
    .where(
      and(
        eq(practiceSessionItems.id, parsed.data.sessionItemId),
        eq(practiceSessions.id, parsed.data.sessionId),
        eq(practiceSessions.mode, "PRACTICE_TEST"),
        eq(practiceSessions.status, "IN_PROGRESS"),
        eq(learnerProfiles.authSubject, identity.subject),
      ),
    )
    .limit(1);
  if (!item) {
    return { status: "error", message: "Practice-test item not found." };
  }

  const flagged = parsed.data.flagged === "true";
  await database.insert(practiceItemReviewEvents).values({
    sessionItemId: item.id,
    flagged,
    recordedBy: identity.subject,
  });
  revalidatePath(`/practice/${parsed.data.sessionId}`);
  return {
    status: "success",
    message: flagged ? "Question marked for review." : "Review mark removed.",
  };
}

export async function finishPracticeTestSession(
  _previousState: PracticeActionState,
  formData: FormData,
): Promise<PracticeActionState> {
  void _previousState;
  return endPracticeTest(formData, false);
}

export async function expirePracticeTestSession(
  _previousState: PracticeActionState,
  formData: FormData,
): Promise<PracticeActionState> {
  void _previousState;
  return endPracticeTest(formData, true);
}

async function endPracticeTest(
  formData: FormData,
  requireExpired: boolean,
): Promise<PracticeActionState> {
  const identity = await requireLearner();
  const parsed = sessionMutationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Invalid practice-test request." };
  }

  const database = getDatabase();
  const [session] = await database
    .select({
      id: practiceSessions.id,
      status: practiceSessions.status,
      startedAt: practiceSessions.startedAt,
      timeLimitSeconds: practiceSessions.timeLimitSeconds,
    })
    .from(practiceSessions)
    .innerJoin(
      learnerProfiles,
      eq(learnerProfiles.id, practiceSessions.learnerId),
    )
    .where(
      and(
        eq(practiceSessions.id, parsed.data.sessionId),
        eq(practiceSessions.mode, "PRACTICE_TEST"),
        eq(learnerProfiles.authSubject, identity.subject),
      ),
    )
    .limit(1);
  if (!session) {
    return { status: "error", message: "Practice test not found." };
  }
  if (session.status !== "IN_PROGRESS") {
    redirect(`/practice/${session.id}/summary`);
  }
  if (requireExpired) {
    if (session.timeLimitSeconds === null) {
      return { status: "error", message: "This test has no valid timer." };
    }
    if (
      Date.now() <
      session.startedAt.getTime() + session.timeLimitSeconds * 1_000
    ) {
      return { status: "error", message: "The test still has time remaining." };
    }
  }

  await database
    .update(practiceSessions)
    .set({ status: "COMPLETED", endedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(practiceSessions.id, session.id),
        eq(practiceSessions.status, "IN_PROGRESS"),
      ),
    );
  redirect(
    `/practice/${session.id}/summary${requireExpired ? "?expired=1" : ""}`,
  );
}

export async function submitQuestionReport(
  _previousState: PracticeActionState,
  formData: FormData,
): Promise<PracticeActionState> {
  const identity = await requireLearner();
  const parsed = learnerQuestionReportSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Enter a valid problem report.",
    };
  }

  const database = getDatabase();
  const [context] = await database
    .select({
      learnerId: learnerProfiles.id,
      sessionId: practiceSessions.id,
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
    .where(
      and(
        eq(attempts.id, parsed.data.attemptId),
        eq(
          practiceSessionItems.questionVersionId,
          parsed.data.questionVersionId,
        ),
        eq(learnerProfiles.authSubject, identity.subject),
      ),
    )
    .limit(1);
  if (!context) {
    return {
      status: "error",
      message: "That answered question is not available to report.",
    };
  }

  const inserted = await database
    .insert(learnerQuestionReports)
    .values({
      questionVersionId: parsed.data.questionVersionId,
      learnerId: context.learnerId,
      attemptId: parsed.data.attemptId,
      category: parsed.data.category,
      details: parsed.data.details,
    })
    .onConflictDoNothing({
      target: [
        learnerQuestionReports.attemptId,
        learnerQuestionReports.category,
      ],
    })
    .returning({ id: learnerQuestionReports.id });

  revalidatePath(`/practice/${context.sessionId}`);
  revalidatePath(`/review/questions/${parsed.data.questionVersionId}`);
  return inserted[0]
    ? {
        status: "success",
        message: "Report saved with this exact question version for review.",
      }
    : {
        status: "success",
        message: "You already reported this issue category for this attempt.",
      };
}

const tutorRequestSchema = z.object({
  sessionId: z.uuid(),
  sessionItemId: z.uuid(),
});

export async function requestTutorStep(
  _previousState: PracticeActionState,
  formData: FormData,
): Promise<PracticeActionState> {
  const identity = await requireLearner();
  const parsed = tutorRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Invalid tutor request." };
  }

  const database = getDatabase();
  const [item] = await database
    .select({
      itemId: practiceSessionItems.id,
      status: practiceSessions.status,
      tutorGuidance: questionVersions.tutorGuidance,
      attemptId: attempts.id,
    })
    .from(practiceSessionItems)
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
    .leftJoin(attempts, eq(attempts.sessionItemId, practiceSessionItems.id))
    .where(
      and(
        eq(practiceSessionItems.id, parsed.data.sessionItemId),
        eq(practiceSessions.id, parsed.data.sessionId),
        eq(learnerProfiles.authSubject, identity.subject),
      ),
    )
    .limit(1);

  if (!item || item.status !== "IN_PROGRESS" || item.attemptId) {
    return {
      status: "error",
      message:
        "Tutor hints are available only before this answer is submitted.",
    };
  }
  if (!item.tutorGuidance) {
    return {
      status: "error",
      message: "This question does not have reviewed tutor guidance yet.",
    };
  }

  const [result] = await database
    .select({ revealedCount: count(tutorInteractions.id) })
    .from(tutorInteractions)
    .where(eq(tutorInteractions.sessionItemId, item.itemId));
  const nextStepIndex = (result?.revealedCount ?? 0) + 1;
  const nextStep = item.tutorGuidance.steps[nextStepIndex - 1];
  if (!nextStep) {
    return {
      status: "success",
      message: "All reviewed hints for this question are already visible.",
    };
  }

  const inserted = await database
    .insert(tutorInteractions)
    .values({
      sessionItemId: item.itemId,
      stepIndex: nextStepIndex,
      stepId: nextStep.id,
    })
    .onConflictDoNothing()
    .returning({ id: tutorInteractions.id });

  revalidatePath(`/practice/${parsed.data.sessionId}`);
  return {
    status: "success",
    message: inserted[0]
      ? "A reviewed tutor step is now visible."
      : "That tutor step was already requested.",
  };
}

function buildLearnerAnswer(
  questionType: (typeof questionVersions.questionType.enumValues)[number],
  formData: FormData,
): LearnerAnswer | undefined {
  if (questionType === "SINGLE_CHOICE") {
    const choiceId = formData.get("choiceId");
    return typeof choiceId === "string" && choiceId
      ? { type: "single_choice", choiceId }
      : undefined;
  }
  if (questionType === "MULTIPLE_SELECT") {
    const choiceIds = formData
      .getAll("choiceId")
      .filter((value): value is string => typeof value === "string" && !!value);
    return choiceIds.length
      ? { type: "multiple_select", choiceIds }
      : undefined;
  }
  if (questionType === "ORDERED_RESPONSE") {
    const itemIds = formData
      .getAll("orderedItemId")
      .filter((value): value is string => typeof value === "string" && !!value);
    return itemIds.length >= 2
      ? { type: "ordered_response", itemIds }
      : undefined;
  }

  const value = formData.get("numericValue");
  const unit = formData.get("unit");
  return typeof value === "string" && value.trim()
    ? {
        type: "numeric",
        value,
        unit: typeof unit === "string" && unit.trim() ? unit : undefined,
      }
    : undefined;
}

function describeSelection(
  filters: z.infer<typeof practiceSessionFiltersSchema>,
) {
  const parts = [
    filters.skillCode ? `skill ${filters.skillCode}` : "all published skills",
    filters.difficulty
      ? `${filters.difficulty.toLocaleLowerCase("en-US")} difficulty`
      : "mixed internal difficulty",
    filters.questionType
      ? filters.questionType.toLocaleLowerCase("en-US")
      : "mixed response formats",
  ];
  if (filters.newOnly) parts.push("not attempted before");
  if (filters.missedOnly) parts.push("previously missed");
  return `Selected for ${parts.join(", ")}.`;
}
