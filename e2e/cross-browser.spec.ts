import { expect, test } from "@playwright/test";

const entryPoints = [
  { path: "/", heading: "Know what to study next." },
  { path: "/sign-in", heading: "Welcome to NuraPrep." },
  { path: "/practice", heading: "Build a focused Math session." },
  { path: "/review", heading: "Question review queue" },
] as const;

test("renders critical entry points without horizontal overflow", async ({
  page,
}) => {
  for (const entryPoint of entryPoints) {
    await page.goto(entryPoint.path);
    await expect(
      page.getByRole("heading", { name: entryPoint.heading }),
    ).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  }
});
