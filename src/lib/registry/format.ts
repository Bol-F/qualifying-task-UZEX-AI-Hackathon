import { z } from "zod";
import { Financial } from "../analytics/accounting";

export type CsvRow = Record<string, string>;
export function registryDate(value: string) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) throw new Error(`Invalid registry date: ${value}`);
  return z.iso.date().parse(`${match[3]}-${match[2]}-${match[1]}`);
}
export function registryDecimal(value: string) {
  const text = value.replace(/[\s\u00a0\u202f]/g, "");
  if (!/^\d+(\.\d+)?$/.test(text))
    throw new Error(`Invalid registry decimal: ${value}`);
  return new Financial(text).toFixed();
}
export function identifyRegistry(columns: string[]) {
  if (columns.includes("Номер сделки") && columns.includes("Сумма сделки"))
    return "deals";
  if (columns.includes("Номер контракта") && columns.includes("Валюта"))
    return "contracts";
  if (columns.includes("ИНН") && columns.includes("Роль"))
    return "participants";
  if (columns.includes("Код брокера")) return "brokers";
  if (columns.includes("Дата") && columns.includes("Курс")) return "rates";
  return "unknown";
}
export type RegistryKind = ReturnType<typeof identifyRegistry>;
export function decimalOrder(value: string) {
  const [whole, fraction = ""] = new Financial(value).toFixed(18).split(".");
  if (whole.length > 30)
    throw new Error("Decimal exceeds local index precision");
  return whole.padStart(30, "0") + "." + fraction.padEnd(18, "0");
}
