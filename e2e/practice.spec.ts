import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("completes a published topic-practice question with feedback", async ({
  page,
}) => {
  await page.goto("/practice");

  await expect(
    page.getByRole("heading", { name: "Build a focused Math session." }),
  ).toBeVisible();
  await expect(page.getByText(/1 published question available/)).toBeVisible();

  await page.getByLabel("Number of questions").selectOption("1");
  await page.getByRole("button", { name: "Start practice" }).click();
  await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+\?item=1/);

  await expect(
    page.getByRole("heading", { name: "Question 1 of 1" }),
  ).toBeVisible();
  await expect(
    page.getByText(/volunteer team fills 24 cartons/i),
  ).toBeVisible();
  await expect(page.getByText(/The total is the number of boxes/)).toBeHidden();

  await page.locator('input[name="choiceId"][value="c"]').check();
  await page.getByLabel("Confidence (optional)").selectOption("4");
  await page.getByRole("button", { name: "Check answer" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Your reasoning landed on the right result.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/The total is the number of boxes/),
  ).toBeVisible();

  await page
    .getByText("Report a problem with this question", { exact: true })
    .click();
  await page.getByLabel("Issue category").selectOption("AMBIGUITY");
  const reportDetails =
    "The phrase about the volunteer team should be checked for unnecessary reading load.";
  await page
    .getByLabel("What should the reviewer inspect?")
    .fill(reportDetails);
  await page.getByRole("button", { name: "Send report to review" }).click();
  await expect(
    page.getByText("Report saved with this exact question version for review."),
  ).toBeVisible();

  const ownerPage = await page.context().newPage();
  await ownerPage.goto("/review?q=volunteer");
  await ownerPage
    .getByRole("link")
    .filter({ hasText: /volunteer team fills 24 cartons/i })
    .first()
    .click();
  const reportCard = ownerPage.locator("article").filter({
    hasText: reportDetails,
  });
  await expect(reportCard).toBeVisible();
  await reportCard.getByLabel("Triage status").selectOption("RESOLVED");
  await reportCard
    .getByLabel("Triage evidence")
    .fill(
      "Reviewed in the end-to-end owner workflow and accepted for follow-up.",
    );
  await reportCard.getByRole("button", { name: "Append triage event" }).click();
  await expect(
    reportCard.getByText("Report triage event appended to immutable history."),
  ).toBeVisible();

  await page.getByRole("link", { name: "View session summary" }).click();

  await expect(
    page.getByRole("heading", { name: "1 of 1 correct" }),
  ).toBeVisible();
  await expect(page.getByText(/not an official ATI score/i)).toBeVisible();
});

test("uses a responsive practice setup without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/practice");

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
});
