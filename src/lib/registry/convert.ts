import { tradeSchema } from "../validations/trades";
import { normalizeProduct } from "../utils/product";
import { Financial } from "../analytics/accounting";
import { registryDate, registryDecimal, type CsvRow } from "./format";

export function convertRegistryDeal(
  row: CsvRow,
  references: {
    contract: CsvRow;
    seller?: CsvRow;
    buyer?: CsvRow;
    sellerBroker?: CsvRow;
    buyerBroker?: CsvRow;
    rate?: string;
    source: string;
    importedAt: string;
  },
) {
  const { contract, rate } = references;
  if (contract["Номер контракта"] !== row["Номер контракта"])
    throw new Error("Missing or mismatched contract reference");
  const currencies: Record<string, string> = {
    "Узбекский сум": "UZS",
    "Доллар США": "USD",
  };
  const currency = currencies[contract["Валюта"]];
  if (!currency) throw new Error("Unknown contract currency");
  const lot = registryDecimal(row["Лот"]);
  const lots = registryDecimal(row["Количество"]);
  const quantity = new Financial(lot).times(lots);
  if (quantity.lte(0))
    throw new Error("Registry trade quantity must be positive");
  if (
    new Financial(lot).cmp(registryDecimal(contract["Лот"])) !== 0 ||
    row["Единица измерения"] !== contract["Единица измерения"]
  )
    throw new Error("Contract lot or unit does not match the trade");
  if (currency === "USD" && !rate)
    throw new Error("Missing trade-date USD rate");
  const amount = registryDecimal(row["Сумма сделки"]);
  const date = registryDate(row["Дата сделки"]);
  const delivered = row["Поставлено"]
    ? registryDecimal(row["Поставлено"])
    : undefined;
  if (delivered !== undefined && new Financial(delivered).gt(lots))
    throw new Error("Delivered lots exceed traded lots");
  return tradeSchema.parse({
    id: `registry-${row["Номер сделки"]}`,
    external_id: row["Номер сделки"],
    contract_number: row["Номер контракта"],
    trade_date: date,
    trade_time: row["Время сделки"],
    product_name: row["Наименование товара"],
    normalized_product_name: normalizeProduct(row["Наименование товара"]),
    price: new Financial(amount).div(quantity).toFixed(6),
    quantity: quantity.toFixed(),
    unit: row["Единица измерения"],
    price_unit: row["Единица измерения"],
    currency,
    contract_type: row["Тип контракта"],
    contract_form: row["Форма контракта"],
    execution_status: row["Состояние сделки"],
    total_amount: amount,
    amount_uzs:
      currency === "USD"
        ? new Financial(amount).times(rate!).toFixed()
        : amount,
    usd_rate: currency === "USD" ? rate : undefined,
    lot_size: lot,
    lot_count: lots,
    delivered_lots: delivered,
    delivered_quantity:
      delivered === undefined
        ? undefined
        : new Financial(delivered).times(lot).toFixed(),
    starting_price: registryDecimal(row["Стартовая цена"]),
    region: row["Регион"],
    auction_type: row["Тип торгов"],
    seller_inn: row["ИНН продавца"],
    buyer_inn: row["ИНН покупателя"],
    seller_name: references.seller?.["Наименование"],
    buyer_name: references.buyer?.["Наименование"],
    seller_broker: row["Брокер продавца"],
    buyer_broker: row["Брокер покупателя"],
    seller_broker_name: references.sellerBroker?.["Наименование"],
    buyer_broker_name: references.buyerBroker?.["Наименование"],
    payment_date: row["Дата оплаты"]
      ? registryDate(row["Дата оплаты"])
      : undefined,
    delivery_date: row["Дата поставки"]
      ? registryDate(row["Дата поставки"])
      : undefined,
    payment_days: Number(contract["Срок оплаты"]),
    delivery_days: Number(contract["Срок поставки"]),
    data_source: `Synthetic hackathon registry · ${references.source}`,
    imported_at: references.importedAt,
  });
}
