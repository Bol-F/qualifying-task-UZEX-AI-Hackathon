import { DatabaseSync } from "node:sqlite";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import {
  RegistryDatabase,
  localDatabasePath,
} from "../src/lib/registry/database";
import { createRecordEncoder } from "../src/lib/registry/codec";
import type { Trade } from "../src/lib/validations/trades";

async function main() {
  const source = new RegistryDatabase(localDatabasePath());
  const target = resolve("data/registry.vercel.sqlite"),
    staging = target + ".tmp";
  await mkdir(dirname(target), { recursive: true });
  await rm(staging, { force: true });
  const db = new DatabaseSync(staging),
    encoder = createRecordEncoder();
  const fields = [
    "id",
    "external_id",
    "trade_date",
    "price_order",
    "quantity_order",
  ];
  const contractFields = [
    "contract_number",
    "contract_type",
    "currency",
    "unit",
    "price_unit",
  ];
  let closed = false;
  try {
    db.exec(`PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;
      CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE products(product_id INTEGER PRIMARY KEY,product_name TEXT NOT NULL,normalized_product_name TEXT NOT NULL);
      CREATE TABLE contracts(contract_id INTEGER PRIMARY KEY,${contractFields.map((f) => `${f} TEXT NOT NULL`).join(",")});
      CREATE TABLE statuses(status_id INTEGER PRIMARY KEY,execution_status TEXT NOT NULL);
      CREATE TABLE packed_trades(${fields.map((f) => `${f} TEXT NOT NULL${f === "id" ? " PRIMARY KEY" : ""}`).join(",")},product_id INTEGER NOT NULL,contract_id INTEGER NOT NULL,status_id INTEGER NOT NULL,record BLOB NOT NULL);
      CREATE VIEW trades AS SELECT t.*,p.product_name,p.normalized_product_name,${contractFields.map((f) => `c.${f}`).join(",")},s.execution_status FROM packed_trades t JOIN products p USING(product_id) JOIN contracts c USING(contract_id) JOIN statuses s USING(status_id);
      BEGIN;`);
    const products = new Map<string, number>();
    const contracts = new Map<string, number>(),
      statuses = new Map<string, number>();
    const addProduct = db.prepare("INSERT INTO products VALUES(?,?,?)");
    const addContract = db.prepare("INSERT INTO contracts VALUES(?,?,?,?,?,?)"),
      addStatus = db.prepare("INSERT INTO statuses VALUES(?,?)");
    const insert = db.prepare(
      `INSERT INTO packed_trades VALUES(${Array.from({ length: fields.length + 4 }, () => "?").join(",")})`,
    );
    let count = 0;
    for (const row of source.db
      .prepare("SELECT * FROM trades ORDER BY id")
      .iterate()) {
      const trade = JSON.parse(String(row.record)) as Trade;
      const identity = JSON.stringify([
        row.product_name,
        row.normalized_product_name,
      ]);
      let product = products.get(identity);
      if (product === undefined) {
        product = products.size + 1;
        products.set(identity, product);
        addProduct.run(
          product,
          String(row.product_name),
          String(row.normalized_product_name),
        );
      }
      const contractIdentity = JSON.stringify(
        contractFields.map((f) => row[f]),
      );
      let contract = contracts.get(contractIdentity);
      if (contract === undefined) {
        contract = contracts.size + 1;
        contracts.set(contractIdentity, contract);
        addContract.run(contract, ...contractFields.map((f) => row[f]));
      }
      const statusName = String(row.execution_status);
      let status = statuses.get(statusName);
      if (status === undefined) {
        status = statuses.size + 1;
        statuses.set(statusName, status);
        addStatus.run(status, statusName);
      }
      insert.run(
        ...fields.map((f) => row[f]),
        product,
        contract,
        status,
        encoder.encode(trade),
      );
      count++;
      if (count % 100000 === 0) console.log(`Packed ${count} records`);
    }
    for (const row of source.db.prepare("SELECT * FROM metadata").all())
      db.prepare("INSERT INTO metadata VALUES(?,?)").run(row.key, row.value);
    db.prepare("INSERT INTO metadata VALUES('codec',?)").run(
      JSON.stringify(encoder.codec),
    );
    db.exec(`COMMIT;
      CREATE INDEX packed_date ON packed_trades(trade_date DESC,id);
      CREATE INDEX packed_product_date ON packed_trades(product_id,trade_date DESC,id);
      CREATE INDEX packed_contract ON packed_trades(contract_id);
      CREATE INDEX contracts_number ON contracts(contract_number);
      -- Optional global price/quantity sorts retain exact string keys but scan the snapshot.
      -- Omitting these two bulky secondary indexes keeps the complete bundle within platform limits.
      ANALYZE;`);
    if (db.prepare("PRAGMA quick_check").get()!.quick_check !== "ok")
      throw new Error("Packed snapshot integrity check failed");
    db.close();
    source.close();
    closed = true;
    await rename(staging, target);
    const bytes = (await stat(target)).size;
    if (bytes > 210 * 1024 * 1024)
      throw new Error(
        `Packed registry is still too large for the standard Function budget: ${bytes}`,
      );
    const snapshot = resolve("data/registry.snapshot.gz");
    await pipeline(
      createReadStream(target),
      createGzip({ level: 9 }),
      createWriteStream(snapshot + ".tmp"),
    );
    await rename(snapshot + ".tmp", snapshot);
    const digest = createHash("sha256");
    for await (const chunk of createReadStream(target)) digest.update(chunk);
    await import("node:fs/promises").then((fs) =>
      fs.writeFile(
        "data/registry.snapshot.json",
        JSON.stringify(
          { version: 1, bytes, sha256: digest.digest("hex"), count },
          null,
          2,
        ) + "\n",
      ),
    );
    console.log(
      JSON.stringify({
        count,
        packedBytes: bytes,
        uploadBytes: (await stat(snapshot)).size,
      }),
    );
  } finally {
    if (!closed) {
      db.close();
      source.close();
    }
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Packing failed");
  process.exitCode = 1;
});
