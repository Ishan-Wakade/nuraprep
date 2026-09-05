import { randomUUID } from "node:crypto";

import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the database smoke test.");
}

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await client.query("BEGIN");

  const skillId = randomUUID();
  const questionId = randomUUID();
  const versionId = randomUUID();

  await client.query(
    `INSERT INTO skills
      (id, code, section, title, learning_objective)
     VALUES ($1, $2, 'MATH', $3, $4)`,
    [
      skillId,
      `smoke-${skillId}`,
      "Database smoke-test skill",
      "Verify that the relational content model accepts a valid question version.",
    ],
  );

  await client.query(
    `INSERT INTO questions (id, internal_slug, section, lifecycle)
     VALUES ($1, $2, 'MATH', 'DRAFT')`,
    [questionId, `smoke-${questionId}`],
  );

  await client.query(
    `INSERT INTO question_versions
      (id, question_id, version, question_type, prompt, choices, answer_spec,
       explanation, distractor_rationales, primary_skill_id, learning_objective,
       difficulty, difficulty_rationale, estimated_seconds, calculator_policy,
       common_misconceptions, authoring_mode, author_id, provenance_summary)
     VALUES
      ($1, $2, 1, 'SINGLE_CHOICE', $3, $4::jsonb, $5::jsonb, $6, $7::jsonb,
       $8, $9, 'FOUNDATIONAL', $10, 60, 'NOT_NEEDED', $11::jsonb,
       'HUMAN', 'ci-smoke-test', $12)`,
    [
      versionId,
      questionId,
      "What is 6 × 7?",
      JSON.stringify([
        { id: "a", content: "36" },
        { id: "b", content: "42" },
      ]),
      JSON.stringify({ type: "single_choice", choiceId: "b" }),
      "Six groups of seven contain 42 items.",
      JSON.stringify({ a: "This result comes from multiplying 6 by 6." }),
      skillId,
      "Multiply whole numbers.",
      "Requires one direct whole-number multiplication step.",
      JSON.stringify(["MULTIPLICATION_FACT_ERROR"]),
      "Created solely inside the rolled-back CI smoke-test transaction.",
    ],
  );

  await client.query("SAVEPOINT immutability_check");
  let mutationWasBlocked = false;
  try {
    await client.query(
      "UPDATE question_versions SET prompt = 'mutated' WHERE id = $1",
      [versionId],
    );
  } catch (error) {
    mutationWasBlocked =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "55000";
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT immutability_check");
  }

  if (!mutationWasBlocked) {
    throw new Error(
      "The question-version append-only trigger did not reject an update.",
    );
  }

  const result = await client.query<{ version_count: number }>(
    `SELECT count(*)::int AS version_count
     FROM question_versions qv
     JOIN questions q ON q.id = qv.question_id
     JOIN skills s ON s.id = qv.primary_skill_id
     WHERE qv.id = $1 AND q.section = s.section`,
    [versionId],
  );

  if (result.rows[0]?.version_count !== 1) {
    throw new Error(
      "The migrated question-version join did not return the expected row.",
    );
  }

  await client.query("ROLLBACK");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
