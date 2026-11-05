import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { convertRegistryDeal } from "../src/lib/registry/convert";
import {
  identifyRegistry,
  registryDate,
  registryDecimal,
  type CsvRow,
} from "../src/lib/registry/format";
import {
  RegistryDatabase,
  registrySchema,
  registryIndexes,
  insertRegistryTrade,
  type RegistryManifest,
} from "../src/lib/registry/database";
import { filtersSchema } from "../src/lib/validations/trades";
import { filterDemo } from "../src/lib/db/filters";
import { summarize } from "../src/lib/analytics/calculations";
import { measure } from "../src/lib/analytics/workspace";
import { executeTool, type TradeStore } from "../src/lib/ai/tool-runner";
import { demoTrades } from "../src/lib/db/demo";

const contract: CsvRow = {
  "Номер контракта": "C1",
  "Наименование продукта": "Карбамид",
  Лот: "100",
  Валюта: "Доллар США",
  "Единица измерения": "килограмм",
  "Срок оплаты": "5",
  "Срок поставки": "10",
};
const deal: CsvRow = {
  "Номер сделки": "42",
  "Номер контракта": "C1",
  "Дата сделки": "30.10.2026",
  "Время сделки": "10:15:00",
  "Наименование товара": "КАРБАМИД Марка Б",
  Количество: "3",
  Лот: "100",
  "Единица измерения": "килограмм",
  "Сумма сделки": "1 000.01",
  "Стартовая цена": "3.10",
  "Состояние сделки": "Исполнен(Частично)",
  "Тип контракта": "Экспортный",
  "Форма контракта": "Спот",
  "Тип торгов": "Английский аукцион",
  Регион: "Toshkent",
  "ИНН продавца": "123456789",
  "ИНН покупателя": "987654321",
  "Брокер продавца": "BK001",
  "Брокер покупателя": "BK002",
  "Дата оплаты": "31.10.2026",
  "Дата поставки": "",
  Поставлено: "2",
};
const references = {
  contract,
  rate: "12 000.25".replaceAll(" ", ""),
  seller: { Наименование: '"Seller, Ltd"', ИНН: "123456789", Роль: "Продавец" },
  buyer: { Наименование: "Buyer", ИНН: "987654321", Роль: "Покупатель" },
  source: "mislabeled.csv",
  importedAt: "2026-11-05T00:00:00Z",
};

test("registry classifies files by columns and validates Russian date and decimal formats", () => {
  assert.equal(identifyRegistry(Object.keys(contract)), "contracts");
  assert.equal(identifyRegistry(Object.keys(deal)), "deals");
  assert.equal(identifyRegistry(["ИНН", "Роль"]), "participants");
  assert.equal(identifyRegistry(["Дата", "Курс"]), "rates");
  assert.equal(identifyRegistry(["Код брокера", "Наименование"]), "brokers");
  assert.equal(identifyRegistry(["# README"]), "unknown");
  assert.equal(registryDate("03.01.2022"), "2022-01-03");
  assert.throws(() => registryDate("30.02.2026"));
  assert.throws(() => registryDate("2026-10-30"));
  assert.equal(registryDecimal("1\u00a0234\u202f567.89"), "1234567.89");
  for (const v of ["", "-1", "NaN", "1e3", "1,2"])
    assert.throws(() => registryDecimal(v));
});

test("registry derives quantity from lots, joins references and retains exact amounts despite recurring unit prices", () => {
  const t = convertRegistryDeal(deal, references);
  assert.equal(t.quantity, "300");
  assert.equal(t.price, "3.333367");
  assert.equal(t.total_amount, "1000.01");
  assert.equal(t.amount_uzs, "12000370.0025");
  assert.equal(t.delivered_quantity, "200");
  assert.equal(t.seller_name, '"Seller, Ltd"');
  assert.equal(t.seller_broker, "BK001");
  assert.equal(t.seller_broker_name, undefined);
  assert.equal(summarize([t]).values.USD, "1000.01");
  assert.equal(
    measure([t], { metric: "value", currency: "USD" }).value,
    "1000.01",
  );
  assert.match(t.normalized_product_name, /urea/);
  assert.throws(() =>
    convertRegistryDeal(deal, { ...references, rate: undefined }),
  );
  assert.throws(() => convertRegistryDeal({ ...deal, Лот: "2" }, references));
  assert.throws(() =>
    convertRegistryDeal({ ...deal, Поставлено: "4" }, references),
  );
  assert.throws(() =>
    convertRegistryDeal(deal, {
      ...references,
      contract: { ...contract, Валюта: "Unknown" },
    }),
  );
});

test("cancelled deals stay inspectable but do not inflate traded quantity, value or currency conversion", () => {
  const paid = convertRegistryDeal(deal, references);
  const cancelled = convertRegistryDeal(
    {
      ...deal,
      "Номер сделки": "43",
      "Состояние сделки": "Аннулирован(Не оплачен)",
      Поставлено: "",
      "Дата оплаты": "",
    },
    references,
  );
  assert.equal(cancelled.delivered_quantity, undefined);
  const stats = summarize([paid, cancelled]);
  assert.equal(stats.count, 2);
  assert.equal(stats.cancelled, 1);
  assert.equal(stats.values.USD, "1000.01");
  assert.equal(stats.quantities["килограмм"], "300");
  assert.equal(stats.convertedValueUZS, "12000370.0025");
  assert.equal(
    measure([paid, cancelled], { metric: "quantity", unit: "килограмм" }).value,
    "300",
  );
});

