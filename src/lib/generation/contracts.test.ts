import { describe, expect, it } from "vitest";

import {
  createGenerationIdempotencyKey,
  generationRequestSchema,
} from "./contracts";

const request = {
  sourceQuestionVersionId: "10000000-0000-4000-8000-000000000001",
  templateId: "20000000-0000-4000-8000-000000000001",
  requestKind: "EXPLANATION_ONLY" as const,
  reviewerInstruction:
    "Explain the unit conversion in one additional intermediate step.",
  maxCostMicros: 25_000,
  noSourceTextAttestation: "on" as const,
};

describe("generation request contract", () => {
  it("creates the same key for semantically identical whitespace", () => {
    expect(createGenerationIdempotencyKey(request)).toBe(
      createGenerationIdempotencyKey({
        ...request,
        reviewerInstruction:
          "  Explain the unit conversion in one  additional intermediate step. ",
      }),
    );
  });

  it("changes the key when the regeneration scope changes", () => {
    expect(createGenerationIdempotencyKey(request)).not.toBe(
      createGenerationIdempotencyKey({
        ...request,
        requestKind: "FULL_REVISION",
      }),
    );
  });

  it("rejects unbounded cost and underspecified requests", () => {
    expect(
      generationRequestSchema.safeParse({
        ...request,
        reviewerInstruction: "fix it",
        maxCostMicros: 5_000_001,
      }).success,
    ).toBe(false);
  });
});
