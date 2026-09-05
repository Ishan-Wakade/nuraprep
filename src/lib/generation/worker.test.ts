import { describe, expect, it, vi } from "vitest";

import type { GeneratedCandidate, GenerationRequest } from "./contracts";
import type {
  GenerationEnvelope,
  QuestionGenerationProvider,
} from "./provider";
import {
  executeGenerationJob,
  type GenerationWorkerRepository,
} from "./worker";

const request: GenerationRequest = {
  sourceQuestionVersionId: "10000000-0000-4000-8000-000000000001",
  templateId: "20000000-0000-4000-8000-000000000001",
  requestKind: "FULL_REVISION",
  reviewerInstruction: "Use a new context and explain the multiplication step.",
  maxCostMicros: 1_000,
  noSourceTextAttestation: "on",
};

const candidate: GeneratedCandidate = {
  content: {
    questionType: "NUMERIC",
    prompt:
      "A clinic places 7 masks in each of 6 kits. How many masks are used?",
    answerSpec: {
      type: "numeric",
      value: 42,
      tolerance: 0,
      toleranceMode: "absolute",
      acceptedUnits: [],
      unitRequired: false,
    },
    explanation: "There are 6 equal groups of 7 masks, so 6 × 7 = 42.",
    distractorRationales: {},
  },
  verificationSpec: {
    kind: "numeric_result",
    expression: [6, 7, "multiply"],
    tolerance: 0,
  },
  learningObjective: "Multiply whole numbers in an equal-groups context.",
  difficulty: "FOUNDATIONAL",
  difficultyRationale: "Requires one direct whole-number multiplication step.",
  estimatedSeconds: 60,
  calculatorPolicy: "NOT_NEEDED",
  commonMisconceptions: [],
  misconceptionRules: [],
  tutorGuidance: null,
};

const envelope: GenerationEnvelope = {
  execution: {
    runId: "run-envelope",
    idempotencyKey: "test-idempotency-key",
    maxCostMicros: 1_000,
  },
  template: {
    key: "arithmetic.groups",
    version: 1,
    instructions: "Generate one original equal-groups question.",
    parameterConstraints: {},
    prohibitedPatterns: ["numbers-only variation"],
    validatorContract: {},
  },
  request,
  internalQuestionVersion: {
    content: candidate.content,
    verificationSpec: candidate.verificationSpec,
    learningObjective: candidate.learningObjective,
    difficulty: candidate.difficulty,
    difficultyRationale: candidate.difficultyRationale,
    estimatedSeconds: candidate.estimatedSeconds,
    calculatorPolicy: candidate.calculatorPolicy,
    commonMisconceptions: candidate.commonMisconceptions,
    misconceptionRules: candidate.misconceptionRules,
    tutorGuidance: candidate.tutorGuidance,
  },
  abstractCoverageObservations: [],
  sourceQuestionTextProvided: false,
};

function harness(options?: {
  maximumEstimate?: number;
  actualCost?: number;
  candidate?: Record<string, unknown>;
  providerError?: boolean;
}) {
  const complete = vi.fn<GenerationWorkerRepository["complete"]>();
  const fail = vi.fn<GenerationWorkerRepository["fail"]>();
  const generate = options?.providerError
    ? vi
        .fn<QuestionGenerationProvider["generate"]>()
        .mockRejectedValue(new Error("provider unavailable"))
    : vi.fn<QuestionGenerationProvider["generate"]>().mockResolvedValue({
        candidate: options?.candidate ?? candidate,
        usage: {
          inputTokens: 100,
          outputTokens: 100,
          estimatedCostMicros: options?.actualCost ?? 500,
        },
      });
  const provider: QuestionGenerationProvider = {
    provider: "test-provider",
    model: "test-model",
    estimateMaximumCostMicros: vi
      .fn<QuestionGenerationProvider["estimateMaximumCostMicros"]>()
      .mockResolvedValue(options?.maximumEstimate ?? 750),
    generate,
  };
  return {
    provider,
    repository: { complete, fail },
    complete,
    fail,
    generate,
  };
}

