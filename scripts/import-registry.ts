import { createReadStream } from "node:fs";
import { mkdir, readdir, open, rename, rm } from "node:fs/promises";
import { basename, resolve, dirname } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { parse } from "csv-parse";
import { DatabaseSync } from "node:sqlite";
import {
  identifyRegistry,
  registryDate,
  registryDecimal,
  type CsvRow,
  type RegistryKind,
} from "../src/lib/registry/format";
import { convertRegistryDeal } from "../src/lib/registry/convert";
import {
  registrySchema,
  registryIndexes,
  insertRegistryTrade,
  localDatabasePath,
  summarizeRegistry,
  type RegistryManifest,
} from "../src/lib/registry/database";
import { filtersSchema } from "../src/lib/validations/trades";

async function* records(file: string) {
  const stream = createReadStream(file).pipe(
    parse({ columns: true, bom: true, skip_empty_lines: true, trim: true }),
  );
  for await (const row of stream) yield row as CsvRow;
}
async function main() {
  const directory = resolve(
    process.argv.find((v, i) => i > 1 && !v.startsWith("--")) || ".",
  );
  const dryRun = process.argv.includes("--dry-run");
  const files: {
    path: string;
    kind: RegistryKind;
    rows: number;
    sha256: string;
  }[] = [];
  for (const name of (await readdir(directory))
    .filter((n) => n.toLowerCase().endsWith(".csv"))
    .sort()) {
    const path = resolve(directory, name);
    const handle = await open(path, "r");
    const buffer = Buffer.alloc(8192);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    await handle.close();
    // Classify by columns, never trust the supplied filename. Ignore README text disguised as CSV.
    const first = buffer
      .subarray(0, bytesRead)
      .toString("utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)[0];
    const kind = identifyRegistry(first.split(","));
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    files.push({ path, kind, rows: 0, sha256: hash.digest("hex") });
  }
  const contracts = new Map<string, CsvRow>(),
    participants = new Map<string, CsvRow>(),
    brokers = new Map<string, CsvRow>(),
    rates = new Map<string, string>();
  for (const file of files.filter(
    (f) => !["deals", "unknown"].includes(f.kind),
  )) {
    for await (const row of records(file.path)) {
      file.rows++;
      const map =
        file.kind === "contracts"
          ? contracts
          : file.kind === "participants"
            ? participants
            : brokers;
      const key =
        file.kind === "contracts"
          ? row["Номер контракта"]
          : file.kind === "participants"
            ? row["ИНН"]
            : row["Код брокера"];
      if (file.kind === "rates") {
        const date = registryDate(row["Дата"]);
        if (rates.has(date)) throw new Error(`Duplicate FX date: ${date}`);
        const rate = registryDecimal(row["Курс"]);
        if (Number(rate) <= 0) throw new Error("USD rate must be positive");
        rates.set(date, rate);
      } else {
        if (!key || map.has(key))
          throw new Error(
            `Missing/duplicate reference key in ${basename(file.path)}`,
          );
        map.set(key, row);
      }
    }
  }
  if (
    !contracts.size ||
    !participants.size ||
    !rates.size ||
    !files.some((f) => f.kind === "deals")
  )
    throw new Error(
      "Need deals, contracts, participants and USD rates, identified by column headers",
    );
  const target = localDatabasePath();
  await mkdir(dirname(target), { recursive: true });
  const staging = target + "." + randomUUID() + ".tmp";
  const db = new DatabaseSync(staging);
  let closed = false;
  try {
    db.exec(
      "PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;" +
        registrySchema +
        "BEGIN;",
    );
    const insert = insertRegistryTrade(db);
    const manifest: RegistryManifest = {
      version: 1,
      synthetic: true,
      importedAt: new Date().toISOString(),
      total: 0,
      from: null,
      to: null,
      byYear: {},
      files: [],
      references: {
        contracts: contracts.size,
        participants: participants.size,
        brokers: brokers.size,
        rates: rates.size,
      },
      missingYears: [],
      missingBrokers: !brokers.size,
    };
    for (const file of files.filter((f) => f.kind === "deals")) {
      for await (const row of records(file.path)) {
        file.rows++;
        try {
          const contract = contracts.get(row["Номер контракта"]);
          const seller = participants.get(row["ИНН продавца"]),
            buyer = participants.get(row["ИНН покупателя"]);
          if (!contract || !seller || !buyer)
            throw new Error("Unresolved contract or participant");
          const sellerBroker = brokers.get(row["Брокер продавца"]),
            buyerBroker = brokers.get(row["Брокер покупателя"]);
          if (brokers.size && (!sellerBroker || !buyerBroker))
            throw new Error("Unresolved broker");
          const trade = convertRegistryDeal(row, {
            contract,
            seller,
            buyer,
            sellerBroker,
            buyerBroker,
            rate: rates.get(registryDate(row["Дата сделки"])),
            source: basename(file.path),
            importedAt: manifest.importedAt,
          });
          insert(trade);
          manifest.total++;
          const year = trade.trade_date.slice(0, 4);
          manifest.byYear[year] = (manifest.byYear[year] || 0) + 1;
          if (!manifest.from || trade.trade_date < manifest.from)
            manifest.from = trade.trade_date;
          if (!manifest.to || trade.trade_date > manifest.to)
            manifest.to = trade.trade_date;
        } catch (error) {
          throw new Error(
            `${basename(file.path)} row ${file.rows + 1}: ${error instanceof Error ? error.message : "Invalid record"}`,
          );
        }
      }
      console.log(`Validated ${basename(file.path)}: ${file.rows} trades`);
    }
    manifest.files = files.map((f) => ({
      name: basename(f.path),
      kind: f.kind,
      rows: f.rows,
      sha256: f.sha256,
    }));
    manifest.missingYears = [2022, 2023, 2024, 2025, 2026].filter(
      (y) => !manifest.byYear[String(y)],
    );
    db.prepare("INSERT INTO metadata VALUES ('manifest', ?)").run(
      JSON.stringify(manifest),
    );
    db.prepare("INSERT INTO metadata VALUES ('summary', ?)").run(
      JSON.stringify(summarizeRegistry(db, filtersSchema.parse({}))),
    );
    db.exec("COMMIT;" + registryIndexes + "ANALYZE;");
    db.close();
    closed = true;
    if (!dryRun) await rename(staging, target);
    console.log(
      JSON.stringify(
        {
          ...manifest,
          database: dryRun ? "DRY RUN: database unchanged" : target,
        },
        null,
        2,
      ),
    );
  } finally {
    if (!closed) db.close();
    await rm(staging, { force: true });
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Registry import failed",
  );
  process.exitCode = 1;
});
