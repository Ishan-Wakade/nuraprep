import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import reviewedMathBankJson from "../src/content/reviewed-math-bank.json";
import { reviewedMathBankSnapshotSchema } from "../src/lib/questions/reviewed-bank-snapshot";
import { expectNoA11yViolations } from "./accessibility";

test.describe.configure({ mode: "serial" });

const reviewedMathBank =
  reviewedMathBankSnapshotSchema.parse(reviewedMathBankJson);
let diagnosticWeakSkillTitle = "";
const graphFixtureVersionId = "26000000-0000-4000-8000-000000000001";

test("completes a published topic-practice question with feedback", async ({
  page,
}) => {
  await page.goto("/practice");

  await expect(
    page.getByRole("heading", { name: "Build a focused Math session." }),
  ).toBeVisible();
  await expect(
    page.getByText(/38 published questions available/),
  ).toBeVisible();

  const arithmeticValue = await page
    .getByLabel("Topic")
    .locator("option")
    .filter({ hasText: "Arithmetic" })
    .getAttribute("value");
  expect(arithmeticValue).toBeTruthy();
  await page.getByLabel("Topic").selectOption(arithmeticValue!);
  await page.getByLabel("Question type").selectOption("SINGLE_CHOICE");
  await page.getByLabel("Number of questions").selectOption("1");
  await page.getByRole("button", { name: "Start practice" }).click();
  await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+\?item=1/);

  await expect(
    page.getByRole("heading", { name: "Question 1 of 1" }),
  ).toBeVisible();
  const prompt = await page.getByRole("heading", { level: 2 }).textContent();
  const fixture = practiceFixtureFor(prompt);
  await expect(page.getByText(fixture.explanation)).toBeHidden();
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Ask for a hint" }).click();
  await expect(
    page.getByText("A reviewed tutor step is now visible."),
  ).toBeVisible();
  await expect(page.getByText(fixture.hint)).toBeVisible();
  await expect(page.getByText(fixture.explanation)).toBeHidden();
  await expectNoA11yViolations(page);

  await page
    .locator(`input[name="choiceId"][value="${fixture.wrongChoiceId}"]`)
    .check();
  await page.getByLabel("Confidence (optional)").selectOption("4");
  await page.getByRole("button", { name: "Check answer" }).click();

  await expect(
    page.getByRole("heading", {
      name: fixture.correctAnswer,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Reasoning pattern to revisit" }),
  ).toBeVisible();
  await expect(page.getByText(fixture.misconception)).toBeVisible();
  await expect(page.getByText(fixture.reflection)).toBeVisible();
  await expect(page.getByText(fixture.explanation)).toBeVisible();
  await expectNoA11yViolations(page);

  await page
    .getByText("Report a problem with this question", { exact: true })
    .click();
  await page.getByLabel("Issue category").selectOption("AMBIGUITY");
  const reportDetails =
    "The selected reviewed question should be checked for unnecessary reading load.";
  await page
    .getByLabel("What should the reviewer inspect?")
    .fill(reportDetails);
  await page.getByRole("button", { name: "Send report to review" }).click();
  await expect(
    page.getByText("Report saved with this exact question version for review."),
  ).toBeVisible();

  const ownerPage = await page.context().newPage();
  await ownerPage.goto(`/review?q=${encodeURIComponent(prompt ?? "")}`);
  await ownerPage
    .getByRole("link")
    .filter({ hasText: prompt ?? "" })
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
  await expectNoA11yViolations(page);
});

function practiceFixtureFor(prompt: string | null) {
  if (prompt?.includes("volunteer team fills 24 cartons")) {
    return {
      correctAnswer: "Correct answer: C. 432",
      explanation: /The total is the number of boxes/,
      hint: /what operation represents several equal groups/i,
      misconception: /added the number of groups and the amount/i,
      reflection: /if one more carton were added/i,
      wrongChoiceId: "a",
    };
  }
  if (prompt?.includes("temperature was −4°C")) {
    return {
      correctAnswer: "Correct answer: C. 7 degrees Celsius",
      explanation: /An increase of 11°C means add 11/,
      hint: /in which direction does an increase move/i,
      misconception: /treated the starting temperature as positive/i,
      reflection: /rise to end at exactly 0°C/i,
      wrongChoiceId: "d",
    };
  }
  throw new Error(`Unexpected published Arithmetic fixture: ${prompt}`);
}

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

test("renders an accessible graph and exact-value fallback in learner practice", async ({
  page,
}) => {
  const sessionId = await createGraphPracticeSession();
  await page.goto(`/practice/${sessionId}?item=1`);

  await expect(
    page.getByRole("heading", { name: "Question 1 of 1" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: /Clinic appointments.*Monday has 12.*Tuesday has 18.*Wednesday has 11/i,
    }),
  ).toBeVisible();
  await expect(page.locator("figure svg rect")).toHaveCount(3);

  await page.getByText("View graph data as a table", { exact: true }).click();
  const graphTable = page.locator("figure table");
  await expect(
    graphTable.getByRole("columnheader", { name: "Weekday" }),
  ).toBeVisible();
  await expect(
    graphTable.getByRole("columnheader", { name: "Appointments" }),
  ).toBeVisible();
  await expect(graphTable.getByRole("cell", { name: "Monday" })).toBeVisible();
  await expect(graphTable.getByRole("cell", { name: "12" })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByLabel("Numeric answer").fill("30");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(
    page.getByText("Your reasoning landed on the right result."),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
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
    page.getByText("12 published skills · 38 published questions"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start diagnostic" }).click();
  await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+\?item=1/);

  for (let position = 1; position <= 6; position += 1) {
    await expect(
      page.getByRole("heading", { name: `Question ${position} of 6` }),
    ).toBeVisible();
    if (position === 1) {
      const sessionLabel =
        (await page.getByText(/Math diagnostic ·/i).textContent()) ?? "";
      diagnosticWeakSkillTitle =
        sessionLabel.match(/Math diagnostic · (.+) ·/i)?.[1] ?? "";
      expect(diagnosticWeakSkillTitle).toBeTruthy();
    }
    await answerReviewedQuestion(page, { forceIncorrect: position === 1 });
    await page.getByLabel("Confidence (optional)").selectOption("4");
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(
      page.getByRole("heading", { name: "Worked solution" }),
    ).toBeVisible();

    await page
      .getByRole("link", {
        name:
          position === 6
            ? "View session summary"
            : "Continue to next question →",
      })
      .click();
  }

  await expect(page.getByText("Diagnostic results")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "5 of 6 correct" }),
  ).toBeVisible();
  await expect(page.getByText("Personalized starting point")).toBeVisible();
  await expect(
    page
      .locator("section")
      .filter({ hasText: "Personalized starting point" })
      .getByRole("heading", { name: diagnosticWeakSkillTitle }),
  ).toBeVisible();
  await expect(page.getByText(/not proof of mastery/i)).toBeVisible();
  await page.getByRole("link", { name: "Practice this skill" }).click();
  await expect(
    page.getByLabel("Topic").locator("option:checked"),
  ).toContainText(diagnosticWeakSkillTitle);
});

test("builds and completes an inspectable adaptive session", async ({
  page,
}) => {
  await page.goto("/practice/adaptive");

  await expect(
    page.getByRole("heading", { name: "Practice where the evidence points." }),
  ).toBeVisible();
  const firstPriority = page.locator("li").filter({
    has: page.getByText("Priority 1", { exact: true }),
  });
  await expect(firstPriority.getByRole("heading")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: diagnosticWeakSkillTitle }),
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
        /adaptive-baseline-v1; adaptive score -?\d\.\d{3}/,
      ),
    ).toBeVisible();
    await answerReviewedQuestion(page);
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

