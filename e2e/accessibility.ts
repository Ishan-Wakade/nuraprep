import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectNoA11yViolations(page: Page) {
  // App Router metadata can settle after the first visible server payload in
  // development mode. Audit the stable document rather than that transition.
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summaries = results.violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id}: ${node.target.join(" ")} — ${node.failureSummary}`,
    ),
  );

  expect(summaries).toEqual([]);
}
