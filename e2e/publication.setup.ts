import { expect, test as setup } from "@playwright/test";

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
    await expect(
      page.getByText(`${validatorKey} evidence appended as pass.`),
    ).toBeVisible();
    await page.goto(`${publicationCandidateUrl}?validation=${validatorKey}`);
    await expect(page.getByText(`${validatorKey} v1`).first()).toBeVisible();
  }

  await page.getByLabel("Decision").selectOption("APPROVED");
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
});
