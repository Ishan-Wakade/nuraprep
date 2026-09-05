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

test("requires every validation and approval before publication", async ({
  page,
}) => {
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
  await page.getByRole("button", { name: "Create new version" }).click();
  await expect(page).not.toHaveURL(`/review/questions/${firstVersionId}`);

  await expect(
    page.getByRole("button", { name: "Publish approved version" }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Run deterministic checks" }).click();
  const publicationCandidateUrl = page.url();
  await page.goto(`${publicationCandidateUrl}?validation=automated`);
  await expect(page.getByText("answer-contract v1").first()).toBeVisible();
  await expect(
    page.getByText("mathematical-correctness v1").first(),
  ).toBeVisible();

  for (const validatorKey of [
    "explanation-consistency",
    "accessibility",
    "topic-alignment",
    "originality",
  ]) {
    await page.getByLabel("Review check").selectOption(validatorKey);
    await page
      .getByLabel("Evidence")
      .fill(
        `E2E reviewer inspected ${validatorKey} against its documented rubric.`,
      );
    await page.getByRole("button", { name: "Append review evidence" }).click();
    await page.goto(`${publicationCandidateUrl}?validation=${validatorKey}`);
    await expect(page.getByText(`${validatorKey} v1`).first()).toBeVisible();
  }

  await page.getByLabel("Decision").selectOption("APPROVED");
  await page
    .getByLabel("Review notes")
    .fill("E2E review confirms all required evidence is present.");
  await page.getByRole("button", { name: "Record decision" }).click();

  await page.goto(`${publicationCandidateUrl}?validation=complete`);
  await expect(
    page.getByRole("button", { name: "Publish approved version" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Publish approved version" }).click();
  const publishedPage = await page.context().newPage();
  await publishedPage.goto(
    `${publicationCandidateUrl}?publication-check=${Date.now()}`,
  );
  await expect(
    publishedPage.getByRole("button", { name: "Currently published" }),
  ).toBeDisabled();
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
});
