import { expect, test as setup } from "@playwright/test";
import { config } from "dotenv";
import { Pool, type PoolClient } from "pg";

config({ path: ".env.local", quiet: true });

const firstVersionId = "14000000-0000-4000-8000-000000000001";

setup("publishes one fully gated practice fixture", async ({ page }) => {
  await page.goto(`/review/questions/${firstVersionId}`);
  await page
    .locator('textarea[name="prompt"]')
    .fill(
      "A volunteer team fills 24 cartons with 18 notebooks per carton. How many notebooks does the team pack?",
    );
  await page.getByLabel("Math verification specification JSON").fill(
    JSON.stringify({
      kind: "numeric_result",
      expression: [24, 18, "multiply"],
      tolerance: 0,
    }),
  );
  await page.getByLabel("Misconception attribution rules JSON").fill(
    JSON.stringify([
      {
        id: "adds-groups-and-size",
        code: "ADDS_INSTEAD_OF_MULTIPLIES",
        learnerMessage:
          "You may have added the number of groups and the amount in each group. Reframe the situation as equal groups and multiply.",
        kind: "selected_choice",
        choiceId: "a",
      },
    ]),
  );
  await page.getByLabel("Tutor guidance JSON").fill(
    JSON.stringify({
      steps: [
        {
          id: "identify-structure",
          kind: "SOCRATIC_QUESTION",
          content:
            "What operation represents several equal groups of the same size?",
        },
        {
          id: "name-factors",
          kind: "HINT",
          content:
            "Treat the carton count and notebooks per carton as the two factors.",
        },
      ],
      reflectionPrompt:
        "How would the setup change if one more carton were added?",
    }),
  );
  await page.getByRole("button", { name: "Create new version" }).click();
  await expect(page).not.toHaveURL(`/review/questions/${firstVersionId}`);

  await expect(
    page.getByRole("button", { name: "Publish approved version" }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Run deterministic checks" }).click();
  await expect(page.getByText(/^Automated checks appended:/)).toBeVisible();
  const publicationCandidateUrl = page.url();
  await page.goto(`${publicationCandidateUrl}?validation=automated`);
  await expect(page.getByText("answer-contract v1").first()).toBeVisible();
  await expect(
    page.getByText("mathematical-correctness v1").first(),
  ).toBeVisible();

  for (const validatorKey of [
    "difficulty-calibration",
    "reading-level",
    "calculator-policy",
    "explanation-consistency",
    "accessibility",
    "topic-alignment",
    "originality",
  ]) {
    const validatorSelect = page.getByLabel("Review check");
    await validatorSelect.selectOption(validatorKey);
    const selectedLabel = await validatorSelect
      .locator("option:checked")
      .textContent();
    const activeVersion = selectedLabel?.match(/v(\d+)$/)?.[1];
    expect(activeVersion).toBeTruthy();
    await expect(
      page.getByText(
        new RegExp(
          `Current rubric:.*${validatorKey.replaceAll("-", " ")} v${activeVersion}`,
          "i",
        ),
      ),
    ).toBeVisible();
    await page
      .getByLabel("Evidence")
      .fill(
        `E2E reviewer inspected ${validatorKey} against its documented rubric.`,
      );
    await page.getByLabel(/I inspected the prompt/).check();
    await page.getByLabel(/I applied the selected validator/).check();
    await page.getByLabel(/This is my review judgment/).check();
    await page.getByRole("button", { name: "Append review evidence" }).click();
    await expect(
      page.getByText(`${validatorKey} evidence appended as pass.`),
    ).toBeVisible();
    await page.goto(`${publicationCandidateUrl}?validation=${validatorKey}`);
    await expect(
      page
        .getByRole("heading", { name: "Validation evidence" })
        .locator("..")
        .getByText(`${validatorKey} v${activeVersion}`, { exact: true }),
    ).toBeVisible();
  }

  await page.getByLabel("Decision").selectOption("APPROVED");
  for (const scoreLabel of [
    "Mathematical correctness score",
    "Clarity score",
    "Topic alignment score",
    "Accessibility score",
    "Originality score",
  ]) {
    await page.getByLabel(scoreLabel).selectOption("4");
  }
  await page
    .getByLabel("Review notes")
    .fill("E2E review confirms all required evidence is present.");
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(
    page.getByText("Review decision recorded as immutable history."),
  ).toBeVisible();

  await page.goto(`${publicationCandidateUrl}?validation=complete`);
  await expect(
    page.getByRole("button", { name: "Publish approved version" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Publish approved version" }).click();
  await expect(
    page.getByText("Question version published to the learner-safe bank."),
  ).toBeVisible();

  const publishedPage = await page.context().newPage();
  await publishedPage.goto(
    `${publicationCandidateUrl}?publication-check=${Date.now()}`,
  );
  await expect(
    publishedPage.getByRole("button", { name: "Currently published" }),
  ).toBeDisabled();

  await publishAdditionalDiagnosticFixtures();
});

async function publishAdditionalDiagnosticFixtures() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E setup.");

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  const versionIds = [2, 3, 4, 5, 6].map(
    (value) => `14000000-0000-4000-8000-${String(value).padStart(12, "0")}`,
  );

  try {
    await client.query("BEGIN");
    const rules = await client.query<{ id: string; key: string }>(
      "SELECT id, key FROM validator_rules WHERE active = true",
    );

    for (const versionId of versionIds) {
      const version = await client.query<{ question_id: string }>(
        `SELECT qv.question_id
         FROM question_versions qv
         WHERE qv.id = $1`,
        [versionId],
      );
      const questionId = version.rows[0]?.question_id;
      if (!questionId) throw new Error(`Missing E2E fixture ${versionId}.`);

      const current = await client.query(
        `SELECT 1 FROM question_publications
         WHERE question_id = $1 AND retired_at IS NULL`,
        [questionId],
      );
      if (current.rowCount) continue;

      for (const rule of rules.rows) {
        await client.query(
          `INSERT INTO validation_runs
           (question_version_id, validator_rule_id, outcome, evidence)
           VALUES ($1, $2, 'PASS', $3::jsonb)`,
          [
            versionId,
            rule.id,
            JSON.stringify({
              method: "e2e-diagnostic-fixture",
              note: "Test-only evidence; not a production content approval.",
              validatorKey: rule.key,
            }),
          ],
        );
      }
      await client.query(
        `INSERT INTO review_decisions
         (question_version_id, reviewer_id, decision, rubric_scores, notes)
         VALUES ($1, 'e2e-fixture-reviewer', 'APPROVED', $2::jsonb, $3)`,
        [
          versionId,
          JSON.stringify({
            mathematicalCorrectness: 4,
            clarity: 4,
            alignment: 4,
            accessibility: 4,
            originality: 4,
          }),
          "E2E-only fixture approval for diagnostic assembly tests; not production approval.",
        ],
      );
      await client.query(
        "UPDATE questions SET lifecycle = 'ACTIVE', updated_at = now() WHERE id = $1",
        [questionId],
      );
      await client.query(
        `INSERT INTO question_publications
         (question_id, question_version_id, published_by)
         VALUES ($1, $2, 'e2e-fixture-reviewer')`,
        [questionId, versionId],
      );
    }

    await publishPracticeTestFixtures(client, rules.rows);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function publishPracticeTestFixtures(
  client: PoolClient,
  rules: { id: string; key: string }[],
) {
  const arithmeticSkillId = "11000000-0000-4000-8000-000000000010";
  const geometrySkillId = "11000000-0000-4000-8000-000000000021";
  const difficulties = ["FOUNDATIONAL", "DEVELOPING", "PROFICIENT", "ADVANCED"];

  for (let index = 1; index <= 32; index += 1) {
    const suffix = String(index).padStart(12, "0");
    const questionId = `23000000-0000-4000-8000-${suffix}`;
    const versionId = `24000000-0000-4000-8000-${suffix}`;
    const left = index + 10;
    const right = index + 11;
    const answer = left + right;
    const skillId = index <= 16 ? arithmeticSkillId : geometrySkillId;

    await client.query(
      `INSERT INTO questions
       (id, internal_slug, section, lifecycle)
       VALUES ($1, $2, 'MATH', 'ACTIVE')
       ON CONFLICT (id) DO NOTHING`,
      [questionId, `e2e-practice-test-${index}`],
    );
    await client.query(
      `INSERT INTO question_versions
       (id, question_id, version, question_type, prompt, answer_spec,
        explanation, distractor_rationales, verification_spec,
        primary_skill_id, learning_objective, difficulty,
        difficulty_rationale, estimated_seconds, calculator_policy,
        common_misconceptions, authoring_mode, author_id, provenance_summary)
       VALUES
       ($1, $2, 1, 'NUMERIC', $3, $4::jsonb, $5, '{}'::jsonb, $6::jsonb,
        $7, $8, $9::difficulty, $10, 90, 'NOT_NEEDED', '[]'::jsonb,
        'HUMAN', 'e2e-fixture-author', $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        versionId,
        questionId,
        `E2E-only Math fixture ${index}: What is ${left} + ${right}?`,
        JSON.stringify({
          type: "numeric",
          value: answer,
          tolerance: 0,
          toleranceMode: "absolute",
          acceptedUnits: [],
          unitRequired: false,
        }),
        `${left} + ${right} = ${answer}. This item exists only in the disposable browser-test database.`,
        JSON.stringify({
          kind: "numeric_result",
          expression: [left, right, "add"],
          tolerance: 0,
        }),
        skillId,
        "Verify full-length test assembly and completion in a disposable test database.",
        difficulties[(index - 1) % difficulties.length],
        "Test-only fixture band used to exercise stratified assembly; not a calibrated learner difficulty.",
        "Synthetic E2E-only fixture authored without external source material. It must never be treated as production-approved educational content.",
      ],
    );

    const current = await client.query(
      `SELECT 1 FROM question_publications
       WHERE question_id = $1 AND retired_at IS NULL`,
      [questionId],
    );
    if (current.rowCount) continue;

    for (const rule of rules) {
      await client.query(
        `INSERT INTO validation_runs
         (question_version_id, validator_rule_id, outcome, evidence)
         VALUES ($1, $2, 'PASS', $3::jsonb)`,
        [
          versionId,
          rule.id,
          JSON.stringify({
            method: "e2e-practice-test-fixture",
            note: "Test-only evidence; not a production content approval.",
            validatorKey: rule.key,
          }),
        ],
      );
    }
    await client.query(
      `INSERT INTO review_decisions
       (question_version_id, reviewer_id, decision, rubric_scores, notes)
       VALUES ($1, 'e2e-fixture-reviewer', 'APPROVED', $2::jsonb, $3)`,
      [
        versionId,
        JSON.stringify({
          mathematicalCorrectness: 4,
          clarity: 4,
          alignment: 4,
          accessibility: 4,
          originality: 4,
        }),
        "E2E-only fixture approval for full-test mechanics; not production approval.",
      ],
    );
    await client.query(
      `INSERT INTO question_publications
       (question_id, question_version_id, published_by)
       VALUES ($1, $2, 'e2e-fixture-reviewer')`,
      [questionId, versionId],
    );
  }
}
