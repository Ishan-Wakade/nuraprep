import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("completes a published topic-practice question with feedback", async ({
  page,
}) => {
  await page.goto("/practice");

  await expect(
    page.getByRole("heading", { name: "Build a focused Math session." }),
  ).toBeVisible();
  await expect(page.getByText(/6 published questions available/)).toBeVisible();

  const arithmeticValue = await page
    .getByLabel("Topic")
    .locator("option")
    .filter({ hasText: "Arithmetic" })
    .getAttribute("value");
  expect(arithmeticValue).toBeTruthy();
  await page.getByLabel("Topic").selectOption(arithmeticValue!);
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

  await page.getByRole("button", { name: "Ask for a hint" }).click();
  await expect(
    page.getByText("A reviewed tutor step is now visible."),
  ).toBeVisible();
  await expect(
    page.getByText(/what operation represents several equal groups/i),
  ).toBeVisible();
  await expect(page.getByText(/The total is the number of boxes/)).toBeHidden();

  await page.locator('input[name="choiceId"][value="a"]').check();
  await page.getByLabel("Confidence (optional)").selectOption("4");
  await page.getByRole("button", { name: "Check answer" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Correct answer: C. 432",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Reasoning pattern to revisit" }),
  ).toBeVisible();
  await expect(
    page.getByText(/added the number of groups and the amount/i),
  ).toBeVisible();
  await expect(page.getByText(/if one more carton were added/i)).toBeVisible();
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
    page.getByRole("heading", { name: "0 of 1 correct" }),
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

test("completes a coverage-aware diagnostic and recommends a starting skill", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/practice/diagnostic");

  await expect(
    page.getByRole("heading", { name: "Find a defensible starting point." }),
  ).toBeVisible();
  await expect(
    page.getByText("5 published skills · 6 published questions"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start diagnostic" }).click();
  await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+\?item=1/);

  for (let position = 1; position <= 5; position += 1) {
    await expect(
      page.getByRole("heading", { name: `Question ${position} of 5` }),
    ).toBeVisible();
    await answerDiagnosticQuestion(page);
    await page.getByLabel("Confidence (optional)").selectOption("4");
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(
      page.getByRole("heading", { name: "Worked solution" }),
    ).toBeVisible();

    await page
      .getByRole("link", {
        name:
          position === 5
            ? "View session summary"
            : "Continue to next question →",
      })
      .click();
  }

  await expect(page.getByText("Diagnostic results")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "4 of 5 correct" }),
  ).toBeVisible();
  await expect(page.getByText("Personalized starting point")).toBeVisible();
  await expect(
    page
      .locator("section")
      .filter({ hasText: "Personalized starting point" })
      .getByRole("heading", { name: "Arithmetic" }),
  ).toBeVisible();
  await expect(page.getByText(/not proof of mastery/i)).toBeVisible();
  await page.getByRole("link", { name: "Practice this skill" }).click();
  await expect(page.getByLabel("Topic").locator("option:checked")).toHaveText(
    /Arithmetic/,
  );
});

test("builds and completes an inspectable adaptive session", async ({
  page,
}) => {
  await page.goto("/practice/adaptive");

  await expect(
    page.getByRole("heading", { name: "Practice where the evidence points." }),
  ).toBeVisible();
  const firstPriority = page.locator("li").filter({ hasText: "Priority 1" });
  await expect(
    firstPriority.getByRole("heading", { name: "Arithmetic" }),
  ).toBeVisible();
  await expect(page.getByText("adaptive-baseline-v1")).toBeVisible();

  await page.getByLabel("Session length").selectOption("3");
  await page.getByRole("button", { name: "Start adaptive practice" }).click();
  await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+\?item=1/);

  for (let position = 1; position <= 3; position += 1) {
    await expect(page.getByText(/Adaptive practice ·/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: `Question ${position} of 3` }),
    ).toBeVisible();
    const selectionDetails = page.locator("details");
    await expect(selectionDetails).toHaveAttribute("open", "");
    await expect(
      selectionDetails.getByText(
        /adaptive-baseline-v1; adaptive score \d\.\d{3}/,
      ),
    ).toBeVisible();
    await answerDiagnosticQuestion(page);
    await page.getByLabel("Confidence (optional)").selectOption("3");
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(
      page.getByRole("heading", { name: "Worked solution" }),
    ).toBeVisible();
    await page
      .getByRole("link", {
        name:
          position === 3
            ? "View session summary"
            : "Continue to next question →",
      })
      .click();
  }

  const evidence = page
    .locator("section")
    .filter({ hasText: "Session evidence" });
  await expect(evidence.getByText("adaptive", { exact: true })).toBeVisible();
});

async function answerDiagnosticQuestion(page: import("@playwright/test").Page) {
  const prompt = (await page.locator("h2").first().textContent()) ?? "";

  if (prompt.includes("volunteer team fills 24 cartons")) {
    await page.locator('input[name="choiceId"][value="a"]').check();
    return;
  }
  if (prompt.includes("Write 7/8 as a decimal")) {
    await page.getByLabel("Numeric answer").fill("0.875");
    return;
  }
  if (prompt.includes("equivalent to 3:5")) {
    await page.locator('input[name="choiceId"][value="a"]').check();
    await page.locator('input[name="choiceId"][value="c"]').check();
    return;
  }
  if (prompt.includes("Arrange the values")) {
    await page.getByRole("button", { name: "Move 0.206 up" }).click();
    await page.getByRole("button", { name: "Move 0.206 up" }).click();
    await page.getByRole("button", { name: "Move 0.26 up" }).click();
    await page.getByRole("button", { name: "Move 0.26 up" }).click();
    await page.getByRole("button", { name: "Move 0.602 up" }).click();
    return;
  }
  if (prompt.includes("median number of books")) {
    await page.locator('input[name="choiceId"][value="b"]').check();
    return;
  }
  if (prompt.includes("garden has a perimeter")) {
    await page.locator('input[name="choiceId"][value="a"]').check();
    return;
  }

  throw new Error(`Unhandled diagnostic fixture: ${prompt}`);
}
