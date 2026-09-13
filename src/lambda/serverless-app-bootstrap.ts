import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { spawn } from "node:child_process";

const REQUIRED_KEYS = [
  "APP_ENV",
  "DEPLOYMENT_PLATFORM",
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "TRUSTED_PROXY_CIDRS",
  "BILLING_ENABLED",
  "DEV_REVIEWER_ENABLED",
  "DEV_LEARNER_ENABLED",
] as const;

const OPTIONAL_KEYS = [
  "STRIPE_MODE",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "STRIPE_PREMIUM_PRODUCT_ID",
] as const;

const ALLOWED_KEYS = new Set<string>([...REQUIRED_KEYS, ...OPTIONAL_KEYS]);

export function parseServerlessRuntimeConfiguration(
  serialized: string,
): Record<string, string> {
  let input: unknown;
  try {
    input = JSON.parse(serialized);
  } catch {
    throw new Error("RUNTIME_PARAMETER_INVALID_JSON");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("RUNTIME_PARAMETER_INVALID_SHAPE");
  }

  const configuration: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`RUNTIME_PARAMETER_KEY_NOT_ALLOWED:${key}`);
    }
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`RUNTIME_PARAMETER_VALUE_INVALID:${key}`);
    }
    configuration[key] = value;
  }

  for (const key of REQUIRED_KEYS) {
    if (!configuration[key]) {
      throw new Error(`RUNTIME_PARAMETER_KEY_MISSING:${key}`);
    }
  }

  if (
    configuration.APP_ENV !== "production" ||
    configuration.DEPLOYMENT_PLATFORM !== "AWS" ||
    configuration.DEV_REVIEWER_ENABLED !== "false" ||
    configuration.DEV_LEARNER_ENABLED !== "false"
  ) {
    throw new Error("RUNTIME_PARAMETER_UNSAFE_PRODUCTION_MODE");
  }
  if (configuration.TRUSTED_PROXY_CIDRS !== "127.0.0.1/32,::1/128") {
    throw new Error("RUNTIME_PARAMETER_UNSAFE_PROXY_TRUST");
  }

  const origin = new URL(configuration.NEXT_PUBLIC_APP_URL);
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    (origin.pathname !== "/" && origin.pathname !== "")
  ) {
    throw new Error("RUNTIME_PARAMETER_INVALID_APP_ORIGIN");
  }

  const database = new URL(configuration.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(database.protocol)) {
    throw new Error("RUNTIME_PARAMETER_INVALID_DATABASE_URL");
  }

  return configuration;
}

export async function loadServerlessRuntimeConfiguration(
  parameterName: string | undefined,
  getParameter: (name: string) => Promise<string>,
) {
  const normalizedName = parameterName?.trim();
  if (!normalizedName) throw new Error("RUNTIME_PARAMETER_NAME_REQUIRED");
  return parseServerlessRuntimeConfiguration(
    await getParameter(normalizedName),
  );
}

async function main() {
  const client = new SSMClient({});
  const configuration = await loadServerlessRuntimeConfiguration(
    process.env.NURAPREP_RUNTIME_PARAMETER,
    async (name) => {
      const response = await client.send(
        new GetParameterCommand({ Name: name, WithDecryption: true }),
      );
      if (!response.Parameter?.Value) {
        throw new Error("RUNTIME_PARAMETER_EMPTY");
      }
      return response.Parameter.Value;
    },
  );

  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, ...configuration },
    stdio: "inherit",
  });

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("error", () => {
    console.error("SERVERLESS_APP_PROCESS_FAILED");
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code ?? 1;
  });
}

if (process.env.NURAPREP_BOOTSTRAP_ENTRYPOINT === "true") {
  void main().catch((error: unknown) => {
    console.error(
      "SERVERLESS_APP_BOOTSTRAP_FAILED",
      error instanceof Error ? error.message : "UNKNOWN_ERROR",
    );
    process.exitCode = 1;
  });
}
