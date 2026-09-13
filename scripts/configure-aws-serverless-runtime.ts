import { PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { config as loadEnvironmentFile } from "dotenv";

import { parseServerlessRuntimeConfiguration } from "../src/lambda/serverless-app-bootstrap";

const options = parseArguments(process.argv.slice(2));
if (!options.confirmWrite) {
  throw new Error(
    "Refusing to write AWS configuration without --confirm-secure-parameter-write.",
  );
}

const loaded = loadEnvironmentFile({ path: options.environmentFile });
if (loaded.error) {
  throw new Error(
    `Unable to load environment file: ${options.environmentFile}`,
  );
}

const source = loaded.parsed ?? {};
const runtimeInput: Record<string, string | undefined> = {
  APP_ENV: "production",
  DEPLOYMENT_PLATFORM: "AWS",
  NEXT_PUBLIC_APP_URL: options.appUrl,
  DATABASE_URL: source.DATABASE_URL,
  BETTER_AUTH_SECRET: source.BETTER_AUTH_SECRET,
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: source.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY,
  GOOGLE_CLIENT_ID: source.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: source.GOOGLE_CLIENT_SECRET,
  TRUSTED_PROXY_CIDRS: "127.0.0.1/32,::1/128",
  BILLING_ENABLED: source.BILLING_ENABLED ?? "false",
  DEV_REVIEWER_ENABLED: "false",
  DEV_LEARNER_ENABLED: "false",
};

if (runtimeInput.BILLING_ENABLED === "true") {
  for (const key of [
    "STRIPE_MODE",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_ID",
    "STRIPE_PREMIUM_PRODUCT_ID",
  ] as const) {
    runtimeInput[key] = source[key];
  }
}

const runtime = parseServerlessRuntimeConfiguration(
  JSON.stringify(runtimeInput),
);
const response = await new SSMClient({ region: options.region }).send(
  new PutParameterCommand({
    Name: options.parameterName,
    Description:
      "NuraPrep scale-to-zero portfolio runtime configuration; managed outside Terraform so secrets never enter state.",
    Type: "SecureString",
    Tier: "Standard",
    Value: JSON.stringify(runtime),
    Overwrite: true,
  }),
);

console.info(
  JSON.stringify({
    parameterName: options.parameterName,
    version: response.Version,
    region: options.region,
    appOrigin: options.appUrl,
    secretValuesPrinted: false,
  }),
);

function parseArguments(arguments_: string[]) {
  const values = new Map<string, string>();
  let confirmWrite = false;
  for (const argument of arguments_) {
    if (argument === "--confirm-secure-parameter-write") {
      confirmWrite = true;
      continue;
    }
    const match = argument.match(/^--([^=]+)=(.+)$/);
    if (!match) throw new Error(`Unknown argument: ${argument}`);
    values.set(match[1]!, match[2]!);
  }

  const appUrl = required(values, "app-url");
  const environmentFile = required(values, "env-file");
  const region = values.get("region") ?? "us-east-1";
  const parameterName =
    values.get("parameter-name") ?? "/nuraprep/portfolio/runtime";
  if (!/^\/nuraprep\/[a-z0-9/_-]+$/.test(parameterName)) {
    throw new Error("parameter-name must stay under /nuraprep/.");
  }

  return {
    appUrl,
    environmentFile,
    region,
    parameterName,
    confirmWrite,
  };
}

function required(values: Map<string, string>, name: string) {
  const value = values.get(name)?.trim();
  if (!value) throw new Error(`Missing --${name}=... argument.`);
  return value;
}
