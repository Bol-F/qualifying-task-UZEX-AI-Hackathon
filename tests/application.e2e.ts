import { test, expect } from "@playwright/test";
test("dashboard, filters, details, export and grounded assistant", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/dashboard");
  await expect(page.getByText("DEMO DATA MODE")).toBeVisible();
  await expect(page.getByText("184", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Transaction activity" }),
  ).toBeVisible();
  await page.screenshot({ path: ".qa/dashboard-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Count", exact: true }).click();
  await expect(page.getByText("Transaction count over time")).toBeVisible();
  await page.goto("/trades");
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page.getByRole("textbox", { name: "Search trades" }).fill("urea");
  await expect(page.locator("tbody tr").first()).toContainText("Urea");
  await expect(page.locator("tbody")).not.toContainText("Portland");
  await page
    .getByRole("button", { name: /View SYN/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Transaction details");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("uzex-trades.csv");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("From date").fill("2026-11-04");
  await expect(page.getByText("No matching transactions")).toBeVisible();
  await page.screenshot({ path: ".qa/trades-empty.png", fullPage: true });
  await page.goto("/assistant");
  await page.getByRole("button", { name: "Русский" }).click();
  await page
    .getByRole("button", { name: /Покажи сделки по карбамиду/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Результаты анализа", level: 3 }),
  ).toBeVisible();
  await expect(
    page.getByText("ДЕМО: синтетические данные, не реальные сделки UZEX."),
  ).toBeVisible();
  await page.screenshot({ path: ".qa/assistant-desktop.png", fullPage: true });
  await page.reload();
  await expect(page.locator(".history-items button")).toHaveCount(1);
  const bad = await request.get("/api/trades?from=2026-02-30");
  expect(bad.status()).toBe(400);
  const all = await request.get("/api/analytics");
  expect((await all.json()).count).toBe(184);
  const health = await request.get("/api/health");
  expect((await health.json()).status).toBe("ok");
  expect(errors).toEqual([]);
});
test("mobile layout has no page overflow and navigation works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(page.getByText("184", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".qa/dashboard-mobile.png", fullPage: true });
  await page.getByTitle("AI Assistant").click();
  await expect(
    page.getByRole("heading", { name: "AI Assistant" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".qa/assistant-mobile.png", fullPage: true });
});
