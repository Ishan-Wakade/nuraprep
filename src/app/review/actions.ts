"use server";

import { and, desc, eq, isNull, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import {
  questionPublications,
  questions,
  questionVersionSkills,
  questionVersionSources,
  questionVersions,
  reviewDecisions,
  reviewerFeedback,
  learnerQuestionReportEvents,
  learnerQuestionReports,
  validationRuns,
  validatorRules,
} from "@/db/schema";
import { requireReviewer } from "@/lib/auth/reviewer";
import {
  mathVerificationSpecSchema,
  misconceptionCodesSchema,
  misconceptionRulesSchema,
} from "@/lib/questions/contracts";
import {
  AUTOMATED_PUBLICATION_VALIDATORS,
  evaluatePublicationGate,
  REVIEWER_PUBLICATION_VALIDATORS,
  validateMathVerification,
  validateMisconceptionRules,
  validateQuestionContent,
} from "@/lib/questions/validation";

export type ReviewerActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const versionIdSchema = z.object({ versionId: z.uuid() });

export async function runDeterministicValidation(
  _previousState: ReviewerActionState,
  formData: FormData,
): Promise<ReviewerActionState> {
  const reviewer = requireReviewer();
  const parsed = versionIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Invalid question version." };
  }

  const database = getDatabase();
  const [version] = await database
    .select()
    .from(questionVersions)
    .where(eq(questionVersions.id, parsed.data.versionId))
    .limit(1);
  if (!version) {
    return { status: "error", message: "Question version not found." };
  }

  const content = {
    questionType: version.questionType,
    prompt: version.prompt,
    stimulus: version.stimulus ?? undefined,
    choices: version.choices ?? undefined,
    answerSpec: version.answerSpec,
    explanation: version.explanation,
    distractorRationales: version.distractorRationales,
  };
  const contentResult = validateQuestionContent(content);
  const misconceptionIssues = validateMisconceptionRules(
    content,
    version.commonMisconceptions,
    version.misconceptionRules,
  );
  const answerContractValid =
    contentResult.valid && misconceptionIssues.length === 0;
  const mathResult = validateMathVerification(
    content,
    version.verificationSpec,
  );

  const [answerRules, mathRules] = await Promise.all(
    AUTOMATED_PUBLICATION_VALIDATORS.map((key) =>
      database
        .select()
        .from(validatorRules)
        .where(
          and(eq(validatorRules.active, true), eq(validatorRules.key, key)),
        )
        .orderBy(desc(validatorRules.version))
        .limit(1),
    ),
  );
  const answerRule = answerRules[0];
  const mathRule = mathRules[0];
  if (!answerRule || !mathRule) {
    return {
      status: "error",
      message: "Required automated validator rules are not configured.",
    };
  }

  await database.insert(validationRuns).values([
    {
      questionVersionId: version.id,
      validatorRuleId: answerRule.id,
      outcome: answerContractValid ? "PASS" : "FAIL",
      failureCode: answerContractValid
        ? null
        : (contentResult.issues[0]?.code ??
          misconceptionIssues[0]?.code ??
          "CONTENT_INVALID"),
      evidence: {
        method: "deterministic-answer-contract",
        executedBy: reviewer.id,
        issues: [...contentResult.issues, ...misconceptionIssues],
      },
    },
    {
      questionVersionId: version.id,
      validatorRuleId: mathRule.id,
      outcome: mathResult.valid ? "PASS" : "FAIL",
      failureCode: mathResult.valid ? null : mathResult.failureCode,
      evidence: {
        ...mathResult.evidence,
        executedBy: reviewer.id,
      },
    },
  ]);

  revalidateReview(version.id);
  return {
    status: "success",
    message: `Automated checks appended: answer contract ${answerContractValid ? "passed" : "failed"}; math ${mathResult.valid ? "passed" : "failed"}.`,
  };
}

const reviewerValidationSchema = z
  .object({
    versionId: z.uuid(),
    validatorKey: z.enum(REVIEWER_PUBLICATION_VALIDATORS),
    outcome: z.enum(["PASS", "FAIL"]),
    evidence: z.string().trim().min(10).max(5_000),
    failureCode: z
      .string()
      .trim()
      .max(120)
      .regex(/^[A-Z0-9_-]*$/),
  })
  .superRefine((value, context) => {
    if (value.outcome === "FAIL" && !value.failureCode) {
      context.addIssue({
        code: "custom",
        path: ["failureCode"],
        message: "A failure code is required for a failed validation.",
      });
    }
  });