test("completes a 38-question timed Math simulation without answer leakage", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/practice/test");

  await expect(
    page.getByRole("heading", { name: "Rehearse the complete Math section." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Reviewed bank ready" }),
  ).toBeVisible();
  await expect(
    page.getByText(/38 unique current question families/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start timed Math test" }).click();
  await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+\?item=1/);

  await page.getByRole("button", { name: "Mark for review" }).click();
  await expect(page.getByText("Question marked for review.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Question 1, marked for review" }),
  ).toBeVisible();

  for (let position = 1; position <= 38; position += 1) {
    await expect(
      page.getByRole("heading", { name: `Question ${position} of 38` }),
    ).toBeVisible();
    await answerReviewedQuestion(page, { forceIncorrect: position === 1 });
    await page
      .getByRole("button", { name: "Save answer and continue" })
      .click();
    if (position < 38) {
      await expect(
        page.getByRole("heading", { name: "Worked solution" }),
      ).toBeHidden();
    }
  }

  await expect(page.getByText("Timed Math test results")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "37 of 38 correct" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "How the time was used" }),
  ).toBeVisible();
  await expect(page.getByText(/not an official ATI score/i)).toBeVisible();

  await page.getByRole("link", { name: "Review test answers" }).click();
  await expect(
    page.getByRole("heading", { name: "Worked solution" }),
  ).toBeVisible();
});

