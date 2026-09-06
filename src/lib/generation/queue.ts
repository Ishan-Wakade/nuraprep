import type { QuestionGenerationProvider } from "./provider";
import {
  executeGenerationJob,
  type GenerationExecutionResult,
  type GenerationWorkerRepository,
  type PendingGenerationJob,
} from "./worker";

const MAX_BATCH_JOBS = 100;
const MAX_JOB_COST_MICROS = 5_000_000;
const MAX_BATCH_BUDGET_MICROS = MAX_BATCH_JOBS * MAX_JOB_COST_MICROS;

export type GenerationClaim = {
  runId: string;
  claimToken: string;
  workerId: string;
  attemptCount: number;
  leaseExpiresAt: Date;
  reservedCostMicros: number;
};

export interface GenerationQueueRepository extends GenerationWorkerRepository {
  claimNext(input: {
    workerId: string;
    leaseSeconds: number;
    maxClaimCostMicros: number;
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
  | ({
      runId: string;
      attemptCount: number;
      reservedCostMicros: number;
    } & GenerationExecutionResult);

export async function runNextGenerationJob(
  input: {
    workerId: string;
    leaseSeconds: number;
    maxClaimCostMicros: number;
  },
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
      reservedCostMicros: claim.reservedCostMicros,
      failureCode: "JOB_LOAD_INVALID",
    };
  }

  const result = await executeGenerationJob(job, provider, repository);
  return {
    ...result,
    runId: claim.runId,
    attemptCount: claim.attemptCount,
    reservedCostMicros: claim.reservedCostMicros,
  };
}

export type GenerationBatchResult = {
  jobsRun: number;
  succeeded: number;
  failed: number;
  reservedCostMicros: number;
  remainingBudgetMicros: number;
  results: Exclude<GenerationQueueResult, { status: "IDLE" }>[];
};

export async function runGenerationBatch(
  input: {
    workerId: string;
    leaseSeconds: number;
    maxJobs: number;
    budgetMicros: number;
  },
  provider: QuestionGenerationProvider,
  repository: GenerationQueueRepository,
): Promise<GenerationBatchResult> {
  if (
    !Number.isSafeInteger(input.maxJobs) ||
    input.maxJobs < 1 ||
    input.maxJobs > MAX_BATCH_JOBS
  ) {
    throw new Error("GENERATION_BATCH_JOB_LIMIT_INVALID");
  }
  if (
    !Number.isSafeInteger(input.budgetMicros) ||
    input.budgetMicros < 0 ||
    input.budgetMicros > MAX_BATCH_BUDGET_MICROS
  ) {
    throw new Error("GENERATION_BATCH_BUDGET_INVALID");
  }

  let remainingBudgetMicros = input.budgetMicros;
  const results: Exclude<GenerationQueueResult, { status: "IDLE" }>[] = [];
  while (results.length < input.maxJobs) {
    const result = await runNextGenerationJob(
      {
        workerId: input.workerId,
        leaseSeconds: input.leaseSeconds,
        maxClaimCostMicros: remainingBudgetMicros,
      },
      provider,
      repository,
    );
    if (result.status === "IDLE") break;
    results.push(result);
    remainingBudgetMicros -= result.reservedCostMicros;
  }

  return {
    jobsRun: results.length,
    succeeded: results.filter((result) => result.status === "SUCCEEDED").length,
    failed: results.filter((result) => result.status === "FAILED").length,
    reservedCostMicros: input.budgetMicros - remainingBudgetMicros,
    remainingBudgetMicros,
    results,
  };
}
