"use server";

import { max, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import {
  questions,
  questionVersionSkills,
  questionVersionSources,
  questionVersions,
  reviewDecisions,
  reviewerFeedback,
} from "@/db/schema";
import { requireReviewer } from "@/lib/auth/reviewer";
import { validateQuestionContent } from "@/lib/questions/validation";

export type ReviewerActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const decisionSchema = z.object({
  versionId: z.uuid(),
  decision: z.enum(["APPROVED", "NEEDS_REVISION", "REJECTED"]),
  notes: z.string().trim().min(5).max(5_000),
  mathematicalCorrectness: z.coerce.number().int().min(1).max(4),
  clarity: z.coerce.number().int().min(1).max(4),
  alignment: z.coerce.number().int().min(1).max(4),
  accessibility: z.coerce.number().int().min(1).max(4),
  originality: z.coerce.number().int().min(1).max(4),
});

export async function submitReviewDecision(
  _previousState: ReviewerActionState,
  formData: FormData,
): Promise<ReviewerActionState> {
  const reviewer = requireReviewer();
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid review.",
    };
  }

  const database = getDatabase();
  const exists = await database
    .select({ id: questionVersions.id })
    .from(questionVersions)
    .where(eq(questionVersions.id, parsed.data.versionId))
    .limit(1);
  if (!exists[0])
    return { status: "error", message: "Question version not found." };

  const { versionId, decision, notes, ...rubricScores } = parsed.data;
  await database.insert(reviewDecisions).values({
    questionVersionId: versionId,
    reviewerId: reviewer.id,
    decision,
    notes,
    rubricScores,
  });

  revalidatePath("/review");
  revalidatePath(`/review/questions/${versionId}`);
  return {
    status: "success",
    message: "Review decision recorded as immutable history.",
  };
}

const feedbackSchema = z.object({
  versionId: z.uuid(),
  category: z.enum([
    "MATHEMATICAL_ERROR",
    "AMBIGUITY",
    "ALIGNMENT",
    "DISTRACTOR_QUALITY",
    "EXPLANATION_QUALITY",
    "ACCESSIBILITY",
    "ORIGINALITY",
    "DIFFICULTY",
    "FORMATTING",
    "OTHER",
  ]),
  feedback: z.string().trim().min(5).max(5_000),
  recurringIssueCode: z
    .string()
    .trim()
    .max(120)
    .regex(
      /^[A-Z0-9_-]*$/,
      "Use uppercase letters, numbers, hyphens, or underscores.",
    )
    .optional(),
});

export async function submitReviewerFeedback(
  _previousState: ReviewerActionState,
  formData: FormData,
): Promise<ReviewerActionState> {
  const reviewer = requireReviewer();
  const parsed = feedbackSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid feedback.",
    };
  }

  await getDatabase()
    .insert(reviewerFeedback)
    .values({
      questionVersionId: parsed.data.versionId,
      reviewerId: reviewer.id,
      category: parsed.data.category,
      feedback: parsed.data.feedback,
      recurringIssueCode: parsed.data.recurringIssueCode || null,
    });

  revalidatePath(`/review/questions/${parsed.data.versionId}`);
  return {
    status: "success",
    message: "Feedback saved for controlled batch analysis.",
  };
}

const revisionSchema = z.object({
  versionId: z.uuid(),
  prompt: z.string().trim().min(1).max(10_000),
  choicesJson: z.string().max(30_000),
  answerSpecJson: z.string().min(2).max(10_000),
  explanation: z.string().trim().min(1).max(20_000),
  distractorRationalesJson: z.string().min(2).max(30_000),
  difficulty: z.enum(["FOUNDATIONAL", "DEVELOPING", "PROFICIENT", "ADVANCED"]),
  difficultyRationale: z.string().trim().min(5).max(5_000),
  estimatedSeconds: z.coerce.number().int().min(10).max(3_600),
});