test("submits a timed Math simulation early without fabricating answers", async ({
  page,
}) => {
  await page.goto("/practice/test");
  await page.getByRole("button", { name: "Start timed Math test" }).click();
  await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+\?item=1/);

  await page.getByText("Submit test", { exact: true }).click();
  await expect(page.getByText("0 of 38 answers are saved.")).toBeVisible();
  await page.getByRole("button", { name: "Confirm submission" }).click();

  await expect(page.getByText("Timed Math test results")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "0 of 0 correct" }),
  ).toBeVisible();
  await expect(page.getByText("0 of 38", { exact: true })).toBeVisible();
});

test("creates a versioned readiness estimate and edits its study plan", async ({
  page,
}) => {
  await page.goto("/practice/progress");
  await page
    .getByRole("button", { name: /Create estimate|Refresh estimate/ })
    .click();
  await expect(page).toHaveURL(/\/practice\/progress\?estimate=[a-f0-9-]+/);

  await expect(
    page.getByText("NuraPrep Math readiness estimate"),
  ).toBeVisible();
  await expect(page.getByText("score-baseline-v1")).toBeVisible();
  await expect(
    page.getByText(/not an official ATI score/i).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "By Math domain" }),
  ).toBeVisible();

  const firstPlanItem = page
    .locator("section")
    .filter({ hasText: "Editable weekly plan" })
    .locator("li")
    .first();
  await firstPlanItem.getByLabel("Status").selectOption("IN_PROGRESS");
  await firstPlanItem.getByLabel("Minutes/week").fill("75");
  await firstPlanItem.getByRole("button", { name: "Save item" }).click();
  await expect(
    firstPlanItem.getByText("Study-plan item updated."),
  ).toBeVisible();
  await page.getByLabel("Total weekly study budget").fill("240");
  await page
    .getByLabel("Personal notes")
    .fill("Study in four focused blocks before the next simulation.");
  await page.getByRole("button", { name: "Save plan preferences" }).click();
  await expect(page.getByText("Study-plan preferences updated.")).toBeVisible();

  await page.getByRole("button", { name: "Refresh estimate" }).click();
  await expect(
    page.getByRole("heading", { name: "Readiness trend" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: /2 saved NuraPrep Math readiness estimates/i,
    }),
  ).toBeVisible();
  await page.getByText("View exact estimate history").click();
  const estimateHistory = page.getByRole("table", {
    name: "Exact readiness estimate history",
  });
  await expect(estimateHistory).toBeVisible();
  await expect(estimateHistory.getByRole("row")).toHaveCount(3);

  await page.setViewportSize({ width: 390, height: 844 });
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
});

