import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": "192.0.2." + (1 + Math.floor(Math.random() * 220)),
  });
});

test("light is the default; theme and navbar language persist through reload and navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/dashboard");
  await expect(page).toHaveTitle(/UZEX Insight AI/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".kpi").first()).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await page.getByTestId("theme-toggle").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(page.locator(".kpi").first()).toHaveCSS(
    "background-color",
    "rgb(17, 28, 46)",
  );
  await page.getByTestId("language-select").selectOption("ru");
  await expect(
    page.getByRole("heading", { name: "Обзор рынка" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const serverHtml = await (
    await page.context().request.get("/dashboard")
  ).text();
  expect(serverHtml.slice(0, 200)).toMatch(
    /<html[^>]*lang="ru"[^>]*data-theme="dark"[^>]*class="dark"/,
  );
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Сделки", exact: true })
    .click();
  await expect(page).toHaveURL(/\/trades$/);
  await expect(
    page.getByRole("heading", { name: "Сделки", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("language-select")).toHaveValue("ru");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByTestId("theme-toggle").click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});

test("language changes update every workspace and preserve active filters and chart choices", async ({
  page,
}) => {
  await page.goto("/trades");
  await page.getByLabel("Search trades").fill("urea");
  await expect(page.locator("tbody tr").first()).toContainText(
    "Urea (carbamide)",
  );
  const before = await page.locator("tbody tr").allTextContents();
  await page.getByTestId("language-select").selectOption("uz");
  await expect(
    page.getByRole("heading", { name: "Bitimlar", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".search-field input")).toHaveValue("urea");
  // Original products, contract numbers and financial values remain source-authored.
  const after = await page.locator("tbody tr").allTextContents();
  expect(after).toEqual(before);
  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: "Savdo tahlili", exact: true }),
  ).toBeVisible();
  await page
    .locator(".workspace-filters select")
    .first()
    .selectOption("quantity");
  await expect(page.locator(".workspace-filters select").first()).toHaveValue(
    "quantity",
  );
  await page.getByTestId("language-select").selectOption("ru");
  await expect(
    page.getByRole("tab", { name: "Анализ торгов", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".workspace-filters select").first()).toHaveValue(
    "quantity",
  );
  await page.goto("/reports");
  await expect(
    page.getByRole("heading", { name: "Отчёты", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".report-options")).not.toHaveAttribute("open");
  await page.locator(".report-options summary").click();
  await expect(page.locator(".report-options")).toHaveAttribute("open", "");
});

test("navbar language controls assistant UI while follow-up questions keep conversation data", async ({
  page,
}) => {
  const messages: { language?: string; message: string }[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/chat") && request.method() === "POST")
      messages.push(request.postDataJSON());
  });
  await page.goto("/assistant");
  await page.getByTestId("language-select").selectOption("ru");
  await expect(
    page.getByRole("heading", { name: "ИИ-помощник", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".suggestion-category").first()).toHaveText(
    "ТОРГОВАЯ АКТИВНОСТЬ",
  );
  await page
    .locator(".composer textarea")
    .fill("Покажи сделки по карбамиду за 2026-10-28.");
  await page.locator('.composer button[type="submit"]').click();
  await expect(page.locator(".message.assistant")).toHaveCount(1);
  await expect(page.locator(".thinking")).toHaveCount(0);
  await expect(page.locator(".message.assistant").last()).toContainText(
    "2026-10-28",
  );
  await page.getByTestId("language-select").selectOption("uz");
  await expect(
    page.getByRole("heading", { name: "AI yordamchi", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".message.assistant")).toHaveCount(1);
  await page
    .locator(".composer textarea")
    .fill("Endi eng katta 5 tasini ko'rsat.");
  await page.locator('.composer button[type="submit"]').click();
  await expect(page.locator(".message.assistant")).toHaveCount(2);
  await expect(page.locator(".thinking")).toHaveCount(0);
  await expect(page.locator(".message.assistant").last()).toHaveAttribute(
    "lang",
    "uz",
  );
  await expect(page.locator(".message.assistant").last()).toContainText(
    "2026-10-28",
  );
  expect(messages.map((message) => message.language)).toEqual(["ru", "uz"]);
  await page.reload();
  await expect(page.locator(".message.assistant")).toHaveCount(2);
  await expect(page.getByTestId("language-select")).toHaveValue("uz");
});

test("both themes fit desktop, laptop, tablet and mobile; mobile navigation has visible labels", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page.getByText("184", { exact: true })).toBeVisible();
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page.getByTestId("theme-toggle").click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.getByTestId("language-select")).toBeVisible();
      await expect(page.getByLabel("Dashboard date range")).toBeVisible();
      if (width <= 768) {
        await expect(
          page.locator(".nav-mobile-label", { hasText: "Home" }),
        ).toBeVisible();
        await expect(
          page.locator(".nav-mobile-label", { hasText: "Ask AI" }),
        ).toBeVisible();
      }
      if (width === 390) {
        const dateControl = await page
          .getByLabel("Dashboard date range")
          .boundingBox();
        expect(dateControl!.width).toBeGreaterThan(250);
      }
    }
  }
  await page.getByTestId("language-select").selectOption("uz");
  await expect(page.locator(".dataset-coverage")).toContainText("30-okt 2026");
  for (const [name, route] of [
    ["AI yordamchi", "assistant"],
    ["Bitimlar", "trades"],
    ["Tahlil", "analytics"],
    ["Hisobotlar", "reports"],
  ]) {
    await page
      .locator(".sidebar")
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp("/" + route + "$"));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
