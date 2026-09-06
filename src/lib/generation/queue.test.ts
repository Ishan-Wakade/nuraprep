import { describe, expect, it, vi } from "vitest";

import type { QuestionGenerationProvider } from "./provider";
import {
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
        { workerId: "test-worker", leaseSeconds: 300 },
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
        { workerId: "test-worker", leaseSeconds: 300 },
        test.provider,
        test.repository,
      ),
    ).resolves.toEqual({
      status: "FAILED",
      runId: claim.runId,
      attemptCount: 1,
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
});