function job(runId: string, requestEnvelope: GenerationEnvelope = envelope) {
  return {
    runId,
    maxCostMicros: 1_000,
    envelope: {
      ...requestEnvelope,
      execution: {
        ...requestEnvelope.execution,
        runId,
        maxCostMicros: 1_000,
      },
    },
  };
}

describe("generation worker", () => {
  it("blocks dispatch when the provider estimate exceeds the ceiling", async () => {
    const test = harness({ maximumEstimate: 1_001 });
    const result = await executeGenerationJob(
      job("run-1"),
      test.provider,
      test.repository,
    );
    expect(result).toEqual({
      status: "FAILED",
      failureCode: "COST_CEILING_PRECHECK",
    });
    expect(test.generate).not.toHaveBeenCalled();
    expect(test.fail).toHaveBeenCalledOnce();
  });

  it("rejects malformed provider output without persisting a candidate", async () => {
    const test = harness({ candidate: { prompt: "incomplete" } });
    const result = await executeGenerationJob(
      job("run-2"),
      test.provider,
      test.repository,
    );
    expect(result).toMatchObject({ failureCode: "CANDIDATE_SCHEMA_INVALID" });
    expect(test.complete).not.toHaveBeenCalled();
  });

  it("rejects a provider-reported cost overrun", async () => {
    const test = harness({ actualCost: 1_001 });
    const result = await executeGenerationJob(
      job("run-3"),
      test.provider,
      test.repository,
    );
    expect(result).toMatchObject({ failureCode: "PROVIDER_COST_OVERRUN" });
    expect(test.complete).not.toHaveBeenCalled();
  });

  it("rejects invalid provider usage accounting", async () => {
    const test = harness({ actualCost: -1 });
    const result = await executeGenerationJob(
      job("run-invalid-usage"),
      test.provider,
      test.repository,
    );
    expect(result).toMatchObject({ failureCode: "PROVIDER_USAGE_INVALID" });
    expect(test.complete).not.toHaveBeenCalled();
  });

  it("persists only a complete, validated candidate", async () => {
    const test = harness();
    const result = await executeGenerationJob(
      job("run-4"),
      test.provider,
      test.repository,
    );
    expect(result).toEqual({ status: "SUCCEEDED" });
    expect(test.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-4",
        candidate,
        usage: expect.objectContaining({ estimatedCostMicros: 500 }),
      }),
    );
    expect(test.fail).not.toHaveBeenCalled();
  });

  it("allows an explanation-only result to change only the explanation", async () => {
    const explanationCandidate = structuredClone(candidate);
    explanationCandidate.content.explanation =
      "Six kits each use 7 masks. Multiply the equal groups: 6 × 7 = 42 masks.";
    const test = harness({ candidate: explanationCandidate });
    const result = await executeGenerationJob(
      job("run-5", {
        ...envelope,
        request: { ...request, requestKind: "EXPLANATION_ONLY" },
      }),
      test.provider,
      test.repository,
    );
    expect(result).toEqual({ status: "SUCCEEDED" });
  });

  it("rejects hidden prompt changes in an explanation-only result", async () => {
    const changedCandidate = structuredClone(candidate);
    changedCandidate.content.explanation = "Multiply 6 by 7 to get 42.";
    changedCandidate.content.prompt =
      "A changed prompt must not pass explanation-only scope validation.";
    const test = harness({ candidate: changedCandidate });
    const result = await executeGenerationJob(
      job("run-6", {
        ...envelope,
        request: { ...request, requestKind: "EXPLANATION_ONLY" },
      }),
      test.provider,
      test.repository,
    );
    expect(result).toMatchObject({
      failureCode: "REGENERATION_SCOPE_VIOLATION",
    });
    expect(test.complete).not.toHaveBeenCalled();
  });
});