export async function submitReviewerValidation(
  _previousState: ReviewerActionState,
  formData: FormData,
): Promise<ReviewerActionState> {
  const reviewer = requireReviewer();
  const parsed = reviewerValidationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid validation.",
    };
  }

  const database = getDatabase();
  const [version, rule] = await Promise.all([
    database
      .select({ id: questionVersions.id })
      .from(questionVersions)
      .where(eq(questionVersions.id, parsed.data.versionId))
      .limit(1),
    database
      .select()
      .from(validatorRules)
      .where(
        and(
          eq(validatorRules.key, parsed.data.validatorKey),
          eq(validatorRules.active, true),
        ),
      )
      .orderBy(desc(validatorRules.version))
      .limit(1),
  ]);
  if (!version[0] || !rule[0]) {
    return {
      status: "error",
      message: "Question version or validator rule not found.",
    };
  }

  await database.insert(validationRuns).values({
    questionVersionId: parsed.data.versionId,
    validatorRuleId: rule[0].id,
    outcome: parsed.data.outcome,
    failureCode:
      parsed.data.outcome === "FAIL" ? parsed.data.failureCode : null,
    evidence: {
      method: "reviewer-attestation",
      reviewerId: reviewer.id,
      notes: parsed.data.evidence,
    },
  });

  revalidateReview(parsed.data.versionId);
  return {
    status: "success",
    message: `${parsed.data.validatorKey} evidence appended as ${parsed.data.outcome.toLocaleLowerCase("en-US")}.`,
  };
}

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

const learnerReportTriageSchema = z.object({
  reportId: z.uuid(),
  questionVersionId: z.uuid(),
  status: z.enum(["OPEN", "RESOLVED", "WONT_FIX"]),
  notes: z.string().trim().min(5).max(5_000),
});

export async function triageLearnerQuestionReport(
  _previousState: ReviewerActionState,
  formData: FormData,
): Promise<ReviewerActionState> {
  const reviewer = requireReviewer();
  const parsed = learnerReportTriageSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid report update.",
    };
  }

  const report = await getDatabase()
    .select({ id: learnerQuestionReports.id })
    .from(learnerQuestionReports)
    .where(
      and(
        eq(learnerQuestionReports.id, parsed.data.reportId),
        eq(
          learnerQuestionReports.questionVersionId,
          parsed.data.questionVersionId,
        ),
      ),
    )
    .limit(1);
  if (!report[0]) {
    return { status: "error", message: "Learner report not found." };
  }

  await getDatabase().insert(learnerQuestionReportEvents).values({
    reportId: parsed.data.reportId,
    status: parsed.data.status,
    reviewerId: reviewer.id,
    notes: parsed.data.notes,
  });

  revalidatePath(`/review/questions/${parsed.data.questionVersionId}`);
  return {
    status: "success",
    message: "Report triage event appended to immutable history.",
  };
}

export async function publishQuestionVersion(
  _previousState: ReviewerActionState,
  formData: FormData,
): Promise<ReviewerActionState> {
  const reviewer = requireReviewer();
  const parsed = versionIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Invalid question version." };
  }

  const database = getDatabase();
  const readiness = await getPublicationReadiness(parsed.data.versionId);
  if (!readiness) {
    return { status: "error", message: "Question version not found." };
  }
  if (
    readiness.lifecycle === "RETRACTED" ||
    readiness.lifecycle === "ARCHIVED"
  ) {
    return {
      status: "error",
      message: "Retracted or archived question families cannot be published.",
    };
  }
  if (!readiness.gate.publishable) {
    return {
      status: "error",
      message: `Publication blocked: ${readiness.gate.blockers.join(", ")}.`,
    };
  }

  const existingPublication = await database
    .select()
    .from(questionPublications)
    .where(eq(questionPublications.questionVersionId, parsed.data.versionId))
    .limit(1);
  if (existingPublication[0]?.retiredAt) {
    return {
      status: "error",
      message: "A retired version cannot be republished; create a revision.",
    };
  }
  if (existingPublication[0]) {
    return { status: "success", message: "This version is already published." };
  }

  await database.transaction(async (transaction) => {
    await lockQuestionFamily(transaction, readiness.questionId);

    await transaction
      .update(questionPublications)
      .set({
        retiredAt: new Date(),
        retiredBy: reviewer.id,
        retirementReason: `Superseded by approved question version ${readiness.version}.`,
      })
      .where(
        and(
          eq(questionPublications.questionId, readiness.questionId),
          isNull(questionPublications.retiredAt),
        ),
      );

    await transaction.insert(questionPublications).values({
      questionId: readiness.questionId,
      questionVersionId: parsed.data.versionId,
      publishedBy: reviewer.id,
    });

    await transaction
      .update(questions)
      .set({ lifecycle: "ACTIVE", updatedAt: new Date() })
      .where(eq(questions.id, readiness.questionId));
  });

  revalidateReview(parsed.data.versionId);
  return {
    status: "success",
    message: "Question version published to the learner-safe bank.",
  };
}

