import { expect, test } from "@playwright/test";

test("presents the product accurately", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /know what to study next/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/currently in active development/i),
  ).toBeVisible();
  await expect(
    page.getByText(/not affiliated with or endorsed by ATI/i),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /view on github/i }),
  ).toHaveAttribute("href", "https://github.com/Ishan-Wakade/nuraprep");
  await expect(
    page.getByRole("link", { name: /open math practice/i }),
  ).toHaveAttribute("href", "/practice");
});

test("reports application and database health without cacheable details", async ({
  request,
}) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("has no horizontal overflow on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  await expect(page.getByRole("link", { name: /view roadmap/i })).toBeVisible();
});