export async function createQuestionRevision(
  _previousState: ReviewerActionState,
  formData: FormData,
): Promise<ReviewerActionState> {
  const reviewer = requireReviewer();
  const parsed = revisionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid revision.",
    };
  }

  let choices: unknown;
  let answerSpec: unknown;
  let distractorRationales: unknown;
  try {
    choices = parsed.data.choicesJson.trim()
      ? JSON.parse(parsed.data.choicesJson)
      : undefined;
    answerSpec = JSON.parse(parsed.data.answerSpecJson);
    distractorRationales = JSON.parse(parsed.data.distractorRationalesJson);
  } catch {
    return {
      status: "error",
      message:
        "Choices, answer specification, and rationales must be valid JSON.",
    };
  }

  const database = getDatabase();
  const [current] = await database
    .select()
    .from(questionVersions)
    .where(eq(questionVersions.id, parsed.data.versionId))
    .limit(1);
  if (!current)
    return { status: "error", message: "Question version not found." };

  const contentValidation = validateQuestionContent({
    questionType: current.questionType,
    prompt: parsed.data.prompt,
    stimulus: current.stimulus ?? undefined,
    choices,
    answerSpec,
    explanation: parsed.data.explanation,
    distractorRationales,
  });
  if (!contentValidation.valid) {
    return {
      status: "error",
      message: contentValidation.issues
        .slice(0, 3)
        .map((issue) => `${issue.code}: ${issue.message}`)
        .join(" "),
    };
  }

  const newVersionId = await database.transaction(async (transaction) => {
    const [versionResult] = await transaction
      .select({ maximumVersion: max(questionVersions.version) })
      .from(questionVersions)
      .where(eq(questionVersions.questionId, current.questionId));
    const nextVersion = (versionResult?.maximumVersion ?? 0) + 1;

    const [newVersion] = await transaction
      .insert(questionVersions)
      .values({
        questionId: current.questionId,
        version: nextVersion,
        questionType: current.questionType,
        prompt: contentValidation.content.prompt,
        stimulus: contentValidation.content.stimulus,
        choices: contentValidation.content.choices,
        answerSpec: contentValidation.content.answerSpec,
        explanation: contentValidation.content.explanation,
        distractorRationales: contentValidation.content.distractorRationales,
        primarySkillId: current.primarySkillId,
        learningObjective: current.learningObjective,
        difficulty: parsed.data.difficulty,
        difficultyRationale: parsed.data.difficultyRationale,
        estimatedSeconds: parsed.data.estimatedSeconds,
        calculatorPolicy: current.calculatorPolicy,
        commonMisconceptions: current.commonMisconceptions,
        authoringMode: "HUMAN",
        authorId: reviewer.id,
        provenanceSummary: `${current.provenanceSummary} Revised by the owner review workflow from version ${current.version}.`,
      })
      .returning({ id: questionVersions.id });

    if (!newVersion) throw new Error("Failed to create a question revision.");

    const [sourceLinks, skillLinks] = await Promise.all([
      transaction
        .select()
        .from(questionVersionSources)
        .where(eq(questionVersionSources.questionVersionId, current.id)),
      transaction
        .select()
        .from(questionVersionSkills)
        .where(eq(questionVersionSkills.questionVersionId, current.id)),
    ]);

    if (sourceLinks.length) {
      await transaction.insert(questionVersionSources).values(
        sourceLinks.map((link) => ({
          questionVersionId: newVersion.id,
          sourceArtifactId: link.sourceArtifactId,
          relationship: link.relationship,
          transformationNotes: link.transformationNotes,
        })),
      );
    }
    if (skillLinks.length) {
      await transaction.insert(questionVersionSkills).values(
        skillLinks.map((link) => ({
          questionVersionId: newVersion.id,
          skillId: link.skillId,
          relationship: link.relationship,
        })),
      );
    }

    await transaction
      .update(questions)
      .set({ updatedAt: new Date() })
      .where(eq(questions.id, current.questionId));
    return newVersion.id;
  });

  revalidatePath("/review");
  redirect(`/review/questions/${newVersionId}`);
}
