import { config } from "dotenv";
import { Pool } from "pg";

import { loadCurrentMathCorpus } from "@/data/math-variant-corpus";
import { stageDeterministicVariantBatches } from "@/data/stage-deterministic-variants";
import { generateDeterministicVariantBatch } from "@/lib/generation/deterministic-variants";
import {
  getMathDeterministicVariantTemplate,
  mathDeterministicVariantTemplates,
} from "@/lib/generation/math-variant-templates";
import type { OriginalityDocument } from "@/lib/questions/originality";

config({ path: ".env.local", quiet: true });

void main();

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (!options.confirmed) {
    throw new Error(
      "No database changes made. Pass --confirm-stage-drafts to create unreviewed drafts.",
    );
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const templates =
    options.template === "all"
      ? mathDeterministicVariantTemplates
      : [
          getMathDeterministicVariantTemplate(options.template) ??
            fail(`Unknown template: ${options.template}`),
        ];
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('nuraprep-deterministic-draft-staging', 0))",
    );
    const corpus = await loadCurrentMathCorpus(client);
    const evolvingCorpus = [...corpus];
    const batches = [];
    let existingBatchDrafts = 0;
    for (const template of templates) {
      const batchSeed = `${options.seed}:${template.key}:v${template.version}`;
      const existingBatch = await loadExistingBatchState(
        client,
        template.key,
        template.version,
        batchSeed,
      );
      if (existingBatch.total > 0) {
        if (
          existingBatch.total !== options.count ||
          existingBatch.complete !== existingBatch.total
        ) {
          throw new Error(
            `Seed ${options.seed} already has an incomplete or differently sized batch for ${template.key}. Choose a new seed.`,
          );
        }
        existingBatchDrafts += existingBatch.total;
        continue;
      }
      const batch = generateDeterministicVariantBatch({
        template,
        batchSeed,
        requestedCount: options.count,
        maxAttemptsPerItem: options.maxAttempts,
        corpus: evolvingCorpus,
      });
      evolvingCorpus.push(
        ...batch.accepted.map((item): OriginalityDocument => ({
          id: `${batch.batchId}:${item.contentHash}`,
          prompt: item.candidate.content.prompt,
          choices: item.candidate.content.choices,
        })),
      );
      batches.push(batch);
    }
    if (batches.some((batch) => batch.exhaustedSlots > 0)) {
      throw new Error(
        "At least one requested slot was exhausted; no partial batch was staged.",
      );
    }
    const staged = await stageDeterministicVariantBatches({
      client,
      templates,
      batches,
      requestedBy: options.requestedBy,
    });
    await client.query("COMMIT");
    process.stdout.write(
      `${JSON.stringify(
        {
          mode: "STAGED_DRAFTS_ONLY",
          notice:
            "Created candidates remain unreviewed DRAFT families and are not learner-visible.",
          seed: options.seed,
          requestedPerTemplate: options.count,
          requestedTotal: options.count * templates.length,
          accepted: batches.reduce(
            (total, batch) => total + batch.accepted.length,
            0,
          ),
          rejectedAttempts: batches.reduce(
            (total, batch) => total + batch.rejected.length,
            0,
          ),
          existingBatchDrafts,
          ...staged,
        },
        null,
        2,
      )}\n`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function loadExistingBatchState(
  client: import("pg").PoolClient,
  templateKey: string,
  templateVersion: number,
  batchSeed: string,
) {
  const result = await client.query<{ total: number; complete: number }>(
    `SELECT count(*)::int AS total,
            count(*) FILTER (
              WHERE run.status = 'SUCCEEDED' AND version.id IS NOT NULL
            )::int AS complete
       FROM generation_runs AS run
       INNER JOIN generation_templates AS template ON template.id = run.template_id
       LEFT JOIN question_versions AS version ON version.generation_run_id = run.id
      WHERE template.template_key = $1
        AND template.version = $2
        AND run.provider = 'NuraPrep'
        AND run.request_kind = 'NEW_QUESTION'
        AND run.request_payload->>'batchSeed' = $3`,
    [templateKey, templateVersion, batchSeed],
  );
  return result.rows[0] ?? { total: 0, complete: 0 };
}

function parseOptions(arguments_: string[]) {
  let confirmed = false;
  const values: Record<string, string> = {};
  for (const argument of arguments_) {
    if (argument === "--") continue;
    if (argument === "--confirm-stage-drafts") {
      confirmed = true;
      continue;
    }
    const match = argument.match(/^--([a-z-]+)=(.+)$/);
    if (!match) throw new Error(`Invalid argument: ${argument}.`);
    values[match[1]] = match[2];
  }
  const count = integerOption(values.count ?? "8", "count", 1, 20);
  const maxAttempts = integerOption(
    values["max-attempts"] ?? "100",
    "max-attempts",
    1,
    100,
  );
  const seed = values.seed?.trim() || "review-queue-pilot-v1";
  const template = values.template?.trim() || "all";
  const requestedBy =
    values["requested-by"]?.trim() || "codex-deterministic-stager";
  if (seed.length > 160)
    throw new Error("seed must be at most 160 characters.");
  if (requestedBy.length < 3 || requestedBy.length > 160) {
    throw new Error("requested-by must contain 3 to 160 characters.");
  }
  return { confirmed, count, maxAttempts, seed, template, requestedBy };
}

function integerOption(
  value: string,
  name: string,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${name} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return parsed;
}

function fail(message: string): never {
  throw new Error(message);
}
