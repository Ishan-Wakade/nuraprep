"use server";

import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ensureLearnerProfile } from "@/data/practice";
import { getDatabase } from "@/db/client";
import {
  attempts,
  learnerQuestionReports,
  learnerProfiles,
  practiceSessionItems,
  practiceSessions,
  questionPublications,
  questions,
  questionVersions,
  skills,
} from "@/db/schema";
import { requireLearner } from "@/lib/auth/learner";
import type { LearnerAnswer } from "@/lib/questions/contracts";
import { evaluateAnswer } from "@/lib/questions/validation";
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

export async function startPracticeSession(
  _previousState: PracticeActionState,
  formData: FormData,
): Promise<PracticeActionState> {
  const identity = requireLearner();
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
  const identity = requireLearner();
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
      timingMode: practiceSessions.timingMode,
      timeLimitSeconds: practiceSessions.timeLimitSeconds,
      startedAt: practiceSessions.startedAt,
      questionType: questionVersions.questionType,
      answerSpec: questionVersions.answerSpec,
      choices: questionVersions.choices,
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
    Date.now() > item.startedAt.getTime() + item.timeLimitSeconds * 1_000
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

  const inserted = await database.transaction(async (transaction) => {
    const [attempt] = await transaction
      .insert(attempts)
      .values({
        sessionItemId: item.itemId,
        answerPayload: answer,
        correct: evaluation.correct,
        evaluationReason: evaluation.reason ?? null,
        elapsedMilliseconds: parsed.data.elapsedMilliseconds,
        confidence: parsed.data.confidence,
      })
      .onConflictDoNothing({ target: attempts.sessionItemId })
      .returning({ id: attempts.id });
    if (!attempt) return false;

    const [totals] = await transaction
      .select({
        itemCount: count(practiceSessionItems.id),
        attemptCount: count(attempts.id),
      })
      .from(practiceSessionItems)
      .leftJoin(attempts, eq(attempts.sessionItemId, practiceSessionItems.id))
      .where(eq(practiceSessionItems.sessionId, item.sessionId));
    if (totals && totals.itemCount === totals.attemptCount) {
      await transaction
        .update(practiceSessions)
        .set({
          status: "COMPLETED",
          endedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(practiceSessions.id, item.sessionId));
    }
    return true;
  });

  if (!inserted) {
    return {
      status: "error",
      message: "This question was already answered. Your first answer is kept.",
    };
  }

  redirect(`/practice/${item.sessionId}?item=${item.position}&result=1`);
}

export async function submitQuestionReport(
  _previousState: PracticeActionState,
  formData: FormData,
): Promise<PracticeActionState> {
  const identity = requireLearner();
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
