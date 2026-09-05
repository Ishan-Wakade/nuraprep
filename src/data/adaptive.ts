import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { connection } from "next/server";

import { ensureLearnerProfile } from "@/data/practice";
import { getDatabase } from "@/db/client";
import {
  attempts,
  practiceSessionItems,
  practiceSessions,
  questionPublications,
  questions,
  questionVersions,
  skillPrerequisites,
  skills,
} from "@/db/schema";
import { requireLearner } from "@/lib/auth/learner";
import {
  ADAPTIVE_MODEL_VERSION,
  selectAdaptiveQuestions,
  type AdaptiveAttemptEvidence,
  type AdaptiveCandidate,
  type AdaptivePrerequisite,
} from "@/lib/practice/adaptive";

const prerequisiteSkills = alias(skills, "prerequisite_skills");

export async function getAdaptiveSetupData() {
  await connection();
  const identity = requireLearner();
  const learner = await ensureLearnerProfile(identity);
  const planningData = await loadAdaptivePlanningData(learner.id);
  const plan = selectAdaptiveQuestions({
    ...planningData,
    count: 5,
  });
  const skillTitles = new Map(
    planningData.candidates.map((candidate) => [
      candidate.skillCode,
      candidate.skillTitle,
    ]),
  );
  const priorities = [...plan.states.values()]
    .filter((state) => skillTitles.has(state.skillCode))
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        left.skillCode.localeCompare(right.skillCode),
    )
    .map((state) => ({
      ...state,
      skillTitle: skillTitles.get(state.skillCode) ?? state.skillCode,
      masteryPercent: Math.round(state.mastery * 100),
      uncertaintyPercent: Math.round(state.uncertainty * 100),
      nextReviewAt: state.nextReviewAt?.toISOString() ?? null,
    }));

  return {
    identity,
    modelVersion: ADAPTIVE_MODEL_VERSION,
    availableQuestionCount: planningData.candidates.length,
    totalAttemptCount: planningData.attempts.length,
    priorities,
    preview: plan.selected,
  };
}

export async function buildAdaptivePlanForLearner(
  learnerId: string,
  count: number,
) {
  const planningData = await loadAdaptivePlanningData(learnerId);
  return selectAdaptiveQuestions({ ...planningData, count });
}

async function loadAdaptivePlanningData(learnerId: string) {
  const database = getDatabase();
  const [candidateRows, attemptRows, prerequisiteRows] = await Promise.all([
    database
      .select({
        questionId: questions.id,
        questionVersionId: questionVersions.id,
        skillCode: skills.code,
        skillTitle: skills.title,
        questionType: questionVersions.questionType,
        difficulty: questionVersions.difficulty,
        estimatedSeconds: questionVersions.estimatedSeconds,
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
      ),
    database
      .select({
        questionId: questionVersions.questionId,
        skillCode: skills.code,
        questionType: questionVersions.questionType,
        difficulty: questionVersions.difficulty,
        correct: attempts.correct,
        confidence: attempts.confidence,
        misconceptionAttributions: attempts.misconceptionAttributions,
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
        questionVersions,
        eq(questionVersions.id, practiceSessionItems.questionVersionId),
      )
      .innerJoin(skills, eq(skills.id, questionVersions.primarySkillId))
      .where(eq(practiceSessions.learnerId, learnerId))
      .orderBy(desc(attempts.submittedAt)),
    database
      .select({
        skillCode: skills.code,
        prerequisiteSkillCode: prerequisiteSkills.code,
        strength: skillPrerequisites.strength,
      })
      .from(skillPrerequisites)
      .innerJoin(skills, eq(skills.id, skillPrerequisites.skillId))
      .innerJoin(
        prerequisiteSkills,
        eq(prerequisiteSkills.id, skillPrerequisites.prerequisiteSkillId),
      ),
  ]);

  const candidates: AdaptiveCandidate[] = candidateRows;
  const evidence: AdaptiveAttemptEvidence[] = attemptRows.map((attempt) => ({
    questionId: attempt.questionId,
    skillCode: attempt.skillCode,
    questionType: attempt.questionType,
    difficulty: attempt.difficulty,
    correct: attempt.correct,
    confidence: attempt.confidence,
    misconceptionCount: attempt.misconceptionAttributions.length,
    submittedAt: attempt.submittedAt,
  }));
  const prerequisites: AdaptivePrerequisite[] = prerequisiteRows;

  return { candidates, attempts: evidence, prerequisites };
}
