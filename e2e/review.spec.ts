import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });

const firstVersionId = "14000000-0000-4000-8000-000000000001";
const numericVersionId = "14000000-0000-4000-8000-000000000002";

test.describe.configure({ mode: "serial" });

test("filters the review queue and opens full provenance", async ({ page }) => {
  await page.goto("/review");

  await expect(
    page.getByRole("heading", { name: "Question review queue" }),
  ).toBeVisible();
  await expect(page.getByText(/\d+ visible versions/)).toBeVisible();
  await expect(page.getByText("Local dev access")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Math question-bank coverage" }),
  ).toBeVisible();
  await expect(page.getByText("No published item").first()).toBeVisible();

  await page.getByLabel("Type").selectOption("NUMERIC");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/questionType=NUMERIC/);
  await expect(page.getByText(/\d+ visible versions/)).toBeVisible();
  await expect(page.getByText("Write 7/8 as a decimal.")).toBeVisible();

  await page.goto(`/review/questions/${firstVersionId}`);
  await expect(
    page.getByRole("heading", { name: "Review question version" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("paragraph")
      .filter({ hasText: /24 supply boxes with 18 notebooks/i }),
  ).toBeVisible();
  await expect(page.getByText("Model input: not permitted")).toBeVisible();
  await expect(page.getByText(/publication blockers/i)).toBeVisible();
});

test("records a decision and creates an immutable revision", async ({
  page,
}) => {
  await page.goto(`/review/questions/${firstVersionId}`);

  await page.getByLabel("Decision").selectOption("NEEDS_REVISION");
  await page
    .getByLabel("Review notes")
    .fill("Clarify the practical context before approving this candidate.");
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(
    page.getByText("Review decision recorded as immutable history."),
  ).toBeVisible();

  await page.getByLabel("Category").selectOption("AMBIGUITY");
  await page.getByLabel(/Recurring issue code/).fill("CONTEXT_CLARITY");
  await page
    .getByLabel("Feedback")
    .fill("The practical context should be more direct and easier to scan.");
  await page.getByRole("button", { name: "Save feedback" }).click();
  await expect(
    page.getByText("Feedback saved for controlled batch analysis."),
  ).toBeVisible();

  await page.goto("/review/feedback?q=CONTEXT_CLARITY");
  await expect(
    page.getByRole("heading", { name: "Feedback patterns" }),
  ).toBeVisible();
  await expect(page.getByText("CONTEXT_CLARITY").first()).toBeVisible();
  await expect(
    page.getByText(/practical context should be more direct/i).first(),
  ).toBeVisible();

  await page.goto(`/review/questions/${firstVersionId}`);

  await page
    .locator('textarea[name="prompt"]')
    .fill(
      "A community center prepares 24 supply boxes with 18 notebooks in each box. How many notebooks are prepared in all?",
    );
  await page.getByLabel("Math verification specification JSON").fill(
    JSON.stringify({
      kind: "numeric_result",
      expression: [24, 18, "multiply"],
      tolerance: 0,
    }),
  );
  await page.getByRole("button", { name: "Create new version" }).click();

  await expect(page).not.toHaveURL(`/review/questions/${firstVersionId}`);
  await expect(
    page
      .getByRole("paragraph")
      .filter({ hasText: /prepares 24 supply boxes/i }),
  ).toBeVisible();
  await expect(page.getByText("0 decisions · 0 feedback items")).toBeVisible();
});

test("creates a numeric revision without answer choices", async ({ page }) => {
  await page.goto(`/review/questions/${numericVersionId}`);

  await expect(page.locator('textarea[name="choicesJson"]')).toHaveValue("");
  await page
    .locator('textarea[name="prompt"]')
    .fill("Write the fraction 7/8 as a decimal number.");
  await page.getByLabel("Math verification specification JSON").fill(
    JSON.stringify({
      kind: "numeric_result",
      expression: [7, 8, "divide"],
      tolerance: 0,
    }),
  );
  await page.getByRole("button", { name: "Create new version" }).click();

  await expect(page).not.toHaveURL(`/review/questions/${numericVersionId}`);
  await expect(
    page.getByRole("paragraph").filter({ hasText: "Write the fraction 7/8" }),
  ).toBeVisible();
});

test("registers governed source metadata and an abstract coverage note", async ({
  page,
}) => {
  const uniqueTitle = `CI public outline ${Date.now()}`;
  await page.goto("/review/sources");
  await expect(
    page.getByRole("heading", { name: "Source and rights register" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Source recheck queue" }),
  ).toBeVisible();
  const registrationPanel = page
    .getByRole("heading", { name: "Register a source" })
    .locator("..");

  await registrationPanel
    .getByLabel("Canonical HTTPS URL")
    .fill(`https://example.org/nuraprep-ci/${Date.now()}`);
  await registrationPanel
    .getByLabel("Publisher")
    .fill("Example education publisher");
  await registrationPanel.getByLabel("Title").fill(uniqueTitle);
  await registrationPanel.getByLabel("Artifact type").fill("CONTENT_OUTLINE");
  await registrationPanel.getByLabel("Access class").selectOption("PUBLIC");
  await registrationPanel
    .getByLabel("Policy decision")
    .selectOption("COVERAGE_ANALYSIS");
  await registrationPanel
    .getByLabel("Decision rationale")
    .fill(
      "Retain only metadata and human-authored high-level coverage observations for this CI record.",
    );
  await registrationPanel
    .getByRole("button", { name: "Register source" })
    .click();
  await expect(
    page.getByText("Source registered with policy-derived permissions."),
  ).toBeVisible();

  const sourceCard = page.locator("article").filter({ hasText: uniqueTitle });
  await expect(sourceCard.getByText("Storage: blocked")).toBeVisible();
  await expect(sourceCard.getByText("Model input: blocked")).toBeVisible();
  await sourceCard
    .getByLabel("Abstract coverage observation")
    .fill(
      "Learners should interpret whole-number multiplication in a practical quantity context.",
    );
  await sourceCard.getByRole("checkbox").check();
  await sourceCard.getByRole("button", { name: "Record observation" }).click();
  await expect(page.getByText("Coverage observation recorded.")).toBeVisible();

  await sourceCard.getByText("Record policy recheck").click();
  await sourceCard.getByLabel("Next recheck date").fill("2099-01-01");
  await sourceCard
    .getByLabel("Recheck rationale")
    .fill(
      "Rechecked the public access state and retained the conservative coverage-analysis decision.",
    );
  await sourceCard.getByLabel(/I reviewed the current access state/).check();
  await sourceCard.getByRole("button", { name: "Save policy recheck" }).click();
  await expect(
    page.getByText("Source policy rechecked with immutable audit evidence."),
  ).toBeVisible();
  await expect(sourceCard.getByText(/^current$/i)).toBeVisible();
  await expect(sourceCard.getByText("Policy audit history (2)")).toBeVisible();
});

test("turns recurring feedback into a separately approved improvement plan", async ({
  page,
}) => {
  const issueCode = `CI_PATTERN_${Date.now()}`;
  const proposalTitle = `Improve originality regression ${Date.now()}`;
  await page.goto(`/review/questions/${firstVersionId}`);

  for (const feedback of [
    "The scenario structure is too close to a previously reviewed pattern.",
    "The distractor arrangement repeats a distinctive structure seen before.",
  ]) {
    await page.getByLabel("Category").selectOption("ORIGINALITY");
    await page.getByLabel(/Recurring issue code/).fill(issueCode);
    await page.getByLabel("Feedback").fill(feedback);
    await page.getByRole("button", { name: "Save feedback" }).click();
    await expect(
      page.getByText("Feedback saved for controlled batch analysis."),
    ).toBeVisible();
  }

  await page.goto(`/review/feedback?q=${issueCode}`);
  const patternCard = page.locator("article").filter({ hasText: issueCode });
  await expect(patternCard.getByText("2 open")).toBeVisible();
  await patternCard.getByText("Draft an improvement proposal").click();
  await patternCard.getByLabel("Proposal title").fill(proposalTitle);
  await patternCard.getByLabel("Change target").selectOption("EVALUATION_CASE");
  await patternCard
    .getByLabel("Evidence-backed problem summary")
    .fill(
      "Two reviewer reports identify a possible repeated structure that needs controlled evaluation.",
    );
  await patternCard
    .getByLabel("Proposed change")
    .fill(
      "Add an adversarial near-copy fixture to the originality evaluation set without changing thresholds yet.",
    );
  await patternCard
    .getByLabel("Regression plan")
    .fill(
      "Verify that the known near-copy fails and independently authored controls continue to pass.",
    );
  await patternCard
    .getByRole("button", { name: "Create draft proposal" })
    .click();
  await expect(
    page.getByText(/draft proposal created with 2 immutable evidence links/i),
  ).toBeVisible();

  const proposalSection = page.locator(
    'section[aria-labelledby="proposals-heading"]',
  );
  const proposalCard = proposalSection
    .locator("article")
    .filter({ hasText: proposalTitle });
  await expect(proposalCard.getByText(/DRAFT/)).toBeVisible();
  await expect(proposalCard.getByText("2 evidence links")).toBeVisible();
  await proposalCard
    .locator('select[name="decision"]')
    .selectOption("APPROVED");
  await proposalCard
    .locator('input[name="notes"]')
    .fill(
      "Approve this regression-case plan only; implementation still requires a reviewed code change.",
    );
  await proposalCard.getByRole("button", { name: "Record decision" }).click();
  await expect(proposalCard.getByText(/APPROVED/)).toBeVisible();
  await expect(
    proposalCard.getByText(/approve this regression-case plan only/i),
  ).toBeVisible();
});

test("approves a template and deduplicates regeneration requests", async ({
  page,
}) => {
  await page.goto("/review/generation");
  await expect(
    page.getByRole("heading", {
      name: "Templates and generation requests",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Queue health" }),
  ).toBeVisible();
  await expect(page.getByText("Active worst-case ceiling")).toBeVisible();
  await expect(page.getByText("Recorded provider cost")).toBeVisible();

  const templateCard = page
    .locator("article")
    .filter({ hasText: "bootstrap.whole-number-groups-001" });
  const approveButton = templateCard.getByRole("button", {
    name: "Approve template",
  });
  if (await approveButton.isVisible()) {
    await templateCard
      .getByLabel("Approval evidence")
      .fill(
        "Checked the skill target, originality prohibition, constraints, and required validator contract.",
      );
    await approveButton.click();
    await expect(templateCard.getByText(/APPROVED · v1/)).toBeVisible();
  }

  await page.goto(`/review/questions/${firstVersionId}`);
  await page
    .getByLabel("Reviewer instruction")
    .fill(
      "Use a different practical context and add one explicit multiplication-reasoning step.",
    );
  await page.getByLabel("Regeneration scope").selectOption("FULL_REVISION");
  await page.getByLabel(/Maximum provider cost/).fill("25000");
  await page
    .getByLabel(/I confirm this instruction contains no third-party/)
    .check();
  await page
    .getByRole("button", { name: "Queue regeneration request" })
    .click();
  await expect(
    page.getByText(/generation request (queued|is already queued)/i),
  ).toBeVisible();

  await page
    .getByLabel("Reviewer instruction")
    .fill(
      "Use a different practical context and add one explicit multiplication-reasoning step.",
    );
  await page.getByLabel("Regeneration scope").selectOption("FULL_REVISION");
  await page.getByLabel(/Maximum provider cost/).fill("25000");
  await page
    .getByLabel(/I confirm this instruction contains no third-party/)
    .check();
  await page
    .getByRole("button", { name: "Queue regeneration request" })
    .click();
  await expect(
    page.getByText("An identical generation request is already queued."),
  ).toBeVisible();
});

test("cancels only a pending generation request with reviewer evidence", async ({
  page,
}) => {
  const uniqueInstruction = `E2E cancellation candidate ${Date.now()}: change the context while preserving the multiplication skill.`;
  const cancellationReason = `The reviewer intentionally cancels this E2E-only request before any provider dispatch. Audit nonce ${Date.now()}.`;
  await page.goto(`/review/questions/${firstVersionId}`);
  await page.getByLabel("Reviewer instruction").fill(uniqueInstruction);
  await page.getByLabel("Regeneration scope").selectOption("FULL_REVISION");
  await page.getByLabel(/Maximum provider cost/).fill("1000");
  await page
    .getByLabel(/I confirm this instruction contains no third-party/)
    .check();
  await page
    .getByRole("button", { name: "Queue regeneration request" })
    .click();
  await expect(page.getByText("Generation request queued.")).toBeVisible();

  await page.goto("/review/generation");
  const pendingRow = page
    .locator("tbody tr")
    .filter({ hasText: "whole-number-groups-001" })
    .filter({ hasText: "PENDING" })
    .first();
  await pendingRow.getByText("Cancel request").click();
  await pendingRow.getByLabel("Cancellation reason").fill(cancellationReason);
  await pendingRow
    .getByRole("button", { name: "Confirm cancellation" })
    .click();
  const cancelledRow = page
    .locator("tbody tr")
    .filter({ hasText: cancellationReason });
  await expect(
    cancelledRow.getByRole("cell", { name: "CANCELLED", exact: true }),
  ).toBeVisible();
  await expect(cancelledRow.getByText(cancellationReason)).toBeVisible();
});

test("has no horizontal overflow on the mobile review queue", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/review");

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);

  await page.goto("/review/feedback");
  const feedbackDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(feedbackDimensions.scrollWidth).toBe(feedbackDimensions.clientWidth);

  await page.goto("/review/sources");
  const sourceDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(sourceDimensions.scrollWidth).toBe(sourceDimensions.clientWidth);

  await page.goto("/review/generation");
  const generationDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(generationDimensions.scrollWidth).toBe(
    generationDimensions.clientWidth,
  );
});

test("versions reviewer rubrics and invalidates prior evidence", async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E tests.");
  const pool = new Pool({ connectionString: databaseUrl });
  const publication = await pool.query<{ question_version_id: string }>(
    `SELECT publication.question_version_id
     FROM question_publications AS publication
     INNER JOIN questions AS question ON question.id = publication.question_id
     WHERE question.internal_slug = 'whole-number-groups-001'
       AND publication.retired_at IS NULL
     LIMIT 1`,
  );
  await pool.end();
  const publishedVersionId = publication.rows[0]?.question_version_id;
  expect(publishedVersionId).toBeTruthy();

  await page.goto(`/review/questions/${publishedVersionId}`);
  await expect(page.getByText("Eligible for publication")).toBeVisible();

  await page.goto("/review/validators");
  await expect(
    page.getByRole("heading", { name: "Validator rule registry" }),
  ).toBeVisible();
  const ruleCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: /^accessibility v\d+$/ }),
  });
  const activeHeading = await ruleCard.getByRole("heading").textContent();
  const currentVersion = Number(activeHeading?.match(/v(\d+)$/)?.[1]);
  expect(currentVersion).toBeGreaterThan(0);

  await ruleCard.getByText(`Draft version ${currentVersion + 1}`).click();
  await ruleCard
    .getByLabel("Revised rubric description")
    .fill(
      `A reviewer verifies keyboard navigation, accessible naming, contrast, stimulus alternatives, and interaction semantics for this exact question version. Revision ${Date.now()}.`,
    );
  await ruleCard
    .getByLabel("Change rationale")
    .fill(
      "The revised accessibility rubric makes the required interaction checks explicit and intentionally invalidates prior evidence.",
    );
  await ruleCard.getByRole("checkbox").check();
  await ruleCard
    .getByRole("button", {
      name: `Activate accessibility v${currentVersion + 1}`,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: `accessibility v${currentVersion + 1}`,
    }),
  ).toBeVisible();

  await page.goto(`/review/questions/${publishedVersionId}`);
  await expect(
    page.getByText(/validator not passing · accessibility/i),
  ).toBeVisible();
  await expect(
    page.getByText(/accessibility v\d+ · retired rubric/i).first(),
  ).toBeVisible();
  await expect(page.getByText("STALE").first()).toBeVisible();
});
