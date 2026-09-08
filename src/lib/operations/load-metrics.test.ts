import { describe, expect, it } from "vitest";

import { evaluateLoadThresholds, summarizeLoadSamples } from "./load-metrics";

describe("load-smoke metrics", () => {
  it("uses nearest-rank percentiles and preserves status counts", () => {
    const summary = summarizeLoadSamples(
      [
        { durationMilliseconds: 10, status: 200, ok: true },
        { durationMilliseconds: 20, status: 200, ok: true },
        { durationMilliseconds: 30, status: 503, ok: false },
        { durationMilliseconds: 40, status: null, ok: false },
      ],
      1_000,
    );

    expect(summary).toMatchObject({
      requests: 4,
      succeeded: 2,
      failed: 2,
      errorRate: 0.5,
      throughputPerSecond: 4,
      latencyMilliseconds: { p50: 20, p95: 40, p99: 40, max: 40 },
      statuses: { "200": 2, "503": 1, "network-error": 1 },
    });
  });

  it("reports every breached threshold", () => {
    const summary = summarizeLoadSamples(
      [
        { durationMilliseconds: 100, status: 200, ok: true },
        { durationMilliseconds: 900, status: 500, ok: false },
      ],
      1_000,
    );

    expect(
      evaluateLoadThresholds(summary, {
        maximumErrorRate: 0,
        maximumP95Milliseconds: 500,
      }),
    ).toEqual([
      "error rate 50.00% exceeded 0.00%",
      "p95 900.0 ms exceeded 500 ms",
    ]);
  });

  it("rejects an empty or zero-duration measurement", () => {
    expect(() => summarizeLoadSamples([], 1)).toThrow();
    expect(() =>
      summarizeLoadSamples(
        [{ durationMilliseconds: 1, status: 200, ok: true }],
        0,
      ),
    ).toThrow();
  });
});