async function answerReviewedQuestion(
  page: import("@playwright/test").Page,
  options: { forceIncorrect?: boolean } = {},
) {
  const prompt = (await page.locator("h2").first().innerText()).trim();
  const question = reviewedMathBank.questions.find(
    (candidate) =>
      candidate.content.prompt === prompt ||
      candidate.content.prompt.repeat(2) === prompt,
  );
  if (!question) throw new Error(`Unknown reviewed Math question: ${prompt}`);

  const answer = question.content.answerSpec;
  const choices = question.content.choices ?? [];
  if (answer.type === "single_choice") {
    const choiceId = options.forceIncorrect
      ? choices.find((choice) => choice.id !== answer.choiceId)?.id
      : answer.choiceId;
    if (!choiceId) throw new Error(`No selectable response for: ${prompt}`);
    await page.locator(`input[name="choiceId"][value="${choiceId}"]`).check();
    return;
  }

  if (answer.type === "multiple_select") {
    const choiceIds = options.forceIncorrect
      ? choices
          .filter((choice) => !answer.choiceIds.includes(choice.id))
          .slice(0, 1)
          .map((choice) => choice.id)
      : answer.choiceIds;
    if (!choiceIds.length) {
      throw new Error(`No selectable response for: ${prompt}`);
    }
    for (const choiceId of choiceIds) {
      await page.locator(`input[name="choiceId"][value="${choiceId}"]`).check();
    }
    return;
  }

  if (answer.type === "numeric") {
    const value = options.forceIncorrect ? answer.value + 12_345 : answer.value;
    await page.getByLabel("Numeric answer").fill(String(value));
    if (answer.unitRequired) {
      await page
        .getByLabel("Unit")
        .fill(answer.unit ?? answer.acceptedUnits[0] ?? "units");
    }
    return;
  }

  await orderResponse(page, answer.itemIds, choices);
  if (options.forceIncorrect) {
    const firstChoice = choices.find(
      (choice) => choice.id === answer.itemIds[0],
    );
    if (!firstChoice) throw new Error(`Missing ordered choice for: ${prompt}`);
    await page
      .getByRole("button", {
        name: `Move ${firstChoice.content} down`,
        exact: true,
      })
      .click();
  }
}

async function createGraphPracticeSession() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E tests.");
  const target = new URL(databaseUrl);
  const databaseName = decodeURIComponent(target.pathname.slice(1));
  if (!databaseName.endsWith("_e2e")) {
    throw new Error(
      `Refusing to write graph fixtures outside an E2E database: ${databaseName}`,
    );
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const learner = await client.query<{ id: string }>(
      `INSERT INTO learner_profiles (auth_subject, display_name)
       VALUES ('development-learner', 'Development learner')
       ON CONFLICT (auth_subject) DO UPDATE
       SET display_name = EXCLUDED.display_name, updated_at = now()
       RETURNING id`,
    );
    const learnerId = learner.rows[0]?.id;
    if (!learnerId) throw new Error("Failed to resolve the E2E learner.");

    const session = await client.query<{ id: string }>(
      `INSERT INTO practice_sessions
       (learner_id, mode, status, timing_mode, requested_question_count, filters)
       VALUES ($1, 'TOPIC_PRACTICE', 'IN_PROGRESS', 'UNTIMED', 1, $2::jsonb)
       RETURNING id`,
      [
        learnerId,
        JSON.stringify({
          questionCount: 1,
          timingMode: "UNTIMED",
          newOnly: false,
          missedOnly: false,
        }),
      ],
    );
    const sessionId = session.rows[0]?.id;
    if (!sessionId) throw new Error("Failed to create the graph session.");

    await client.query(
      `INSERT INTO practice_session_items
       (session_id, question_version_id, position, selection_reason)
       VALUES ($1, $2, 1, $3)`,
      [
        sessionId,
        graphFixtureVersionId,
        "Synthetic E2E-only session for graph rendering and accessibility checks.",
      ],
    );
    await client.query("COMMIT");
    return sessionId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function orderResponse(
  page: import("@playwright/test").Page,
  targetOrder: string[],
  choices: { id: string; content: string }[],
) {
  for (const [targetIndex, choiceId] of targetOrder.entries()) {
    let currentOrder = await page
      .locator('input[name="orderedItemId"]')
      .evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value),
      );
    while (currentOrder.indexOf(choiceId) > targetIndex) {
      const content = choices.find((choice) => choice.id === choiceId)?.content;
      if (!content)
        throw new Error(`Missing ordered-response choice ${choiceId}.`);
      await page
        .getByRole("button", { name: `Move ${content} up`, exact: true })
        .click();
      currentOrder = await page
        .locator('input[name="orderedItemId"]')
        .evaluateAll((inputs) =>
          inputs.map((input) => (input as HTMLInputElement).value),
        );
    }
  }
}
