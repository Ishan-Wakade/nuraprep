import { performance } from "node:perf_hooks";

import {
  evaluateLoadThresholds,
  type LoadSample,
  summarizeLoadSamples,
} from "../src/lib/operations/load-metrics";

const baseUrl = new URL(process.env.LOAD_BASE_URL ?? "http://localhost:3000");
const requestCount = boundedInteger("LOAD_REQUESTS", 100, 1, 10_000);
const concurrency = boundedInteger("LOAD_CONCURRENCY", 10, 1, 100);
const timeoutMilliseconds = boundedInteger(
  "LOAD_TIMEOUT_MS",
  5_000,
  100,
  60_000,
);
const maximumP95Milliseconds = boundedInteger(
  "LOAD_MAX_P95_MS",
  1_500,
  1,
  60_000,
);
const maximumErrorRate = boundedNumber("LOAD_MAX_ERROR_RATE", 0, 0, 1);
const targets = ["/api/health", "/", "/practice"];

if (baseUrl.username || baseUrl.password) {
  throw new Error("LOAD_BASE_URL must not contain credentials.");
}
if (
  !["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname) &&
  process.env.ALLOW_REMOTE_LOAD_TEST !== "true"
) {
  throw new Error(
    "Remote load tests require ALLOW_REMOTE_LOAD_TEST=true and authorization from the environment owner.",
  );
}

async function main() {
  const health = await fetch(new URL("/api/health", baseUrl), {
    signal: AbortSignal.timeout(timeoutMilliseconds),
  });
  if (!health.ok) {
    throw new Error(`Health preflight failed with HTTP ${health.status}.`);
  }
  await health.arrayBuffer();

  const samples: LoadSample[] = [];
  let nextRequest = 0;
  const startedAt = performance.now();
  await Promise.all(
    Array.from({ length: Math.min(concurrency, requestCount) }, async () => {
      while (true) {
        const requestIndex = nextRequest++;
        if (requestIndex >= requestCount) return;

        const requestStartedAt = performance.now();
        let status: number | null = null;
        let ok = false;
        try {
          const response = await fetch(
            new URL(targets[requestIndex % targets.length]!, baseUrl),
            {
              cache: "no-store",
              redirect: "manual",
              signal: AbortSignal.timeout(timeoutMilliseconds),
            },
          );
          status = response.status;
          ok = response.ok;
          await response.arrayBuffer();
        } catch {
          // Network failures are counted without printing potentially sensitive URLs.
        }
        samples.push({
          durationMilliseconds: performance.now() - requestStartedAt,
          status,
          ok,
        });
      }
    }),
  );
  const elapsedMilliseconds = performance.now() - startedAt;
  const summary = summarizeLoadSamples(samples, elapsedMilliseconds);
  const failures = evaluateLoadThresholds(summary, {
    maximumErrorRate,
    maximumP95Milliseconds,
  });

  console.log(
    JSON.stringify(
      {
        configuration: {
          origin: baseUrl.origin,
          requestCount,
          concurrency,
          timeoutMilliseconds,
          targets,
          thresholds: { maximumErrorRate, maximumP95Milliseconds },
        },
        elapsedMilliseconds,
        summary,
        thresholdFailures: failures,
      },
      null,
      2,
    ),
  );

  if (failures.length > 0) process.exitCode = 1;
}

void main();

function boundedInteger(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${name} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return parsed;
}

function boundedNumber(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be a number from ${minimum} to ${maximum}.`);
  }
  return parsed;
}
