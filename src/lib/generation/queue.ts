import type { QuestionGenerationProvider } from "./provider";
import {
  executeGenerationJob,
  type GenerationExecutionResult,
  type GenerationWorkerRepository,
  type PendingGenerationJob,
} from "./worker";

export type GenerationClaim = {
  runId: string;
  claimToken: string;
  workerId: string;
  attemptCount: number;
  leaseExpiresAt: Date;
};

export interface GenerationQueueRepository extends GenerationWorkerRepository {
  claimNext(input: {
    workerId: string;
    leaseSeconds: number;
  }): Promise<GenerationClaim | undefined>;
  loadClaimed(
    claim: GenerationClaim,
  ): Promise<PendingGenerationJob | undefined>;
  heartbeat(input: {
    runId: string;
    claimToken: string;
    leaseSeconds: number;
  }): Promise<boolean>;
}

export type GenerationQueueResult =
  | { status: "IDLE" }
  | ({ runId: string; attemptCount: number } & GenerationExecutionResult);

export async function runNextGenerationJob(
  input: { workerId: string; leaseSeconds: number },
  provider: QuestionGenerationProvider,
  repository: GenerationQueueRepository,
): Promise<GenerationQueueResult> {
  const claim = await repository.claimNext(input);
  if (!claim) return { status: "IDLE" };

  const job = await repository.loadClaimed(claim);
  if (!job) {
    await repository.fail({
      runId: claim.runId,
      claimToken: claim.claimToken,
      provider: provider.provider,
      model: provider.model,
      failureCode: "JOB_LOAD_INVALID",
    });
    return {
      status: "FAILED",
      runId: claim.runId,
      attemptCount: claim.attemptCount,
      failureCode: "JOB_LOAD_INVALID",
    };
  }

  const result = await executeGenerationJob(job, provider, repository);
  return { ...result, runId: claim.runId, attemptCount: claim.attemptCount };
}
