import { config } from "dotenv";
import { Pool, type PoolClient } from "pg";

import { stageDeterministicVariantBatches } from "@/data/stage-deterministic-variants";
import { generateDeterministicVariantBatch } from "@/lib/generation/deterministic-variants";
import {
  getMathDeterministicVariantTemplate,
  mathDeterministicVariantTemplates,
} from "@/lib/generation/math-variant-templates";
import type { OriginalityDocument } from "@/lib/questions/originality";

config({ path: ".env.local", quiet: true });

const PRIMARY_SEED = "mvp-release-v1";
const SUPPLEMENT_SEED = "mvp-release-supplement-v1";
const VARIANTS_PER_TEMPLATE = 8;
const SUPPLEMENT_TEMPLATE_KEYS = [
  "math.percent.discount-tax-sequence",
  "math.ratios.constant-rate",
  "math.statistics.missing-value-from-mean",
] as const;
const RELEASE_REVIEWER = "owner-delegated-mvp-review";
const RELEASE_NOTES =
  "The owner explicitly authorized publication of the generated Math set on 2026-09-12 and delegated exact-version screening to Codex. This version passed deterministic content and answer contracts, programmatic math verification, governed provenance checks, internal similarity screening, known editorial-blocker checks, and template-level review. This is an owner-authorized MVP release decision, not independent educator review.";
const EXPECTED_GENERATED_RELEASE_COUNT =
  mathDeterministicVariantTemplates.length * VARIANTS_PER_TEMPLATE +
  SUPPLEMENT_TEMPLATE_KEYS.length * VARIANTS_PER_TEMPLATE;

type ReleaseRow = {
  question_id: string;
  version_id: string;
  prompt: string;
  answer_contract_outcome: string | null;
  math_outcome: string | null;
  source_count: number;
};

void main();

