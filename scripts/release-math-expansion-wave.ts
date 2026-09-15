import { createHash } from "node:crypto";

import { config } from "dotenv";
import { Pool, type PoolClient } from "pg";

import { loadPublishedMathCorpus } from "@/data/math-variant-corpus";
import { stageDeterministicVariantBatches } from "@/data/stage-deterministic-variants";
import { generateDeterministicVariantBatch } from "@/lib/generation/deterministic-variants";
import { mathDeterministicVariantTemplates } from "@/lib/generation/math-variant-templates";
import type { OriginalityDocument } from "@/lib/questions/originality";

config({ path: ".env.local", quiet: true });

const RELEASE_SEED = "math-bank-expansion-wave-1";
const RELEASE_REVIEWER = "owner-delegated-math-expansion-v1";
const RELEASE_NOTES =
  "The owner explicitly authorized continued Math-bank expansion and deployment on 2026-09-14 and delegated exact-version screening to Codex. This version passed deterministic content and answer contracts, programmatic math verification, governed provenance checks, internal similarity screening against the learner-visible bank and this release wave, and known editorial-blocker checks. This is an owner-authorized, machine-validated expansion decision, not independent educator review or empirical difficulty calibration.";
const REQUESTED_PER_TEMPLATE = 7;
const MAX_ATTEMPTS_PER_ITEM = 100;
const EXPECTED_BASE_PUBLICATIONS = 470;
const EXPECTED_ACCEPTED = 357;
const EXPECTED_EXHAUSTED = 21;
const EXPECTED_CONTENT_DIGEST =
  "6301bdb853ec71c407ae386432c10f35392eb5e2171aa8ebee9dc104e76fcd17";

type ReleaseRow = {
  question_id: string;
  version_id: string;
  prompt: string;
  answer_contract_outcome: string | null;
  math_outcome: string | null;
  source_count: number;
  latest_decision: string | null;
  active_publication_count: number;
};

void main();

