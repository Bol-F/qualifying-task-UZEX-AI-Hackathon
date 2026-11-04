import { test, expect, request as api } from "@playwright/test";
test("bilingual follow-ups preserve data, chart evidence, regeneration and official knowledge", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/assistant");
  async function ask(question: string) {
    await page
      .getByRole("textbox", { name: "Message to assistant" })
      .fill(question);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(
      page.getByRole("button", { name: "Regenerate answer" }),
    ).toBeVisible();
    await expect(page.locator(".thinking")).toHaveCount(0);
  }
  await ask("Покажи сделки по карбамиду за 28 октября 2026.");
  await expect(page.locator(".message.assistant").last()).toContainText(
    "Результаты анализа",
  );
  await expect(page.locator(".message.assistant").last()).toContainText(
    "2026-10-28",
  );
  await ask("Энди энг катта бештасини кўрсат.");
  await expect(page.locator(".message.assistant").last()).toContainText(
    "Bitimlar natijalari",
  );
  await expect(page.locator(".message.assistant").last()).toContainText("urea");
  await expect(page.locator(".message.assistant").last()).toContainText(
    "2026-10-28",
  );
  await ask("Bitimlar sonini grafikda ko‘rsat.");
  const chart = page.locator(".evidence-chart").last();
  await expect(chart).toBeVisible();
  await expect(chart.locator(".recharts-surface")).toBeVisible();
  await chart.locator("summary").click();
  await expect(chart.locator("tbody")).toContainText("2026-10-28");
  await expect(chart.locator("tbody")).toContainText("3");
  const source = page.locator(".source-details").last();
  await source.locator("summary").click();
  await expect(source.locator("tbody tr")).toHaveCount(3);
  await expect(source).toContainText("Calculation:");
  await page.screenshot({
    path: ".qa/phase2-evidence-desktop.png",
    fullPage: true,
  });
  const count = await page.locator(".message.assistant").count();
  await page.getByRole("button", { name: "Regenerate answer" }).click();
  await expect(page.locator(".thinking")).toHaveCount(0);
  await expect(page.locator(".message.assistant")).toHaveCount(count);
  await expect(page.locator(".evidence-chart").last()).toBeVisible();
  await page.reload();
  await page.locator(".history-items button").first().click();
  await expect(page.locator(".evidence-chart").last()).toBeVisible();
  await ask("Покажи золото за 4 ноября 2026.");
  await expect(page.locator(".message.assistant").last()).toContainText(
    "не найдено",
  );
  await expect(page.locator(".message.assistant").last()).toContainText(
    "2026-11-04",
  );
  await ask("Что такое биржа?");
  await expect(page.locator(".knowledge-sources a").first()).toHaveAttribute(
    "href",
    /uzex\.uz/,
  );
  await expect(page.locator(".message.assistant").last()).toContainText(
    /Gemini (?:not configured|not active)/,
  );
  expect(errors).toEqual([]);
  await page
    .getByRole("button", { name: "Clear conversation", exact: true })
    .click();
  await expect(page.locator(".chat-welcome")).toBeVisible();
});
test("streamed activity and server session isolation", async ({ request }) => {
  const first = await request.post("/api/chat", {
    headers: { Accept: "application/x-ndjson" },
    data: { message: "Karbamid bo‘yicha bitimlarni ko‘rsat." },
  });
  expect(first.ok()).toBe(true);
  const events = (await first.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(
    events.some((e) => e.type === "activity" && e.stage === "tool-start"),
  ).toBe(true);
  const answer = events.find((e) => e.type === "answer").answer;
  expect(answer.evidence[0].matchedRecords).toBe(24);
  const isolated = await api.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
  });
  try {
    const other = await isolated.post("/api/chat", {
      data: { conversationId: answer.conversationId, message: "Обзор рынка" },
    });
    expect((await other.json()).evidence[0].matchedRecords).toBe(184);
  } finally {
    await isolated.dispose();
  }
  const bad = await request.post("/api/chat", {
    data: { message: "x".repeat(51000) },
  });
  expect(bad.status()).toBe(413);
  const invalid = await request.post("/api/chat", {
    data: { message: "x", conversationId: "not-a-uuid" },
  });
  expect(invalid.status()).toBe(400);
});
test("mobile evidence charts remain readable without document overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/assistant");
  await page
    .getByRole("textbox", { name: "Message to assistant" })
    .fill("Oxirgi 7ta savdo kunini ustunli grafikda ko‘rsat.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".evidence-chart")).toBeVisible();
  await expect(page.locator(".evidence-chart .recharts-bar")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".evidence-chart").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: ".qa/phase2-evidence-mobile.png",
    fullPage: true,
  });
});
