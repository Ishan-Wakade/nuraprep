import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./accessibility";

const entrySurfaces = [
  ["landing page", "/", "NuraPrep | Thoughtful TEAS Math Practice"],
  ["privacy notice", "/privacy", "Privacy | NuraPrep"],
  ["terms of use", "/terms", "Terms | NuraPrep"],
  ["sign-in", "/sign-in", "Sign in | NuraPrep"],
  ["practice home", "/practice", "Topic practice | NuraPrep"],
  ["diagnostic setup", "/practice/diagnostic", "Math diagnostic | NuraPrep"],
  ["adaptive setup", "/practice/adaptive", "Adaptive Math practice | NuraPrep"],
  ["timed-test setup", "/practice/test", "Timed Math simulation | NuraPrep"],
  ["progress", "/practice/progress", "Progress and study plan | NuraPrep"],
  ["account", "/account", "Account and data | NuraPrep"],
  ["review queue", "/review", "Question queue | NuraPrep"],
  ["feedback patterns", "/review/feedback", "Feedback patterns | NuraPrep"],
  ["source register", "/review/sources", "Source register | NuraPrep"],
  [
    "generation operations",
    "/review/generation",
    "Generation operations | NuraPrep",
  ],
  ["validator rules", "/review/validators", "Validator rules | NuraPrep"],
  [
    "not-found recovery",
    "/this-route-does-not-exist",
    "Page not found | NuraPrep",
  ],
] as const;

test.describe("automated accessibility gate", () => {
  for (const [name, path, title] of entrySurfaces) {
    test(`${name} has no detectable WCAG A or AA violations`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page).toHaveTitle(title);

      await expectNoA11yViolations(page);
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

  test("reduced-motion preference suppresses interface motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const motion = await page.evaluate(() => {
      const button = document.querySelector(".button");
      if (!(button instanceof HTMLElement)) {
        throw new Error("Expected a primary landing-page action.");
      }

      const toMilliseconds = (duration: string) =>
        duration.endsWith("ms")
          ? Number.parseFloat(duration)
          : Number.parseFloat(duration) * 1_000;

      return {
        scrollBehavior: getComputedStyle(document.documentElement)
          .scrollBehavior,
        transitionDurations: getComputedStyle(button)
          .transitionDuration.split(",")
          .map((duration) => toMilliseconds(duration.trim())),
      };
    });

    expect(motion.scrollBehavior).toBe("auto");
    expect(motion.transitionDurations.length).toBeGreaterThan(0);
    expect(
      motion.transitionDurations.every((duration) => duration <= 0.01),
    ).toBe(true);
  });
});
