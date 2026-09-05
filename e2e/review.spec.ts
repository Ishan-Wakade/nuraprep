import { expect, test } from "@playwright/test";

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

  await page
    .getByLabel("Canonical HTTPS URL")
    .fill(`https://example.org/nuraprep-ci/${Date.now()}`);
  await page.getByLabel("Publisher").fill("Example education publisher");
  await page.getByLabel("Title").fill(uniqueTitle);
  await page.getByLabel("Artifact type").fill("CONTENT_OUTLINE");
  await page.getByLabel("Access class").selectOption("PUBLIC");
  await page.getByLabel("Policy decision").selectOption("COVERAGE_ANALYSIS");
  await page
    .getByLabel("Decision rationale")
    .fill(
      "Retain only metadata and human-authored high-level coverage observations for this CI record.",
    );
  await page.getByRole("button", { name: "Register source" }).click();
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
});