test("indexed local queries match existing filter semantics, exact decimal order and bounded reads", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uzex-registry-test-")),
    path = join(directory, "registry.sqlite");
  const db = new DatabaseSync(path);
  db.exec(registrySchema);
  const insert = insertRegistryTrade(db);
  const rows = [
    {
      ...demoTrades[0],
      id: "a",
      external_id: "1",
      price: "999999999999999998.999999",
    },
    {
      ...demoTrades[0],
      id: "b",
      external_id: "2",
      price: "999999999999999999.000001",
    },
    {
      ...demoTrades[1],
      id: "c",
      external_id: "3",
      product_name: "КАРБАМИД",
      normalized_product_name: "карбамид urea",
    },
  ];
  rows.forEach(insert);
  const manifest: RegistryManifest = {
    version: 1,
    synthetic: true,
    total: 3,
    from: "2026-10-01",
    to: "2026-10-30",
    importedAt: references.importedAt,
    byYear: { "2026": 3 },
    files: [],
    missingYears: [2024],
    missingBrokers: true,
    references: { contracts: 1, participants: 2, brokers: 0, rates: 1 },
  };
  db.prepare("INSERT INTO metadata VALUES ('manifest', ?)").run(
    JSON.stringify(manifest),
  );
  db.exec(registryIndexes);
  db.close();
  const source = new RegistryDatabase(path);
  try {
    for (const input of [
      { sort: "price", order: "desc" },
      { search: "КАРБАМИД" },
      { search: 'urea%),id.neq.0,"' },
      { id: "b" },
      {
        currency: "UZS",
        priceUnit: rows[0].unit,
        minPrice: "999999999999999999.000000",
      },
      { productNames: [rows[0].product_name], from: rows[0].trade_date },
    ]) {
      const f = filtersSchema.parse(input);
      assert.deepEqual(
        source.list(f).rows.map((t) => t.id),
        filterDemo(rows, f).map((t) => t.id),
      );
    }
    assert.equal(
      source.list(filtersSchema.parse({ pageSize: 1, page: 2 })).rows.length,
      1,
    );
    assert.throws(() => source.list(filtersSchema.parse({}), 2), /DATA_LIMIT/);
    assert.deepEqual(source.summary(filtersSchema.parse({})), summarize(rows));
    assert.deepEqual(
      source.dates(filtersSchema.parse({ from: "2027-01-01" })),
      [],
    );
    assert.equal(source.coverage().missingBrokers, true);
  } finally {
    source.close();
    await rm(directory, { recursive: true, force: true });
  }
});

function csv(rows: CsvRow[]) {
  const columns = Object.keys(rows[0]);
  const quote = (v: string) => '"' + v.replaceAll('"', '""') + '"';
  return (
    columns.join(",") +
    "\n" +
    rows.map((r) => columns.map((k) => quote(r[k] ?? "")).join(",")).join("\n")
  );
}
test("full import detects mislabeled files; dry runs and rejected duplicates preserve the previous database", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uzex-registry-import-"));
  const target = join(directory, "existing.sqlite");
  try {
    await writeFile(target, "previous database");
    await writeFile(join(directory, "brokers.csv"), csv([contract]));
    await writeFile(join(directory, "participants.csv"), csv([deal]));
    await writeFile(
      join(directory, "rates.csv"),
      csv([{ Дата: "30.10.2026", Курс: "12000.25" }]),
    );
    await writeFile(
      join(directory, "deals_2025.csv"),
      csv([references.seller, references.buyer]),
    );
    const run = (dry = false) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/import-registry.ts",
          directory,
          ...(dry ? ["--dry-run"] : []),
        ],
        {
          cwd: process.cwd(),
          env: { ...process.env, LOCAL_DATA_PATH: target },
          encoding: "utf8",
          timeout: 30000,
        },
      );
    const dry = run(true);
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(await readFile(target, "utf8"), "previous database");
    const imported = run();
    assert.equal(imported.status, 0, imported.stderr);
    const before = await readFile(target);
    await writeFile(join(directory, "participants.csv"), csv([deal, deal]));
    const duplicate = run();
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /UNIQUE constraint/);
    assert.deepEqual(await readFile(target), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("local agent defaults have explicit scope and previous-day discovery uses indexed dates instead of reading the whole registry", async () => {
  const readFilters: unknown[] = [];
  const store: TradeStore = {
    mode: "local",
    coverage: async () => ({
      from: "2022-01-03",
      to: "2026-10-30",
      total: 393353,
      latestImport: references.importedAt,
      missingYears: [2024],
      missingBrokers: true,
    }),
    read: async (f) => {
      readFilters.push(f);
      return [];
    },
    dates: async (_f, before) =>
      before ? ["2026-10-28"] : ["2026-10-30", "2026-10-28"],
  };
  const context = { filters: {}, referencedIds: [] };
  const latest = await executeTool(
    "get_market_overview",
    {},
    context,
    store,
    "ru",
    AbortSignal.timeout(5000),
  );
  assert.equal(latest.evidence.filters.from, "2026-10-01");
  assert.match(latest.evidence.warnings.join(" "), /2024/);
  readFilters.length = 0;
  await executeTool(
    "compare_trading_periods",
    { metric: "count", lastTwoAvailableDays: true },
    context,
    store,
    "ru",
    AbortSignal.timeout(5000),
  );
  assert.equal(readFilters.length, 2);
  assert.ok(readFilters.every((f) => !!(f as { from?: string }).from));
  const trends = await executeTool(
    "get_transaction_trends",
    { metric: "count", lastTradingDays: 90 },
    context,
    store,
    "ru",
    AbortSignal.timeout(5000),
  );
  assert.equal(trends.evidence.filters.from, "2026-10-28");
});
