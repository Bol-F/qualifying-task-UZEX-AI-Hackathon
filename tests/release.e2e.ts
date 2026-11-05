import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": "198.51.100." + (1 + Math.floor(Math.random() * 220)),
  });
});

test("dashboard date/commodity selection follows available records and empty selection is honest", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page.getByText("184", { exact: true })).toBeVisible();
  await page.getByLabel("Dashboard date range").selectOption("latest");
  await expect(page.locator(".kpi").first()).toContainText("42");
  await page.getByLabel("Dashboard commodity").selectOption("Urea (carbamide)");
  await expect(page.locator(".kpi").first()).toContainText("6");
  await expect(page.locator(".recent-panel tbody")).not.toContainText(
    "Natural gas",
  );
  await page.getByLabel("Dashboard date range").selectOption("custom");
  await page.getByLabel("Dashboard from").fill("2026-11-04");
  await page.getByLabel("Dashboard to").fill("2026-11-04");
  await expect(
    page.getByText("No supported activity observation"),
  ).toBeVisible();
  await expect(page.locator(".chart-empty")).toContainText(
    "Missing data is not plotted as zero",
  );
  await page.getByRole("button", { name: "Reset selection" }).click();
  await expect(page.getByText("184", { exact: true })).toBeVisible();
});

test("trade filtering, exact source IDs and exported rows retain identical constraints", async ({
  page,
  request,
}) => {
  await page.goto("/trades");
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page.keyboard.press("/");
  await expect(page.getByLabel("Search trades")).toBeFocused();
  const all = await (
    await request.get("/api/trades?pageSize=100&search=urea")
  ).json();
  await page.getByLabel("Search trades").fill(all.rows[0].contract_number);
  await expect(page.locator("tbody tr").first()).toContainText(
    all.rows[0].contract_number,
  );
  await page.getByLabel("Search trades").fill("urea");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("From date", { exact: true }).fill("2026-10-24");
  await page.getByLabel("To date", { exact: true }).fill("2026-10-30");
  await page.getByLabel("Currency", { exact: true }).selectOption("USD");
  await expect(page.getByText("No matching transactions")).toBeVisible();
  await expect(page.locator(".active-trade-filters")).toContainText("USD");
  await page.getByLabel("Currency", { exact: true }).selectOption("UZS");
  await page.getByLabel("Quoted price basis").fill("t");
  await page.getByLabel("Minimum unit price").fill("1");
  await page.getByLabel("Sort by").selectOption("price");
  await page.getByLabel("Sort order").selectOption("asc");
  const expected = await (
    await request.get(
      "/api/trades?search=urea&from=2026-10-24&to=2026-10-30&currency=UZS&priceUnit=t&minPrice=1&sort=price&order=asc&pageSize=100",
    )
  ).json();
  await expect(page.locator("tbody tr")).toHaveCount(expected.total);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const download = await downloadPromise;
  const csv = parse<{id:string}>(await readFile((await download.path())!, "utf8"), {
    columns: true,
    bom: true,
  });
  expect(csv.map((row: { id: string }) => row.id)).toEqual(
    expected.rows.map((row: { id: string }) => row.id),
  );
  expect(new Set(csv.map((row: { id: string }) => row.id)).size).toBe(
    csv.length,
  );
  await page.goto("/trades?currency=USD");
  await expect(page.getByText("No matching transactions")).toBeVisible();
  await page.goto("/trades?id=" + encodeURIComponent(expected.rows[0].id));
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: /View SYN/ }).click();
  await expect(page.getByRole("dialog")).toContainText(expected.rows[0].id);
  await page.keyboard.press("Escape");
});

