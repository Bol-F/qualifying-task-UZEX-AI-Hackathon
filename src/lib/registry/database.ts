import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { resolve } from "node:path";
import type { Filters, Trade } from "../validations/trades";
import { decimalOrder } from "./format";
import { AgentError } from "../ai/errors";
import { summarize, type Analytics } from "../analytics/calculations";
import { createRecordDecoder, type RecordCodec } from "./codec";

export function summarizeRegistry(db: DatabaseSync, f: Filters) {
  const { sql, parameters } = where(f);
  const decode = decoder(db);
  function* rows() {
    for (const row of db
      .prepare("SELECT record FROM trades" + sql)
      .iterate(...parameters))
      yield decode(row.record);
  }
  return summarize(rows());
}
function decoder(db: DatabaseSync) {
  const codec = db
    .prepare("SELECT value FROM metadata WHERE key = 'codec'")
    .get();
  return createRecordDecoder(
    codec ? (JSON.parse(String(codec.value)) as RecordCodec) : undefined,
  );
}

export function localDatabasePath() {
  return resolve(
    /* turbopackIgnore: true */ process.env.LOCAL_DATA_PATH ||
      "data/registry.sqlite",
  );
}
export const registrySchema = `
  CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE trades (
    id TEXT PRIMARY KEY, external_id TEXT NOT NULL UNIQUE,
    trade_date TEXT NOT NULL, product_name TEXT NOT NULL,
    normalized_product_name TEXT NOT NULL, contract_number TEXT NOT NULL,
    contract_type TEXT NOT NULL, execution_status TEXT NOT NULL,
    currency TEXT NOT NULL, unit TEXT NOT NULL, price_unit TEXT NOT NULL,
    price_order TEXT NOT NULL, quantity_order TEXT NOT NULL, record TEXT NOT NULL
  );
`;
export const registryIndexes = `
  CREATE INDEX trades_date ON trades(trade_date DESC, id);
  CREATE INDEX trades_product_date ON trades(product_name, trade_date DESC, id);
  CREATE INDEX trades_contract ON trades(contract_number);
  CREATE INDEX trades_price ON trades(price_order, id);
  CREATE INDEX trades_quantity ON trades(quantity_order, id);
`;
export function insertRegistryTrade(db: DatabaseSync) {
  const statement = db.prepare(
    "INSERT INTO trades VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  );
  return (t: Trade) =>
    statement.run(
      t.id,
      t.external_id!,
      t.trade_date,
      t.product_name,
      t.normalized_product_name,
      t.contract_number,
      t.contract_type,
      t.execution_status,
      t.currency!,
      t.unit,
      t.price_unit!,
      decimalOrder(t.price),
      decimalOrder(t.quantity),
      JSON.stringify(t),
    );
}
export type RegistryManifest = {
  version: 1;
  synthetic: true;
  importedAt: string;
  total: number;
  from: string | null;
  to: string | null;
  byYear: Record<string, number>;
  files: { name: string; kind: string; rows: number; sha256: string }[];
  references: {
    contracts: number;
    participants: number;
    brokers: number;
    rates: number;
  };
  missingYears: number[];
  missingBrokers: boolean;
};
function where(f: Filters) {
  const clauses: string[] = [],
    parameters: SQLInputValue[] = [];
  const add = (sql: string, ...values: SQLInputValue[]) => {
    clauses.push(sql);
    parameters.push(...values);
  };
  if (f.search) {
    // JS lowercasing supports Cyrillic, unlike SQLite's default lower().
    add(
      "(instr(normalized_product_name, ?) > 0 OR instr(contract_number, ?) > 0 OR instr(external_id, ?) > 0 OR instr(id, ?) > 0)",
      f.search.toLowerCase(),
      f.search,
      f.search,
      f.search,
    );
  }
  if (f.from) add("trade_date >= ?", f.from);
  if (f.to) add("trade_date <= ?", f.to);
  const equal = {
    currency: f.currency,
    id: f.id,
    product_name: f.productName,
    contract_type: f.contractType,
    contract_number: f.contractNumber,
    unit: f.unit,
    price_unit: f.priceUnit,
    execution_status: f.status,
  };
  for (const [column, value] of Object.entries(equal))
    if (value) add(`${column} = ?`, value);
  if (f.productNames?.length)
    add(
      `product_name IN (${f.productNames.map(() => "?").join(",")})`,
      ...f.productNames,
    );
  for (const [key, column, operator] of [
    ["minPrice", "price_order", ">="],
    ["maxPrice", "price_order", "<="],
    ["minQuantity", "quantity_order", ">="],
    ["maxQuantity", "quantity_order", "<="],
  ] as const)
    if (f[key] !== undefined)
      add(`${column} ${operator} ?`, decimalOrder(String(f[key])));
  return {
    sql: clauses.length ? " WHERE " + clauses.join(" AND ") : "",
    parameters,
  };
}
export class RegistryDatabase {
  readonly db: DatabaseSync;
  private decode: ReturnType<typeof createRecordDecoder>;
  private summaries = new Map<string, Analytics>();
  private catalogCache?: {
    products: string[];
    currencies: string[];
    units: string[];
    contractTypes: string[];
    dates: string[];
  };
  constructor(path = localDatabasePath()) {
    this.db = new DatabaseSync(path, { readOnly: true });
    this.decode = decoder(this.db);
    if (this.manifest().version !== 1)
      throw new Error("Unsupported local registry version");
  }
  manifest(): RegistryManifest {
    const row = this.db
      .prepare("SELECT value FROM metadata WHERE key = 'manifest'")
      .get();
    if (!row) throw new Error("Local registry has not been imported");
    return JSON.parse(String(row.value));
  }
  coverage() {
    const m = this.manifest();
    return {
      from: m.from,
      to: m.to,
      total: m.total,
      latestImport: m.importedAt,
      missingYears: m.missingYears,
      missingBrokers: m.missingBrokers,
    };
  }
  summary(f: Filters) {
    const { sql, parameters } = where(f),
      key = JSON.stringify([sql, parameters]);
    const cached = this.summaries.get(key);
    if (cached) return cached;
    const saved = !sql
      ? this.db
          .prepare("SELECT value FROM metadata WHERE key = 'summary'")
          .get()
      : undefined;
    const result: Analytics = saved
      ? JSON.parse(String(saved.value))
      : summarizeRegistry(this.db, f);
    if (this.summaries.size >= 12)
      this.summaries.delete(this.summaries.keys().next().value!);
    this.summaries.set(key, result);
    return result;
  }
  catalog() {
    if (this.catalogCache) return this.catalogCache;
    const distinct = (column: string) =>
      this.db
        .prepare(
          `SELECT DISTINCT ${column} AS value FROM trades ORDER BY ${column}`,
        )
        .all()
        .map((r) => String(r.value));
    return (this.catalogCache = {
      products: distinct("product_name"),
      currencies: distinct("currency"),
      units: distinct("unit"),
      contractTypes: distinct("contract_type"),
      dates: distinct("trade_date"),
    });
  }
  list(f: Filters, limit?: number) {
    const { sql, parameters } = where(f);
    const total = Number(
      this.db
        .prepare("SELECT count(*) AS n FROM trades" + sql)
        .get(...parameters)!.n,
    );
    if (limit !== undefined && total > limit)
      throw new AgentError("DATA_LIMIT", 422);
    const column =
      f.sort === "price"
        ? "price_order"
        : f.sort === "quantity"
          ? "quantity_order"
          : f.sort;
    const rows = this.db
      .prepare(
        `SELECT record FROM trades${sql} ORDER BY ${column} ${f.order === "asc" ? "ASC" : "DESC"}, id ASC LIMIT ? OFFSET ?`,
      )
      .all(
        ...parameters,
        limit ?? f.pageSize,
        limit === undefined ? (f.page - 1) * f.pageSize : 0,
      )
      .map((r) => this.decode(r.record));
    return { rows, total, mode: "local" as const };
  }
  dates(f: Filters, before?: string, limit = 90) {
    const { sql, parameters } = where(f);
    return this.db
      .prepare(
        `SELECT DISTINCT trade_date FROM trades${sql}${before ? (sql ? " AND" : " WHERE") + " trade_date < ?" : ""} ORDER BY trade_date DESC LIMIT ?`,
      )
      .all(...parameters, ...(before ? [before] : []), limit)
      .map((r) => String(r.trade_date));
  }
  close() {
    this.db.close();
  }
}
let instance: RegistryDatabase | undefined;
export function localRegistry() {
  return (instance ??= new RegistryDatabase());
}
