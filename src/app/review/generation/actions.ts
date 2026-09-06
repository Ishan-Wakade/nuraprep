"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import {
  generationRuns,
  generationTemplates,
  questionVersions,
} from "@/db/schema";
import { requireReviewer } from "@/lib/auth/reviewer";
import {
  createGenerationIdempotencyKey,
  createGenerationPromptHash,
  generationRequestSchema,
} from "@/lib/generation/contracts";

export type GenerationActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const templateApprovalSchema = z.object({
  templateId: z.uuid(),
  approvalNotes: z.string().trim().min(20).max(5_000),
});

const generationCancellationSchema = z.object({
  runId: z.uuid(),
  reason: z.string().trim().min(20).max(2_000),
});

export async function approveGenerationTemplate(
  _previous: GenerationActionState,
  formData: FormData,
): Promise<GenerationActionState> {
  const reviewer = await requireReviewer();
  const parsed = templateApprovalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid approval.",
    };
  }

  const database = getDatabase();
  const [updated] = await database
    .update(generationTemplates)
    .set({
      status: "APPROVED",
      approvedBy: reviewer.id,
      approvalNotes: parsed.data.approvalNotes,
      approvedAt: new Date(),
    })
    .where(
      and(
        eq(generationTemplates.id, parsed.data.templateId),
        eq(generationTemplates.status, "DRAFT"),
      ),
    )
    .returning({ id: generationTemplates.id });
  if (!updated) {
    return {
      status: "error",
      message: "Only a current draft template can be approved.",
    };
  }

  revalidatePath("/review/generation");
  return { status: "success", message: "Template approved for dispatch." };
}

export async function requestQuestionRegeneration(
  _previous: GenerationActionState,
  formData: FormData,
): Promise<GenerationActionState> {
  const reviewer = await requireReviewer();
  const parsed = generationRequestSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid generation request.",
    };
  }

  const database = getDatabase();
  const [[template], [sourceVersion]] = await Promise.all([
    database
      .select()
      .from(generationTemplates)
      .where(eq(generationTemplates.id, parsed.data.templateId))
      .limit(1),
    database
      .select({
        id: questionVersions.id,
        primarySkillId: questionVersions.primarySkillId,
        questionType: questionVersions.questionType,
      })
      .from(questionVersions)
      .where(eq(questionVersions.id, parsed.data.sourceQuestionVersionId))
      .limit(1),
  ]);
  if (!template || !sourceVersion) {
    return {
      status: "error",
      message: "Template or source version not found.",
    };
  }
  if (template.status !== "APPROVED") {
    return {
      status: "error",
      message: "The selected generation template is not approved.",
    };
  }
  if (
    template.targetSkillId !== sourceVersion.primarySkillId ||
    template.questionType !== sourceVersion.questionType
  ) {
    return {
      status: "error",
      message:
        "Template skill and question type must match the source version.",
    };
  }
  if (
    parsed.data.requestKind === "DISTRACTORS_ONLY" &&
    !["SINGLE_CHOICE", "MULTIPLE_SELECT"].includes(sourceVersion.questionType)
  ) {
    return {
      status: "error",
      message:
        "Distractor-only regeneration requires a single-choice or multiple-select item.",
    };
  }

  const idempotencyKey = createGenerationIdempotencyKey(parsed.data);
  const promptHash = createGenerationPromptHash({
    templateKey: template.templateKey,
    templateVersion: template.version,
    templateInstructions: template.instructions,
    request: parsed.data,
  });
  const [created] = await database
    .insert(generationRuns)
    .values({
      idempotencyKey,
      templateId: template.id,
      sourceQuestionVersionId: sourceVersion.id,
      requestKind: parsed.data.requestKind,
      requestedBy: reviewer.id,
      provider: "UNCONFIGURED",
      model: "not-dispatched",
      promptHash,
      parameters: {
        templateKey: template.templateKey,
        templateVersion: template.version,
        sourceQuestionTextProvided: false,
      },
      requestPayload: {
        reviewerInstruction: parsed.data.reviewerInstruction,
        sourceQuestionVersionId: sourceVersion.id,
        requestKind: parsed.data.requestKind,
        inputBoundary:
          "NuraPrep-authored version, approved template, and abstract coverage observations only.",
        sourceQuestionTextProvided: false,
        reviewerAttestedNoSourceText: true,
      },
      status: "PENDING",
      maxCostMicros: parsed.data.maxCostMicros,
    })
    .onConflictDoNothing({ target: generationRuns.idempotencyKey })
    .returning({ id: generationRuns.id });

  revalidatePath("/review/generation");
  revalidatePath(`/review/questions/${sourceVersion.id}`);
  return created
    ? {
        status: "success",
        message:
          "Generation request queued. No provider call occurs until a configured worker enforces this cost ceiling.",
      }
    : {
        status: "success",
        message: "An identical generation request is already queued.",
      };
}

export async function cancelPendingGenerationRun(
  _previous: GenerationActionState,
  formData: FormData,
): Promise<GenerationActionState> {
  const reviewer = await requireReviewer();
  const parsed = generationCancellationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid cancellation.",
    };
  }

  const [cancelled] = await getDatabase()
    .update(generationRuns)
    .set({
      status: "CANCELLED",
      cancelledBy: reviewer.id,
      cancellationReason: parsed.data.reason,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(generationRuns.id, parsed.data.runId),
        eq(generationRuns.status, "PENDING"),
      ),
    )
    .returning({ id: generationRuns.id });

  if (!cancelled) {
    return {
      status: "error",
      message: "Only a request that is still pending can be cancelled.",
    };
  }

  revalidatePath("/review/generation");
  return {
    status: "success",
    message: "Pending request cancelled with reviewer evidence.",
  };
}