test("invalid API requests cannot broaden access or mutate data; rate limits apply", async ({
  request,
}) => {
  for (const query of [
    "search=*",
    "from=2026-02-30",
    "pageSize=10001",
    "sort=drop%20table",
    "minPrice=2&currency=UZS",
    "minQuantity=2",
    "currency=usd",
  ])
    expect((await request.get("/api/trades?" + query)).status()).toBe(400);
  const hostile = await request.get(
    "/api/trades?search=" + encodeURIComponent("urea%),id.neq.0"),
  );
  expect(hostile.status()).toBe(200);
  expect((await hostile.json()).total).toBe(0);
  expect(
    (await request.post("/api/trades", { data: { price: 1 } })).status(),
  ).toBe(405);
  expect(
    (
      await request.post("/api/chat", {
        headers: { Origin: "https://untrusted.invalid" },
        data: { message: "x" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/reports", {
        data: { products: [], from: "2026-02-30" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/reports", {
        data: { message: "x".repeat(9000) },
      })
    ).status(),
  ).toBe(413);
  const codes = [];
  for (let i = 0; i < 16; i++)
    codes.push(
      (
        await request.post("/api/chat", {
          headers: { "x-forwarded-for": "203.0.113.240" },
          data: { message: "" },
        })
      ).status(),
    );
  expect(codes.at(-1)).toBe(429);
  expect(codes.slice(0, 15)).toEqual(Array(15).fill(400));
});

test("report regeneration keeps printing available and source scope includes contract type", async ({
  page,
}) => {
  await page.goto(
    "/reports?from=2026-10-24&to=2026-10-30&product=Urea%20(carbamide)&contractType=Forward",
  );
  await expect(page.getByLabel("Report contract type")).toHaveValue("Forward");
  await page
    .getByRole("button", { name: "Generate AI Report", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Print / Save PDF" }),
  ).toBeEnabled();
  const link = page
    .locator(".analytics-report")
    .getByRole("link", { name: "Inspect source" })
    .first();
  await expect(link).toHaveAttribute("href", /contractType=Forward/);
  await page
    .getByRole("button", { name: "Generate AI Report", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Print / Save PDF" }),
  ).toBeEnabled();
  await page.route("**/api/reports", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Provider temporarily unavailable" },
    }),
  );
  await page
    .getByRole("button", { name: "Generate AI Report", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Provider temporarily unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Print / Save PDF" }),
  ).toBeEnabled();
});

test("insight source links keep multi-commodity and contract filters", async ({
  page,
}) => {
  await page.goto("/analytics");
  await expect(page.locator(".workspace-stat-strip")).toBeVisible();
  await page.getByLabel("Urea (carbamide)", { exact: true }).check();
  await page.getByLabel("Portland cement", { exact: true }).check();
  await page
    .getByLabel("Contract type", { exact: true })
    .selectOption("Forward");
  await page.getByRole("tab", { name: "AI Insights", exact: true }).click();
  await page
    .locator(".fact-row")
    .first()
    .getByRole("link", { name: "Inspect supporting trades" })
    .click();
  await expect(page).toHaveURL(/product=/);
  await expect(page.locator("tbody tr").first()).toContainText("Forward");
  const names = await page
    .locator("tbody .commodity-button strong")
    .allTextContents();
  expect(
    names.every((v) => ["Urea (carbamide)", "Portland cement"].includes(v)),
  ).toBe(true);
});

test("Uzbek language follow-up, two available day comparison, safe Markdown and knowledge routing", async ({
  page,
}) => {
  await page.goto("/assistant");
  async function ask(text: string) {
    await page.getByLabel("Message to assistant").fill(text);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator(".thinking")).toHaveCount(0);
    await expect(page.locator(".message.assistant").last()).toBeVisible();
  }
  await ask("Покажи сделки по карбамиду за 2026-10-28.");
  await ask("Endi natijani o'zbek tilida tushuntir.");
  await expect(page.locator(".message.assistant").last()).toHaveAttribute(
    "lang",
    "uz",
  );
  await expect(page.locator(".message.assistant").last()).toContainText(
    "2026-10-28",
  );
  await ask("Сравни активность за два доступных торговых дня.");
  await expect(page.locator(".evidence-chart").last()).toBeVisible();
  await expect(page.locator(".message.assistant").last()).toContainText(
    "2026-10-24",
  );
  await ask("Что такое биржевая сделка?");
  await expect(page.locator(".message.assistant").last()).toContainText(
    "Application data dictionary",
  );
  await ask("![tracker](https://tracking.invalid/image)");
  await expect(page.locator(".message.user img")).toHaveCount(0);
});
