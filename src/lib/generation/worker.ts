import { generatedCandidateSchema, type GeneratedCandidate } from "./contracts";
import type {
  GenerationEnvelope,
  GenerationUsage,
  QuestionGenerationProvider,
} from "./provider";
import { z } from "zod";
import {
  validateMathVerification,
  validateMisconceptionRules,
  validateQuestionContent,
} from "@/lib/questions/validation";

export type PendingGenerationJob = {
  runId: string;
  claimToken: string;
  maxCostMicros: number;
  envelope: GenerationEnvelope;
};

export interface GenerationWorkerRepository {
  complete(input: {
    runId: string;
    claimToken: string;
    provider: string;
    model: string;
    candidate: GeneratedCandidate;
    usage: GenerationUsage;
    providerRequestId?: string;
  }): Promise<void>;
  fail(input: {
    runId: string;
    claimToken: string;
    provider: string;
    model: string;
    failureCode: GenerationFailureCode;
  }): Promise<void>;
}

export type GenerationFailureCode =
  | "JOB_LOAD_INVALID"
  | "REQUEST_IDENTITY_MISMATCH"
  | "COST_CEILING_PRECHECK"
  | "PROVIDER_ERROR"
  | "PROVIDER_USAGE_INVALID"
  | "PROVIDER_COST_OVERRUN"
  | "CANDIDATE_SCHEMA_INVALID"
  | "CANDIDATE_CONTENT_INVALID"
  | "CANDIDATE_MATH_INVALID"
  | "CANDIDATE_MISCONCEPTION_INVALID"
  | "REGENERATION_SCOPE_VIOLATION";

export type GenerationExecutionResult =
  | { status: "SUCCEEDED" }
  | { status: "FAILED"; failureCode: GenerationFailureCode };

export async function executeGenerationJob(
  job: PendingGenerationJob,
  provider: QuestionGenerationProvider,
  repository: GenerationWorkerRepository,
): Promise<GenerationExecutionResult> {
  if (
    job.runId !== job.envelope.execution.runId ||
    job.maxCostMicros !== job.envelope.execution.maxCostMicros
  ) {
    return fail("REQUEST_IDENTITY_MISMATCH", job, provider, repository);
  }
  let maximumEstimate: number;
  try {
    maximumEstimate = await provider.estimateMaximumCostMicros(job.envelope);
  } catch {
    return fail("PROVIDER_ERROR", job, provider, repository);
  }
  if (!Number.isSafeInteger(maximumEstimate) || maximumEstimate < 0) {
    return fail("PROVIDER_USAGE_INVALID", job, provider, repository);
  }
  if (maximumEstimate > job.maxCostMicros) {
    return fail("COST_CEILING_PRECHECK", job, provider, repository);
  }

  let providerResult;
  try {
    providerResult = await provider.generate(job.envelope);
  } catch {
    return fail("PROVIDER_ERROR", job, provider, repository);
  }

  const usage = generationUsageSchema.safeParse(providerResult.usage);
  if (!usage.success) {
    return fail("PROVIDER_USAGE_INVALID", job, provider, repository);
  }
  if (usage.data.estimatedCostMicros > job.maxCostMicros) {
    return fail("PROVIDER_COST_OVERRUN", job, provider, repository);
  }

  const parsedCandidate = generatedCandidateSchema.safeParse(
    providerResult.candidate,
  );
  if (!parsedCandidate.success) {
    return fail("CANDIDATE_SCHEMA_INVALID", job, provider, repository);
  }

  const contentResult = validateQuestionContent(parsedCandidate.data.content);
  if (!contentResult.valid) {
    return fail("CANDIDATE_CONTENT_INVALID", job, provider, repository);
  }
  const mathResult = validateMathVerification(
    contentResult.content,
    parsedCandidate.data.verificationSpec,
  );
  if (!mathResult.valid) {
    return fail("CANDIDATE_MATH_INVALID", job, provider, repository);
  }
  if (
    validateMisconceptionRules(
      contentResult.content,
      parsedCandidate.data.commonMisconceptions,
      parsedCandidate.data.misconceptionRules,
    ).length > 0
  ) {
    return fail("CANDIDATE_MISCONCEPTION_INVALID", job, provider, repository);
  }
  if (!respectsRegenerationScope(job.envelope, parsedCandidate.data)) {
    return fail("REGENERATION_SCOPE_VIOLATION", job, provider, repository);
  }

  await repository.complete({
    runId: job.runId,
    claimToken: job.claimToken,
    provider: provider.provider,
    model: provider.model,
    candidate: parsedCandidate.data,
    usage: usage.data,
    providerRequestId: providerResult.providerRequestId,
  });
  return { status: "SUCCEEDED" };
}

const generationUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  estimatedCostMicros: z.number().int().nonnegative(),
});

export function respectsRegenerationScope(
  envelope: GenerationEnvelope,
  candidate: GeneratedCandidate,
) {
  const source = envelope.internalQuestionVersion;
  if (candidate.content.questionType !== source.content.questionType) {
    return false;
  }
  if (envelope.request.requestKind === "FULL_REVISION") return true;

  const stableMetadata = {
    verificationSpec: candidate.verificationSpec,
    learningObjective: candidate.learningObjective,
    difficulty: candidate.difficulty,
    difficultyRationale: candidate.difficultyRationale,
    estimatedSeconds: candidate.estimatedSeconds,
    calculatorPolicy: candidate.calculatorPolicy,
    commonMisconceptions: candidate.commonMisconceptions,
    misconceptionRules: candidate.misconceptionRules,
    tutorGuidance: candidate.tutorGuidance,
  };
  const sourceMetadata = {
    verificationSpec: source.verificationSpec,
    learningObjective: source.learningObjective,
    difficulty: source.difficulty,
    difficultyRationale: source.difficultyRationale,
    estimatedSeconds: source.estimatedSeconds,
    calculatorPolicy: source.calculatorPolicy,
    commonMisconceptions: source.commonMisconceptions,
    misconceptionRules: source.misconceptionRules,
    tutorGuidance: source.tutorGuidance,
  };
  if (!same(stableMetadata, sourceMetadata)) return false;

  if (envelope.request.requestKind === "EXPLANATION_ONLY") {
    return same(
      { ...candidate.content, explanation: source.content.explanation },
      source.content,
    );
  }

  if (envelope.request.requestKind === "DISTRACTORS_ONLY") {
    if (
      !["SINGLE_CHOICE", "MULTIPLE_SELECT"].includes(
        candidate.content.questionType,
      )
    ) {
      return false;
    }
    const candidateStableContent = {
      ...candidate.content,
      choices: source.content.choices,
      distractorRationales: source.content.distractorRationales,
    };
    if (!same(candidateStableContent, source.content)) return false;

    const correctIds =
      source.content.answerSpec.type === "single_choice"
        ? [source.content.answerSpec.choiceId]
        : source.content.answerSpec.type === "multiple_select"
          ? source.content.answerSpec.choiceIds
          : [];
    const sourceChoices = new Map(
      source.content.choices?.map((choice) => [choice.id, choice.content]),
    );
    const candidateChoices = new Map(
      candidate.content.choices?.map((choice) => [choice.id, choice.content]),
    );
    return correctIds.every(
      (id) => sourceChoices.get(id) === candidateChoices.get(id),
    );
  }

  return false;
}

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function fail(
  failureCode: GenerationFailureCode,
  job: PendingGenerationJob,
  provider: QuestionGenerationProvider,
  repository: GenerationWorkerRepository,
): Promise<GenerationExecutionResult> {
  await repository.fail({
    runId: job.runId,
    claimToken: job.claimToken,
    provider: provider.provider,
    model: provider.model,
    failureCode,
  });
  return { status: "FAILED", failureCode };
}
