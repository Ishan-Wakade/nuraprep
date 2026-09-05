import type { GenerationRequest, GeneratedCandidate } from "./contracts";
import type {
  MathVerificationSpec,
  QuestionContent,
} from "@/lib/questions/contracts";

export type GenerationSourceSnapshot = Omit<
  GeneratedCandidate,
  "content" | "verificationSpec"
> & {
  content: QuestionContent;
  verificationSpec: MathVerificationSpec | null;
};

export type GenerationEnvelope = {
  execution: {
    runId: string;
    idempotencyKey: string;
    maxCostMicros: number;
  };
  template: {
    key: string;
    version: number;
    instructions: string;
    parameterConstraints: Record<string, unknown>;
    prohibitedPatterns: string[];
    validatorContract: Record<string, unknown>;
  };
  request: GenerationRequest;
  internalQuestionVersion: GenerationSourceSnapshot;
  abstractCoverageObservations: string[];
  sourceQuestionTextProvided: false;
};

export type GenerationUsage = {
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicros: number;
};

export type GenerationProviderResult = {
  candidate: Record<string, unknown>;
  usage: GenerationUsage;
  providerRequestId?: string;
};

/**
 * Provider adapters receive only NuraPrep-authored content, approved template
 * controls, and human-authored abstract coverage observations. Adapters must
 * reject work before dispatch when their estimated maximum can exceed the
 * request's cost ceiling.
 */
export interface QuestionGenerationProvider {
  readonly provider: string;
  readonly model: string;
  estimateMaximumCostMicros(envelope: GenerationEnvelope): Promise<number>;
  generate(envelope: GenerationEnvelope): Promise<GenerationProviderResult>;
}
