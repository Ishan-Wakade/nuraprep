import { describe, expect, it, vi } from "vitest";

import {
  parseDatabaseUrl,
  runGenerationMaintenance,
} from "./generation-maintenance";

describe("generation maintenance Lambda", () => {
  it("sweeps expired runs without exposing the database credential", async () => {
    const log = vi.fn();
    const sweep = vi.fn().mockResolvedValue({
      exhaustedRuns: 2,
      retryableExpiredRuns: 3,
    });
    const result = await runGenerationMaintenance(
      { RUNTIME_SECRET_ARN: "arn:aws:secretsmanager:test" },
      {
        getRuntimeSecret: vi.fn().mockResolvedValue(
          JSON.stringify({
            DATABASE_URL: "postgresql://owner:secret@database.test/nuraprep",
          }),
        ),
        sweep,
        now: () => new Date("2026-09-13T12:00:00.000Z"),
        log,
      },
    );

    expect(sweep).toHaveBeenCalledWith(
      "postgresql://owner:secret@database.test/nuraprep",
    );
    expect(result).toEqual({
      exhaustedRuns: 2,
      retryableExpiredRuns: 3,
      completedAt: "2026-09-13T12:00:00.000Z",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("owner:secret");
  });

  it("fails closed when the secret ARN is missing", async () => {
    await expect(
      runGenerationMaintenance(
        {},
        {
          getRuntimeSecret: vi.fn(),
          sweep: vi.fn(),
          now: () => new Date(),
          log: vi.fn(),
        },
      ),
    ).rejects.toThrow("RUNTIME_SECRET_ARN_REQUIRED");
  });

  it("accepts only a PostgreSQL URL in the runtime secret", () => {
    expect(() => parseDatabaseUrl("not-json")).toThrow(
      "RUNTIME_SECRET_INVALID_JSON",
    );
    expect(() =>
      parseDatabaseUrl(JSON.stringify({ DATABASE_URL: "" })),
    ).toThrow("DATABASE_URL_MISSING");
    expect(() =>
      parseDatabaseUrl(JSON.stringify({ DATABASE_URL: "https://example.com" })),
    ).toThrow("DATABASE_URL_INVALID_PROTOCOL");
  });
});
