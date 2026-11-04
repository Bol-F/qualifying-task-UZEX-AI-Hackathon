import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": "192.0.2." + (1 + Math.floor(Math.random() * 220)),
  });
});
test("advanced comparisons, source drill-down, insights, pattern explorer and report print", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/analytics");
  await expect(
    page.getByText("Underlying records", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Urea (carbamide)", { exact: true }).check();
  await page.getByLabel("Portland cement", { exact: true }).check();
  await expect(page.locator(".recharts-line")).toHaveCount(2);
  await page.getByLabel("Analysis metric").selectOption("quantity");
  await expect(page.getByLabel("Measurement unit")).toBeVisible();
  await page.getByLabel("Measurement unit").selectOption("t");
  await expect(page.locator(".workspace-stat-strip")).toContainText("t");
  await page.getByLabel("Analysis metric").selectOption("count");
  await page.getByLabel("From date", { exact: true }).fill("2026-10-28");
  await page.getByLabel("To date", { exact: true }).fill("2026-10-28");
  await page.getByLabel("Compare against a baseline").check();
  await page.getByLabel("Baseline from").fill("2026-11-04");
  await page.getByLabel("Baseline to").fill("2026-11-04");
  await expect(page.locator(".comparison-metrics")).toContainText(
    "Unavailable",
  );
  await page.getByText("Inspect chart observations and source links").click();
  await page
    .locator(".workspace-data-table")
    .getByRole("link", { name: "Source trades" })
    .first()
    .click();
  await expect(page).toHaveURL(/productName=/);
  await expect(page.locator("tbody tr").first()).toContainText("2026-10-28");
  await page.goto("/analytics");
  await page.getByRole("tab", { name: "AI Insights", exact: true }).click();
  await expect(page.locator(".fact-row")).toHaveCount(3);
  await page.getByRole("button", { name: "Explain calculated facts" }).click();
  await expect(page.getByText(/Local tool mode is active/)).toBeVisible();
  await page.getByRole("tab", { name: "Pattern Explorer" }).click();
  await expect(
    page.getByRole("heading", { name: /Trade Pattern Explorer/ }),
  ).toBeVisible();
  await page.getByText("View statistical methods and thresholds").click();
  await expect(
    page.locator(".method-details").getByText(/Q3 \+ 3/),
  ).toBeVisible();
  await page.screenshot({ path: ".qa/phase3-patterns.png", fullPage: true });
  await page.goto("/reports");
  await page.getByLabel("Report from").fill("2026-10-24");
  await page.getByLabel("Report to").fill("2026-10-30");
  await expect(page.getByLabel("Report from")).toHaveValue("2026-10-24");
  await page
    .getByRole("button", { name: "Generate AI Report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Commodity intelligence briefing" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Source references", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".analytics-report")).toContainText(
    "Local tool mode is active",
  );
  await expect(page.locator(".report-kpis").first()).toContainText("42");
  await expect(
    page.locator('.analytics-report .recharts-surface[role="application"]'),
  ).toBeVisible();
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printed = "yes";
    };
  });
  await page.getByRole("button", { name: "Print / Save PDF" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-printed", "yes");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".report-controls")).toBeHidden();
  await page.screenshot({
    path: ".qa/phase3-report-print.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("judge journey adapts date, preserves Uzbek context, compares previous available day and exports chart CSV", async ({
  page,
  request,
}) => {
  const summary = await (await request.get("/api/analytics")).json();
  const demo = summary.demo;
  await page.goto("/dashboard");
  await expect(page.getByText("Your first insight starts here.")).toBeVisible();
  await page.getByRole("link", { name: /Ask AI a question in Uzbek/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Message to assistant" }),
  ).not.toHaveValue("");
  await page.goto("/assistant");
  async function ask(text: string) {
    await page
      .getByRole("textbox", { name: "Message to assistant" })
      .fill(text);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(
      page.getByRole("button", { name: "Regenerate answer" }),
    ).toBeVisible();
    await expect(page.locator(".thinking")).toHaveCount(0);
  }
  await ask(demo.questions[0]);
  await ask(demo.questions[1]);
  await expect(page.locator(".message.assistant").last()).toContainText(
    "Bitimlar natijalari",
  );
  await ask(demo.questions[2]);
  await expect(page.locator(".evidence-chart")).toBeVisible();
  await expect(page.locator(".evidence-response").last()).toContainText(
    demo.previous,
  );
  await page.getByLabel("Chart type").selectOption("area");
  await expect(page.locator(".recharts-area")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download chart CSV" }).click();
  expect((await download).suggestedFilename()).toBe("uzex-chart.csv");
  await page.screenshot({ path: ".qa/phase3-judge-chat.png", fullPage: true });
});
test("mobile advanced workspace and explicit empty data stay usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/analytics");
  await expect(page.locator(".workspace-stat-strip")).toBeVisible();
  await expect(
    page.locator('.market-series .recharts-surface[role="application"]'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".qa/phase3-market-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("From date", { exact: true }).fill("2026-11-04");
  await page.getByLabel("To date", { exact: true }).fill("2026-11-04");
  await expect(page.locator(".workspace-content")).toContainText(
    "No records match this selection",
  );
  await page.goto("/assistant");
  await expect(page.getByText(/Local tool mode is active/)).toBeVisible();
});
test("missing Gemini configuration is visible before a question is sent", async ({
  page,
}) => {
  await page.route("**/api/health", (route) =>
    route.fulfill({
      json: {
        status: "ok",
        dataMode: "demo",
        aiConfigured: false,
        aiMode: "auto",
      },
    }),
  );
  await page.goto("/assistant");
  await expect(
    page.getByText(/Gemini is not configured. Local data tools/),
  ).toBeVisible();
});
