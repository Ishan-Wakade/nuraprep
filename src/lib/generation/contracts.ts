import { createHash } from "node:crypto";

import { z } from "zod";

export const generationRequestKinds = [
  "FULL_REVISION",
  "EXPLANATION_ONLY",
  "DISTRACTORS_ONLY",
] as const;

export const generationRequestSchema = z.object({
  sourceQuestionVersionId: z.uuid(),
  templateId: z.uuid(),
  requestKind: z.enum(generationRequestKinds),
  reviewerInstruction: z.string().trim().min(10).max(2_000),
  maxCostMicros: z.coerce.number().int().min(0).max(5_000_000),
  noSourceTextAttestation: z.literal("on"),
});

export type GenerationRequest = z.infer<typeof generationRequestSchema>;

export function createGenerationIdempotencyKey(request: GenerationRequest) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        sourceQuestionVersionId: request.sourceQuestionVersionId,
        templateId: request.templateId,
        requestKind: request.requestKind,
        reviewerInstruction: request.reviewerInstruction
          .trim()
          .replaceAll(/\s+/g, " "),
        maxCostMicros: request.maxCostMicros,
      }),
    )
    .digest("hex");
}

export function createGenerationPromptHash(input: {
  templateKey: string;
  templateVersion: number;
  templateInstructions: string;
  request: GenerationRequest;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        templateKey: input.templateKey,
        templateVersion: input.templateVersion,
        templateInstructions: input.templateInstructions,
        requestKind: input.request.requestKind,
        reviewerInstruction: input.request.reviewerInstruction,
      }),
    )
    .digest("hex");
}
