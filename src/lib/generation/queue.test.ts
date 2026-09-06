import { describe, expect, it, vi } from "vitest";

import type { QuestionGenerationProvider } from "./provider";
import {
  runGenerationBatch,
  runNextGenerationJob,
  type GenerationClaim,
  type GenerationQueueRepository,
} from "./queue";

const claim: GenerationClaim = {
  runId: "10000000-0000-4000-8000-000000000001",
  claimToken: "claim-token",
  workerId: "test-worker",
  attemptCount: 1,
  leaseExpiresAt: new Date("2026-09-06T00:05:00Z"),
  reservedCostMicros: 700,
};

function harness(
  job: Awaited<ReturnType<GenerationQueueRepository["loadClaimed"]>>,
) {
  const repository: GenerationQueueRepository = {
    claimNext: vi.fn().mockResolvedValue(claim),
    loadClaimed: vi.fn().mockResolvedValue(job),
    heartbeat: vi.fn().mockResolvedValue(true),
    complete: vi.fn(),
    fail: vi.fn(),
  };
  const provider: QuestionGenerationProvider = {
    provider: "test-provider",
    model: "test-model",
    estimateMaximumCostMicros: vi.fn().mockResolvedValue(0),
    generate: vi.fn(),
  };
  return { repository, provider };
}

describe("generation queue runner", () => {
  it("returns idle without loading or dispatching when no run is claimable", async () => {
    const test = harness(undefined);
    vi.mocked(test.repository.claimNext).mockResolvedValue(undefined);

    await expect(
      runNextGenerationJob(
        {
          workerId: "test-worker",
          leaseSeconds: 300,
          maxClaimCostMicros: 1_000,
        },
        test.provider,
        test.repository,
      ),
    ).resolves.toEqual({ status: "IDLE" });
    expect(test.repository.loadClaimed).not.toHaveBeenCalled();
    expect(test.provider.generate).not.toHaveBeenCalled();
  });

  it("fails a claimed run whose stored payload cannot be loaded", async () => {
    const test = harness(undefined);

    await expect(
      runNextGenerationJob(
        {
          workerId: "test-worker",
          leaseSeconds: 300,
          maxClaimCostMicros: 1_000,
        },
        test.provider,
        test.repository,
      ),
    ).resolves.toEqual({
      status: "FAILED",
      runId: claim.runId,
      attemptCount: 1,
      reservedCostMicros: 700,
      failureCode: "JOB_LOAD_INVALID",
    });
    expect(test.repository.fail).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: claim.runId,
        claimToken: claim.claimToken,
        failureCode: "JOB_LOAD_INVALID",
      }),
    );
    expect(test.provider.generate).not.toHaveBeenCalled();
  });

  it("reserves worst-case costs and stops before exceeding a batch budget", async () => {
    const test = harness(undefined);
    const claims: GenerationClaim[] = [
      { ...claim, runId: "run-1", reservedCostMicros: 600 },
      { ...claim, runId: "run-2", reservedCostMicros: 400 },
      { ...claim, runId: "run-3", reservedCostMicros: 300 },
    ];
    vi.mocked(test.repository.claimNext).mockImplementation(
      async ({ maxClaimCostMicros }) => {
        const next = claims[0];
        if (!next || next.reservedCostMicros > maxClaimCostMicros) {
          return undefined;
        }
        return claims.shift();
      },
    );

    await expect(
      runGenerationBatch(
        {
          workerId: "test-worker",
          leaseSeconds: 300,
          maxJobs: 10,
          budgetMicros: 1_000,
        },
        test.provider,
        test.repository,
      ),
    ).resolves.toMatchObject({
      jobsRun: 2,
      succeeded: 0,
      failed: 2,
      reservedCostMicros: 1_000,
      remainingBudgetMicros: 0,
    });
    expect(test.repository.claimNext).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ maxClaimCostMicros: 1_000 }),
    );
    expect(test.repository.claimNext).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ maxClaimCostMicros: 400 }),
    );
    expect(test.repository.claimNext).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ maxClaimCostMicros: 0 }),
    );
  });

  it("rejects invalid batch limits before claiming work", async () => {
    const test = harness(undefined);

    await expect(
      runGenerationBatch(
        {
          workerId: "test-worker",
          leaseSeconds: 300,
          maxJobs: 0,
          budgetMicros: 1_000,
        },
        test.provider,
        test.repository,
      ),
    ).rejects.toThrow("GENERATION_BATCH_JOB_LIMIT_INVALID");

    await expect(
      runGenerationBatch(
        {
          workerId: "test-worker",
          leaseSeconds: 300,
          maxJobs: 1,
          budgetMicros: 500_000_001,
        },
        test.provider,
        test.repository,
      ),
    ).rejects.toThrow("GENERATION_BATCH_BUDGET_INVALID");
    expect(test.repository.claimNext).not.toHaveBeenCalled();
  });
});
