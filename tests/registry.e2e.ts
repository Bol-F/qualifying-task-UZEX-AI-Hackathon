import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";

// Run against the locally imported README2 registry, separately from the demo suite.
test.skip(
  process.env.UZEX_REGISTRY_E2E !== "1",
  "Requires npm run import:registry and a local-mode server",
);

test("README2 dashboard counts, provenance, missing-year state and mobile rendering", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const manifest = await (await request.get("/api/dataset")).json();
  expect(manifest.total).toBe(393353);
  expect(manifest.missingYears).toEqual([2024]);
  const summary = await (await request.get("/api/analytics")).json();
  expect(summary.count).toBe(393353);
  expect(summary.values).toEqual({
    UZS: "152777205033904.85",
    USD: "853516434.43",
  });
  expect(summary.convertedValueUZS).toBe("163014603800210.5204");
  expect(summary.cancelled).toBe(26396);
  await page.goto("/dashboard");
  await expect(page).toHaveTitle(/UZEX Insight AI/);
  await expect(page.locator(".kpi").first()).toContainText("393,353");
  await expect(
    page.getByText("SYNTHETIC CSV DATA", { exact: true }),
  ).toBeVisible();
  await page.locator(".registry-notice summary").click();
  await expect(page.locator(".registry-notice")).toContainText("2024");
  await expect(page.locator(".registry-notice")).toContainText(
    "Broker directory is missing",
  );
  await page.locator(".registry-notice summary").click();
  const dismiss = page.getByRole("button", { name: "Dismiss guided demo" });
  if (await dismiss.isVisible()) await dismiss.click();
  await page.screenshot({
    path: join(tmpdir(), "uzex-registry-desktop.png"),
    fullPage: false,
  });
  await page.getByLabel("Quantity summary unit").selectOption("килограмм");
  await expect(page.locator(".kpi").nth(2)).toContainText("килограмм");
  await page.getByLabel("Dashboard date range").selectOption("custom");
  await page.getByLabel("Dashboard from").fill("2024-01-01");
  await page.getByLabel("Dashboard to").fill("2024-12-31");
  await expect(page.locator(".kpi").first()).toContainText("0");
  await expect(page.locator(".chart-empty")).toContainText(
    "Missing data is not plotted as zero",
  );
  await page.getByLabel("Dashboard date range").selectOption("all");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".kpi").first()).toContainText("393,353");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: join(tmpdir(), "uzex-registry-mobile.png"),
    fullPage: false,
  });
  expect(errors).toEqual([]);
});

test("all five local workspaces fit mobile and preserve Russian source notices without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "dashboard",
    "trades",
    "analytics",
    "reports",
    "assistant",
  ]) {
    await page.goto("/" + route);
    await expect(page.locator(".data-notice")).toContainText(
      "SYNTHETIC CSV DATA",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("nextjs-portal")).toHaveCount(0);
  }
  await page.getByTestId("language-select").selectOption("ru");
  await expect(page.locator(".data-notice")).toContainText(
    "СИНТЕТИЧЕСКИЕ CSV-ДАННЫЕ",
  );
  await page.locator(".registry-notice summary").click();
  await expect(page.locator(".registry-notice")).toContainText("2024");
  expect(errors).toEqual([]);
});

test("registry search, joined details and CSV export agree with API source records", async ({
  page,
  request,
}) => {
  await page.goto("/trades?from=2026-10-30&to=2026-10-30");
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page.getByLabel("Search trades").fill("urea");
  await expect(page.locator("tbody tr").first()).toContainText(/Карбамид/i);
  const result = await (
    await request.get("/api/trades?search=urea&from=2026-10-30&to=2026-10-30")
  ).json();
  expect(result.total).toBeGreaterThan(0);
  await page.locator("tbody .commodity-button").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(result.rows[0].seller_name);
  await expect(dialog).toContainText(result.rows[0].total_amount);
  await expect(dialog).toContainText(result.rows[0].lot_count);
  await page.keyboard.press("Escape");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadEvent;
  const rows = parse<Record<string, string>>(
    await readFile((await download.path())!, "utf8"),
    {
      columns: true,
      bom: true,
    },
  );
  expect(rows.length).toBe(result.total);
  expect(rows[0].total_amount).toBe(result.rows[0].total_amount);
  expect(rows[0].seller_name).toBe(result.rows[0].seller_name);
});

test("local registry supports analytics, calculated reports and grounded bilingual follow-ups", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setExtraHTTPHeaders({ "x-forwarded-for": "198.51.100.245" });
  await page.goto("/analytics");
  await expect(page.locator(".workspace-stat-strip")).toContainText(
    "Underlying records",
  );
  await expect(page.getByLabel("From date")).toHaveValue("2026-10-01");
  await page.getByLabel("Search commodities").fill("Карбамид");
  await page.locator(".commodity-picker input[type=checkbox]").first().check();
  await expect(page.locator(".workspace-stat-strip")).toBeVisible();
  await page.goto("/reports");
  await page
    .getByRole("button", { name: "Generate AI Report", exact: true })
    .click();
  await expect(page.locator(".analytics-report")).toBeVisible();
  await expect(page.locator(".analytics-report")).toContainText("2026-10-01");
  const expected = await (
    await request.get("/api/trades?search=urea&from=2026-10-28&to=2026-10-28")
  ).json();
  await page.goto("/assistant");
  await page
    .locator(".composer textarea")
    .fill("Покажи сделки по карбамиду за 2026-10-28.");
  await page.locator('.composer button[type="submit"]').click();
  await expect(page.locator(".message.assistant")).toHaveCount(1);
  await expect(page.locator(".message.assistant").last()).toContainText(
    String(expected.total),
  );
  await expect(page.locator(".message.assistant").last()).toContainText("2024");
  await page
    .locator(".composer textarea")
    .fill("Endi natijani o'zbek tilida tushuntir.");
  await page.locator('.composer button[type="submit"]').click();
  await expect(page.locator(".message.assistant")).toHaveCount(2);
  await expect(page.locator(".message.assistant").last()).toHaveAttribute(
    "lang",
    "uz",
  );
  await expect(page.locator(".message.assistant").last()).toContainText(
    "2026-10-28",
  );
  expect(errors).toEqual([]);
});
