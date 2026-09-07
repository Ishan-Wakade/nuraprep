import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const entrySurfaces = [
  ["landing page", "/"],
  ["sign-in", "/sign-in"],
  ["practice home", "/practice"],
  ["diagnostic setup", "/practice/diagnostic"],
  ["adaptive setup", "/practice/adaptive"],
  ["timed-test setup", "/practice/test"],
  ["progress", "/practice/progress"],
  ["account", "/account"],
  ["review queue", "/review"],
] as const;

test.describe("automated accessibility gate", () => {
  for (const [name, path] of entrySurfaces) {
    test(`${name} has no detectable WCAG A or AA violations`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();

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
    });
  }

  test("keyboard users can skip repeated navigation", async ({ page }) => {
    await page.goto("/");

    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });
});