async function main() {
  if (!process.argv.includes("--confirm-owner-authorized-expansion")) {
    throw new Error(
      "No database changes made. Pass --confirm-owner-authorized-expansion to publish the exact owner-authorized Math expansion wave.",
    );
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('nuraprep-math-expansion-wave-1', 0))",
    );

    const existingRelease = await loadExistingRelease(client);
    if (existingRelease.length > 0) {
      assertExistingRelease(existingRelease);
      const activeMathQuestions = await loadActiveMathCount(client);
      await client.query("ROLLBACK");
      writeReport({
        status: "ALREADY_RELEASED",
        activeMathQuestions,
        newlyStaged: 0,
        reusedExistingDrafts: EXPECTED_ACCEPTED,
        reviewDecisionsCreated: 0,
        publicationsCreated: 0,
      });
      return;
    }

    const activeBefore = await loadActiveMathCount(client);
    if (activeBefore !== EXPECTED_BASE_PUBLICATIONS) {
      throw new Error(
        `Wave 1 requires the verified ${EXPECTED_BASE_PUBLICATIONS}-question baseline, found ${activeBefore}.`,
      );
    }

    const evolvingCorpus = await loadPublishedMathCorpus(client);
    const batches = mathDeterministicVariantTemplates.map((template) => {
      const batch = generateDeterministicVariantBatch({
        template,
        batchSeed: `${RELEASE_SEED}:${template.key}:v${template.version}`,
        requestedCount: REQUESTED_PER_TEMPLATE,
        maxAttemptsPerItem: MAX_ATTEMPTS_PER_ITEM,
        corpus: evolvingCorpus,
      });
      addAcceptedToCorpus(evolvingCorpus, batch.accepted);
      return batch;
    });
    const accepted = batches.flatMap((batch) => batch.accepted);
    const exhausted = batches.reduce(
      (total, batch) => total + batch.exhaustedSlots,
      0,
    );
    const contentHashes = accepted.map((item) => item.contentHash);
    const contentDigest = digest(contentHashes);
    if (
      accepted.length !== EXPECTED_ACCEPTED ||
      exhausted !== EXPECTED_EXHAUSTED ||
      contentDigest !== EXPECTED_CONTENT_DIGEST
    ) {
      throw new Error(
        `Expansion manifest drifted: ${accepted.length} accepted, ${exhausted} exhausted, digest ${contentDigest}.`,
      );
    }
    for (const item of accepted) assertNoEditorialBlocker(item.candidate);

    const staged = await stageDeterministicVariantBatches({
      client,
      templates: mathDeterministicVariantTemplates,
      batches,
      requestedBy: RELEASE_REVIEWER,
    });
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

    const activeAfter = await loadActiveMathCount(client);
    if (activeAfter !== activeBefore + EXPECTED_ACCEPTED) {
      throw new Error(
        `Expected ${activeBefore + EXPECTED_ACCEPTED} active Math publications after expansion, found ${activeAfter}.`,
      );
    }
    assertExistingRelease(await loadExistingRelease(client));

    await client.query("COMMIT");
    writeReport({
      status: "RELEASED",
      activeMathQuestions: activeAfter,
      newlyStaged: staged.created,
      reusedExistingDrafts: staged.skipped,
      reviewDecisionsCreated: reviewResult.rowCount ?? 0,
      publicationsCreated: publicationResult.rowCount ?? 0,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function loadActiveMathCount(client: PoolClient) {
  const result = await client.query<{ count: number }>(
    `SELECT count(*)::int AS count
       FROM question_publications publication
       INNER JOIN questions question ON question.id = publication.question_id
      WHERE publication.retired_at IS NULL
        AND question.section = 'MATH'
        AND question.internal_slug NOT LIKE 'e2e-%'`,
  );
  return result.rows[0]?.count ?? 0;
}

async function loadExistingRelease(client: PoolClient) {
  const result = await client.query<{ content_hash: string }>(
    `SELECT generation.request_payload->>'contentHash' AS content_hash
       FROM question_publications publication
       INNER JOIN question_versions version
         ON version.id = publication.question_version_id
       INNER JOIN generation_runs generation
         ON generation.id = version.generation_run_id
      WHERE publication.retired_at IS NULL
        AND publication.published_by = $1
      ORDER BY generation.request_payload->>'contentHash'`,
    [RELEASE_REVIEWER],
  );
  return result.rows.map((row) => row.content_hash);
}

function assertExistingRelease(contentHashes: string[]) {
  if (
    contentHashes.length !== EXPECTED_ACCEPTED ||
    digest(contentHashes) !== EXPECTED_CONTENT_DIGEST
  ) {
    throw new Error(
      `The stored expansion release does not match its immutable ${EXPECTED_ACCEPTED}-question manifest.`,
    );
  }
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
              WHERE source.question_version_id = version.id) AS source_count,
            (SELECT decision.decision::text
               FROM review_decisions decision
              WHERE decision.question_version_id = version.id
              ORDER BY decision.decided_at DESC, decision.id DESC LIMIT 1) AS latest_decision,
            (SELECT count(*)::int FROM question_publications publication
              WHERE publication.question_version_id = version.id
                AND publication.retired_at IS NULL) AS active_publication_count
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
  if (rows.length !== EXPECTED_ACCEPTED) {
    throw new Error(
      `Expected ${EXPECTED_ACCEPTED} exact release versions, found ${rows.length}.`,
    );
  }
  if (new Set(rows.map((row) => row.version_id)).size !== rows.length) {
    throw new Error("The expansion contains duplicate version IDs.");
  }
  for (const row of rows) {
    if (
      row.answer_contract_outcome !== "PASS" ||
      row.math_outcome !== "PASS" ||
      row.source_count < 1 ||
      row.active_publication_count > 0
    ) {
      throw new Error(`Expansion gates are incomplete for ${row.version_id}.`);
    }
    if (row.latest_decision && row.latest_decision !== "APPROVED") {
      throw new Error(
        `Expansion version ${row.version_id} has a blocking ${row.latest_decision} decision.`,
      );
    }
    assertNoEditorialBlocker({ content: { prompt: row.prompt } });
  }
}

function assertNoEditorialBlocker(candidate: {
  content: {
    prompt: string;
    choices?: { content: string }[];
    explanation?: string;
  };
}) {
  const text = [
    candidate.content.prompt,
    candidate.content.explanation,
    ...(candidate.content.choices?.map((choice) => choice.content) ?? []),
  ]
    .filter(Boolean)
    .join("\n");
  const blocker = [
    /\b(?:circular|rectangular) (?:circular|rectangular)\b/i,
    /\b1 hours\b/i,
    /\ba 8%\b/i,
    /^a account\b/im,
    /\beach [a-z -]+s costs\b/i,
    /^a exhibit\b/im,
    /\b(?:undefined|NaN|Infinity)\b/,
  ].find((pattern) => pattern.test(text));
  if (blocker) {
    throw new Error(
      `Known editorial blocker ${blocker} remains in: ${candidate.content.prompt}`,
    );
  }
}

function digest(contentHashes: string[]) {
  return createHash("sha256")
    .update(JSON.stringify([...contentHashes].sort()))
    .digest("hex");
}

function writeReport(result: {
  status: "RELEASED" | "ALREADY_RELEASED";
  activeMathQuestions: number;
  newlyStaged: number;
  reusedExistingDrafts: number;
  reviewDecisionsCreated: number;
  publicationsCreated: number;
}) {
  process.stdout.write(
    `${JSON.stringify(
      {
        mode: "OWNER_AUTHORIZED_MATH_EXPANSION",
        wave: 1,
        ...result,
        acceptedQuestions: EXPECTED_ACCEPTED,
        requestedCandidates:
          mathDeterministicVariantTemplates.length * REQUESTED_PER_TEMPLATE,
        exhaustedSlots: EXPECTED_EXHAUSTED,
        contentDigest: EXPECTED_CONTENT_DIGEST,
        limitation:
          "This expansion is owner-authorized and machine-validated, not independently educator-reviewed or empirically calibrated.",
      },
      null,
      2,
    )}\n`,
  );
}
