import { config } from "dotenv";
import { Pool } from "pg";

import { loadCurrentMathCorpus } from "@/data/math-variant-corpus";
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
  const templates =
    options.template === "all"
      ? mathDeterministicVariantTemplates
      : [
          getMathDeterministicVariantTemplate(options.template) ??
            fail(`Unknown template: ${options.template}`),
        ];
  const corpus = await withPool((pool) => loadCurrentMathCorpus(pool));
  const evolvingCorpus = [...corpus];
  const batches = templates.map((template) => {
    const batch = generateDeterministicVariantBatch({
      template,
      batchSeed: `${options.seed}:${template.key}:v${template.version}`,
      requestedCount: options.count,
      maxAttemptsPerItem: options.maxAttempts,
      corpus: evolvingCorpus,
    });
    evolvingCorpus.push(
      ...batch.accepted.map((item): OriginalityDocument => ({
        id: `${batch.batchId}:${item.contentHash}`,
        prompt: item.candidate.content.prompt,
        stimulus: item.candidate.content.stimulus,
        choices: item.candidate.content.choices,
      })),
    );
    return batch;
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        mode: "DRY_RUN_ONLY",
        notice:
          "No question, review decision, validation run, or publication was written.",
        existingCorpusSize: corpus.length,
        requestedPerTemplate: options.count,
        seed: options.seed,
        totals: {
          templates: batches.length,
          accepted: batches.reduce(
            (total, batch) => total + batch.accepted.length,
            0,
          ),
          rejected: batches.reduce(
            (total, batch) => total + batch.rejected.length,
            0,
          ),
          exhaustedSlots: batches.reduce(
            (total, batch) => total + batch.exhaustedSlots,
            0,
          ),
        },
        batches,
      },
      null,
      2,
    )}\n`,
  );
}

async function withPool<T>(callback: (pool: Pool) => Promise<T>) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required so dry-runs can compare against the current Math bank.",
    );
  }
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    return await callback(pool);
  } finally {
    await pool.end();
  }
}

function parseOptions(arguments_: string[]) {
  const values = Object.fromEntries(
    arguments_
      .filter((argument) => argument !== "--")
      .map((argument) => {
        const match = argument.match(/^--([a-z-]+)=(.+)$/);
        if (!match) {
          throw new Error(
            `Invalid argument ${argument}. Use --template=, --count=, --seed=, or --max-attempts=.`,
          );
        }
        return [match[1], match[2]];
      }),
  );
  const count = integerOption(values.count ?? "8", "count", 1, 1_000);
  const maxAttempts = integerOption(
    values["max-attempts"] ?? "40",
    "max-attempts",
    1,
    100,
  );
  const seed = values.seed?.trim() || "local-reviewed-pilot-v1";
  const template = values.template?.trim() || "all";
  if (seed.length > 160)
    throw new Error("seed must be at most 160 characters.");
  return { count, maxAttempts, seed, template };
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