const revisionSchema = z.object({
  versionId: z.uuid(),
  prompt: z.string().trim().min(1).max(10_000),
  choicesJson: z.string().max(30_000),
  answerSpecJson: z.string().min(2).max(10_000),
  verificationSpecJson: z.string().min(2).max(30_000),
  commonMisconceptionsJson: z.string().min(2).max(10_000),
  misconceptionRulesJson: z.string().min(2).max(30_000),
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
  let verificationSpec: unknown;
  let commonMisconceptions: unknown;
  let misconceptionRules: unknown;
  try {
    choices = parsed.data.choicesJson.trim()
      ? JSON.parse(parsed.data.choicesJson)
      : undefined;
    answerSpec = JSON.parse(parsed.data.answerSpecJson);
    verificationSpec = JSON.parse(parsed.data.verificationSpecJson);
    commonMisconceptions = JSON.parse(parsed.data.commonMisconceptionsJson);
    misconceptionRules = JSON.parse(parsed.data.misconceptionRulesJson);
    distractorRationales = JSON.parse(parsed.data.distractorRationalesJson);
  } catch {
    return {
      status: "error",
      message:
        "Choices, answer specification, verification specification, misconception metadata, and rationales must be valid JSON.",
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

  const mathValidation = validateMathVerification(
    contentValidation.content,
    verificationSpec,
  );
  if (!mathValidation.valid) {
    return {
      status: "error",
      message: `Verification specification failed: ${mathValidation.failureCode}.`,
    };
  }
  const parsedVerificationSpec =
    mathVerificationSpecSchema.parse(verificationSpec);
  const parsedMisconceptionCodes =
    misconceptionCodesSchema.safeParse(commonMisconceptions);
  if (!parsedMisconceptionCodes.success) {
    return {
      status: "error",
      message:
        parsedMisconceptionCodes.error.issues[0]?.message ??
        "Misconception codes are invalid.",
    };
  }
  const misconceptionIssues = validateMisconceptionRules(
    contentValidation.content,
    parsedMisconceptionCodes.data,
    misconceptionRules,
  );
  if (misconceptionIssues.length > 0) {
    return {
      status: "error",
      message: misconceptionIssues
        .slice(0, 3)
        .map((issue) => `${issue.code}: ${issue.message}`)
        .join(" "),
    };
  }
  const parsedMisconceptionRules =
    misconceptionRulesSchema.parse(misconceptionRules);

  const newVersionId = await database.transaction(async (transaction) => {
    await lockQuestionFamily(transaction, current.questionId);

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
        verificationSpec: parsedVerificationSpec,
        primarySkillId: current.primarySkillId,
        learningObjective: current.learningObjective,
        difficulty: parsed.data.difficulty,
        difficultyRationale: parsed.data.difficultyRationale,
        estimatedSeconds: parsed.data.estimatedSeconds,
        calculatorPolicy: current.calculatorPolicy,
        commonMisconceptions: parsedMisconceptionCodes.data,
        misconceptionRules: parsedMisconceptionRules,
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

async function lockQuestionFamily(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
  questionId: string,
) {
  // Version allocation and publication replacement both mutate family-wide
  // invariants, so serialize them even when two owner actions arrive together.
  await transaction.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${questionId}::text, 0))`,
  );
}

async function getPublicationReadiness(versionId: string) {
  const database = getDatabase();
  const [version] = await database
    .select({
      questionId: questionVersions.questionId,
      version: questionVersions.version,
      lifecycle: questions.lifecycle,
    })
    .from(questionVersions)
    .innerJoin(questions, eq(questions.id, questionVersions.questionId))
    .where(eq(questionVersions.id, versionId))
    .limit(1);
  if (!version) return undefined;

  const [sources, decisions, validations] = await Promise.all([
    database
      .select({ id: questionVersionSources.sourceArtifactId })
      .from(questionVersionSources)
      .where(eq(questionVersionSources.questionVersionId, versionId)),
    database
      .select({ decision: reviewDecisions.decision })
      .from(reviewDecisions)
      .where(eq(reviewDecisions.questionVersionId, versionId))
      .orderBy(desc(reviewDecisions.decidedAt))
      .limit(1),
    database
      .select({
        key: validatorRules.key,
        outcome: validationRuns.outcome,
        executedAt: validationRuns.executedAt,
      })
      .from(validationRuns)
      .innerJoin(
        validatorRules,
        eq(validatorRules.id, validationRuns.validatorRuleId),
      )
      .where(eq(validationRuns.questionVersionId, versionId))
      .orderBy(desc(validationRuns.executedAt)),
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

  return {
    ...version,
    gate: evaluatePublicationGate({
      lifecycle: "ACTIVE",
      provenanceCount: sources.length,
      latestReviewDecision: decisions[0]?.decision,
      latestValidationByKey,
    }),
  };
}

function revalidateReview(versionId: string) {
  revalidatePath("/review");
  revalidatePath(`/review/questions/${versionId}`);
}
