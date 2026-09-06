import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { connection } from "next/server";

import { getDatabase } from "@/db/client";
import {
  examSpecifications,
  questionPublications,
  questions,
  questionVersions,
  skills,
} from "@/db/schema";
import { requireLearner } from "@/lib/auth/learner";
import {
  assemblePracticeTest,
  PRACTICE_TEST_ASSEMBLER_VERSION,
  type PracticeTestCandidate,
} from "@/lib/practice/practice-test";

const domainSkills = alias(skills, "domain_skills");

export async function getPracticeTestSetupData() {
  await connection();
  await requireLearner();
  const data = await loadPracticeTestData();
  if (!data) return undefined;
  const assembly = assemblePracticeTest({
    specification: data.specification,
    candidates: data.candidates,
    seed: "readiness-preview",
  });

  return {
    ...assembly,
    assemblerVersion: PRACTICE_TEST_ASSEMBLER_VERSION,
    specification: {
      ...data.specification,
      examName: data.examName,
      examVersion: data.examVersion,
      sourceUrl: data.sourceUrl,
      lastVerifiedAt: data.lastVerifiedAt.toISOString(),
      notes: data.notes,
    },
  };
}

export async function buildPracticeTest(seed: string) {
  const data = await loadPracticeTestData();
  if (!data) return undefined;
  return {
    specification: data.specification,
    assembly: assemblePracticeTest({
      specification: data.specification,
      candidates: data.candidates,
      seed,
    }),
  };
}

async function loadPracticeTestData() {
  const database = getDatabase();
  const [specification] = await database
    .select({
      examName: examSpecifications.examName,
      examVersion: examSpecifications.examVersion,
      sourceUrl: examSpecifications.sourceUrl,
      lastVerifiedAt: examSpecifications.lastVerifiedAt,
      totalQuestions: examSpecifications.totalQuestions,
      scoredQuestions: examSpecifications.scoredQuestions,
      unscoredQuestions: examSpecifications.unscoredQuestions,
      durationMinutes: examSpecifications.durationMinutes,
      domainDistribution: examSpecifications.domainDistribution,
      notes: examSpecifications.notes,
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
  if (!specification) return undefined;

  const candidateRows = await database
    .select({
      questionId: questions.id,
      questionVersionId: questionVersions.id,
      domainTitle: domainSkills.title,
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
    .innerJoin(domainSkills, eq(domainSkills.id, skills.parentSkillId))
    .where(
      and(
        isNull(questionPublications.retiredAt),
        eq(questions.lifecycle, "ACTIVE"),
      ),
    );

  const candidates: PracticeTestCandidate[] = candidateRows;
  return {
    examName: specification.examName,
    examVersion: specification.examVersion,
    sourceUrl: specification.sourceUrl,
    lastVerifiedAt: specification.lastVerifiedAt,
    notes: specification.notes,
    specification: {
      totalQuestions: specification.totalQuestions,
      scoredQuestions: specification.scoredQuestions,
      unscoredQuestions: specification.unscoredQuestions,
      durationMinutes: specification.durationMinutes,
      domainDistribution: specification.domainDistribution,
    },
    candidates,
  };
}