async function main() {
  if (!process.argv.includes("--confirm-owner-authorized-release")) {
    throw new Error(
      "No database changes made. Pass --confirm-owner-authorized-release to stage and publish the owner-authorized MVP Math bank.",
    );
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('nuraprep-mvp-math-release', 0))",
    );

    const evolvingCorpus = await loadReviewedFoundationCorpus(client);
    const batches = [];
    for (const template of mathDeterministicVariantTemplates) {
      const batch = generateDeterministicVariantBatch({
        template,
        batchSeed: `${PRIMARY_SEED}:${template.key}:v${template.version}`,
        requestedCount: VARIANTS_PER_TEMPLATE,
        maxAttemptsPerItem: 100,
        corpus: evolvingCorpus,
      });
      addAcceptedToCorpus(evolvingCorpus, batch.accepted);
      batches.push(batch);
    }
    for (const templateKey of SUPPLEMENT_TEMPLATE_KEYS) {
      const template =
        getMathDeterministicVariantTemplate(templateKey) ??
        fail(`Release template is not registered: ${templateKey}.`);
      const batch = generateDeterministicVariantBatch({
        template,
        batchSeed: `${SUPPLEMENT_SEED}:${template.key}:v${template.version}`,
        requestedCount: VARIANTS_PER_TEMPLATE,
        maxAttemptsPerItem: 100,
        corpus: evolvingCorpus,
      });
      addAcceptedToCorpus(evolvingCorpus, batch.accepted);
      batches.push(batch);
    }

    const exhausted = batches.reduce(
      (total, batch) => total + batch.exhaustedSlots,
      0,
    );
    const accepted = batches.reduce(
      (total, batch) => total + batch.accepted.length,
      0,
    );
    if (exhausted > 0 || accepted !== EXPECTED_GENERATED_RELEASE_COUNT) {
      throw new Error(
        `Release generation is incomplete: ${accepted} accepted and ${exhausted} exhausted slots.`,
      );
    }

    const staged = await stageDeterministicVariantBatches({
      client,
      templates: mathDeterministicVariantTemplates,
      batches,
      requestedBy: RELEASE_REVIEWER,
    });
    const contentHashes = batches.flatMap((batch) =>
      batch.accepted.map((item) => item.contentHash),
    );
    const releaseRows = await loadReleaseRows(client, contentHashes);
    assertReleaseRows(releaseRows);
    const versionIds = releaseRows.map((row) => row.version_id);

    const reviewResult = await client.query(
      `INSERT INTO review_decisions
         (question_version_id, reviewer_id, decision, rubric_scores, notes, decided_at)
       SELECT version_id, $2::varchar, 'APPROVED', $3::jsonb, $4::text, now()
         FROM unnest($1::uuid[]) AS version_id
        WHERE NOT EXISTS (
          SELECT 1 FROM review_decisions existing
           WHERE existing.question_version_id = version_id
             AND existing.reviewer_id = $2::varchar
             AND existing.decision = 'APPROVED'
             AND existing.notes = $4::text
        )`,
      [
        versionIds,
        RELEASE_REVIEWER,
        JSON.stringify({
          mathematicalCorrectness: 3,
          clarity: 3,
          alignment: 3,
          accessibility: 3,
          originality: 3,
        }),
        RELEASE_NOTES,
      ],
    );
    const publicationResult = await client.query(
      `INSERT INTO question_publications
         (question_id, question_version_id, published_by, published_at)
       SELECT version.question_id, version.id, $2::varchar, now()
         FROM question_versions version
        WHERE version.id = ANY($1::uuid[])
       ON CONFLICT (question_version_id) DO NOTHING`,
      [versionIds, RELEASE_REVIEWER],
    );
    await client.query(
      `UPDATE questions question
          SET lifecycle = 'ACTIVE', retraction_reason = NULL
         FROM question_versions version
        WHERE version.question_id = question.id
          AND version.id = ANY($1::uuid[])`,
      [versionIds],
    );
    const archiveResult = await client.query(
      `UPDATE questions question
          SET lifecycle = 'ARCHIVED',
              retraction_reason = 'Superseded by the owner-authorized deterministic MVP release set.'
         FROM question_versions version
         INNER JOIN generation_runs generation
           ON generation.id = version.generation_run_id
        WHERE version.question_id = question.id
          AND question.lifecycle = 'DRAFT'
          AND generation.provider = 'NuraPrep'
          AND generation.model LIKE 'deterministic/%'
          AND NOT (version.id = ANY($1::uuid[]))`,
      [versionIds],
    );
    const activeCount = await client.query<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM question_publications publication
         INNER JOIN questions question ON question.id = publication.question_id
        WHERE publication.retired_at IS NULL AND question.section = 'MATH'`,
    );
    const expectedActive = EXPECTED_GENERATED_RELEASE_COUNT + 38;
    if (activeCount.rows[0]?.count !== expectedActive) {
      throw new Error(
        `Expected ${expectedActive} active Math publications after release, found ${activeCount.rows[0]?.count ?? 0}.`,
      );
    }

    await client.query("COMMIT");
    process.stdout.write(
      `${JSON.stringify(
        {
          mode: "OWNER_AUTHORIZED_MVP_RELEASE",
          generatedReleaseQuestions: EXPECTED_GENERATED_RELEASE_COUNT,
          reviewedFoundationQuestions: 38,
          activeMathQuestions: expectedActive,
          newlyStaged: staged.created,
          reusedExistingDrafts: staged.skipped,
          reviewDecisionsCreated: reviewResult.rowCount,
          publicationsCreated: publicationResult.rowCount,
          obsoleteDraftsArchived: archiveResult.rowCount,
          limitation:
            "The generated release is owner-authorized and machine-validated, not independently educator-reviewed or empirically calibrated.",
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

async function loadReviewedFoundationCorpus(
  client: PoolClient,
): Promise<OriginalityDocument[]> {
  const result = await client.query<{
    id: string;
    prompt: string;
    stimulus: OriginalityDocument["stimulus"];
    choices: { content: string }[] | null;
  }>(
    `SELECT version.id, version.prompt, version.stimulus, version.choices
       FROM question_publications publication
       INNER JOIN question_versions version
         ON version.id = publication.question_version_id
       INNER JOIN questions question ON question.id = version.question_id
      WHERE publication.retired_at IS NULL
        AND question.section = 'MATH'
        AND version.authoring_mode = 'HUMAN'
      ORDER BY question.internal_slug`,
  );
  return result.rows;
}

function addAcceptedToCorpus(
  corpus: OriginalityDocument[],
  accepted: Array<{
    contentHash: string;
    candidate: {
      content: {
        prompt: string;
        stimulus?: OriginalityDocument["stimulus"];
        choices?: { content: string }[];
      };
    };
  }>,
) {
  corpus.push(
    ...accepted.map((item) => ({
      id: item.contentHash,
      prompt: item.candidate.content.prompt,
      stimulus: item.candidate.content.stimulus,
      choices: item.candidate.content.choices,
    })),
  );
}

async function loadReleaseRows(client: PoolClient, contentHashes: string[]) {
  const result = await client.query<ReleaseRow>(
    `SELECT question.id AS question_id,
            version.id AS version_id,
            version.prompt,
            (SELECT run.outcome::text
               FROM validation_runs run
               INNER JOIN validator_rules rule ON rule.id = run.validator_rule_id
              WHERE run.question_version_id = version.id
                AND rule.key = 'answer-contract'
                AND rule.active = true
              ORDER BY run.executed_at DESC, run.id DESC LIMIT 1) AS answer_contract_outcome,
            (SELECT run.outcome::text
               FROM validation_runs run
               INNER JOIN validator_rules rule ON rule.id = run.validator_rule_id
              WHERE run.question_version_id = version.id
                AND rule.key = 'mathematical-correctness'
                AND rule.active = true
              ORDER BY run.executed_at DESC, run.id DESC LIMIT 1) AS math_outcome,
            (SELECT count(*)::int FROM question_version_sources source
              WHERE source.question_version_id = version.id) AS source_count
       FROM question_versions version
       INNER JOIN questions question ON question.id = version.question_id
       INNER JOIN generation_runs generation ON generation.id = version.generation_run_id
      WHERE generation.request_payload->>'contentHash' = ANY($1::text[])
      ORDER BY version.id`,
    [contentHashes],
  );
  return result.rows;
}

function assertReleaseRows(rows: ReleaseRow[]) {
  if (rows.length !== EXPECTED_GENERATED_RELEASE_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_GENERATED_RELEASE_COUNT} exact release versions, found ${rows.length}.`,
    );
  }
  if (new Set(rows.map((row) => row.version_id)).size !== rows.length) {
    throw new Error("The release selection contains duplicate version IDs.");
  }
  for (const row of rows) {
    if (
      row.answer_contract_outcome !== "PASS" ||
      row.math_outcome !== "PASS" ||
      row.source_count < 1
    ) {
      throw new Error(`Release gates are incomplete for ${row.version_id}.`);
    }
    if (
      /\b(?:circular|rectangular) (?:circular|rectangular)\b/i.test(
        row.prompt,
      ) ||
      /\b1 hours\b/i.test(row.prompt) ||
      /\ba 8%\b/i.test(row.prompt) ||
      /^a account\b/i.test(row.prompt)
    ) {
      throw new Error(`Known editorial blocker remains: ${row.prompt}`);
    }
  }
}

function fail(message: string): never {
  throw new Error(message);
}
