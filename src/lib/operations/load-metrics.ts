export type LoadSample = {
  durationMilliseconds: number;
  status: number | null;
  ok: boolean;
};

export type LoadSummary = {
  requests: number;
  succeeded: number;
  failed: number;
  errorRate: number;
  throughputPerSecond: number;
  latencyMilliseconds: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  statuses: Record<string, number>;
};

export function summarizeLoadSamples(
  samples: LoadSample[],
  elapsedMilliseconds: number,
): LoadSummary {
  if (samples.length === 0 || elapsedMilliseconds <= 0) {
    throw new Error("Load summary requires samples and positive elapsed time.");
  }

  const durations = samples
    .map((sample) => sample.durationMilliseconds)
    .sort((left, right) => left - right);
  const failed = samples.filter((sample) => !sample.ok).length;
  const statuses = samples.reduce<Record<string, number>>((counts, sample) => {
    const key =
      sample.status === null ? "network-error" : String(sample.status);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  return {
    requests: samples.length,
    succeeded: samples.length - failed,
    failed,
    errorRate: failed / samples.length,
    throughputPerSecond: samples.length / (elapsedMilliseconds / 1_000),
    latencyMilliseconds: {
      p50: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
      p99: percentile(durations, 0.99),
      max: durations.at(-1)!,
    },
    statuses,
  };
}

export function evaluateLoadThresholds(
  summary: LoadSummary,
  thresholds: { maximumErrorRate: number; maximumP95Milliseconds: number },
) {
  const failures: string[] = [];
  if (summary.errorRate > thresholds.maximumErrorRate) {
    failures.push(
      `error rate ${(summary.errorRate * 100).toFixed(2)}% exceeded ${(thresholds.maximumErrorRate * 100).toFixed(2)}%`,
    );
  }
  if (summary.latencyMilliseconds.p95 > thresholds.maximumP95Milliseconds) {
    failures.push(
      `p95 ${summary.latencyMilliseconds.p95.toFixed(1)} ms exceeded ${thresholds.maximumP95Milliseconds} ms`,
    );
  }
  return failures;
}

function percentile(sortedValues: number[], quantile: number) {
  const rank = Math.max(0, Math.ceil(quantile * sortedValues.length) - 1);
  return sortedValues[rank]!;
}
