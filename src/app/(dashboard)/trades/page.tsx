"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
import { useEffect, useState, useRef } from "react";
import {
  Search,
  Download,
  SlidersHorizontal,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useResource } from "@/hooks/use-resource";
import { TradeTable } from "@/components/trades/trade-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading, ErrorState } from "@/components/layout/resource-state";
import { DataNotice } from "@/components/layout/data-notice";
import type { Trade } from "@/types";
export default function Trades() {
  const { t: tr } = usePreferences();
  const [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [currency, setCurrency] = useState(""),
    [priceUnit, setPriceUnit] = useState(""),
    [exactId, setExactId] = useState(""),
    [sourceProducts, setSourceProducts] = useState<string[]>([]),
    [exporting, setExporting] = useState(false),
    [sort, setSort] = useState("trade_date"),
    [order, setOrder] = useState("desc"),
    [page, setPage] = useState(1),
    [advanced, setAdvanced] = useState(false),
    [exactProduct, setExactProduct] = useState(""),
    [unit, setUnit] = useState(""),
    [contractType, setContractType] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("search");
    if (value) setSearch(value);
    const p = new URLSearchParams(window.location.search);
    if (p.has("product")) setSourceProducts(p.getAll("product").slice(0, 3));
    if (p.get("from")) setFrom(p.get("from")!);
    if (p.get("to")) setTo(p.get("to")!);
    if (p.get("productName")) {
      setExactProduct(p.get("productName")!);
      setSearch(p.get("productName")!);
    }
    if (p.get("currency")) setCurrency(p.get("currency")!);
    if (p.get("unit")) setUnit(p.get("unit")!);
    if (p.get("contractType")) setContractType(p.get("contractType")!);
    if (p.get("priceUnit")) setPriceUnit(p.get("priceUnit")!);
    if (p.get("id")) {
      setExactId(p.get("id")!);
      setSearch(p.get("id")!);
    }
    function shortcut(event: KeyboardEvent) {
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !(
          event.target instanceof HTMLElement &&
          (event.target.matches("input,textarea,select") ||
            event.target.isContentEditable)
        )
      ) {
        event.preventDefault();
        searchInput.current?.focus();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({
    search: exactProduct || exactId ? "" : debounced,
    ...(exactId ? { id: exactId } : {}),
    ...(exactProduct ? { productName: exactProduct } : {}),
    ...(unit ? { unit } : {}),
    ...(contractType ? { contractType } : {}),
    ...(currency ? { currency } : {}),
    ...(priceUnit ? { priceUnit } : {}),
    page: String(page),
    pageSize: "12",
    sort,
    order,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(min ? { minPrice: min, currency } : {}),
    ...(max ? { maxPrice: max, currency } : {}),
  });
  sourceProducts.forEach((product) => params.append("product", product));
  const { data, error, loading, retry } = useResource<{
    rows: Trade[];
    total: number;
    mode: string;
  }>("/api/trades?" + params);
  function clear() {
    setSearch("");
    setExactProduct("");
    setExactId("");
    setSourceProducts([]);
    setCurrency("");
    setPriceUnit("");
    setUnit("");
    setContractType("");
    setFrom("");
    setTo("");
    setMin("");
    setMax("");
    setSort("trade_date");
    setOrder("desc");
    setPage(1);
  }
  async function download() {
    setExporting(true);
    try {
      const response = await fetch("/api/trades?" + params + "&export=csv");
      if (!response.ok) throw new Error("Export failed");
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "uzex-trades.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Filtered transactions exported");
    } catch {
      toast.error("Unable to export. Check your filters and try again.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{tr("Transactions")}</h1>
          <p>{tr("Find a transaction by product, contract or source ID.")}</p>
        </div>
        <Button
          variant="outline"
          onClick={download}
          disabled={
            loading ||
            !!error ||
            exporting ||
            (!exactProduct && !exactId && search !== debounced)
          }
        >
          <Download />
          {exporting ? tr("Exporting…") : tr("Export CSV")}
        </Button>
      </div>
      <DataNotice mode={data?.mode ?? "unknown"} />
      {sourceProducts.length > 0 && (
        <p className="dataset-coverage">
          {tr(" Selected commodities: ")}
          {sourceProducts.join(" · ")}
          {tr(". Clear filters to explore all records. ")}
        </p>
      )}
      <section className="panel explorer">
        <div className="explorer-toolbar">
          <div className="search-field">
            <Search size={17} />
            <Input
              aria-label={tr("Search trades")}
              ref={searchInput}
              placeholder={tr(
                "Search commodity, transaction or contract\u2026",
              )}
              value={search}
              onChange={(e) => {
                setExactProduct("");
                setExactId("");
                setSourceProducts([]);
                setSearch(e.target.value);
              }}
            />
            <kbd>/</kbd>
          </div>
          <Button
            variant="outline"
            onClick={() => setAdvanced(!advanced)}
            aria-expanded={advanced}
          >
            <SlidersHorizontal />
            {tr(" Filters ")}
          </Button>
          <select
            aria-label={tr("Sort by")}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="trade_date">{tr("Trade date")}</option>
            <option value="price">{tr("Unit price")}</option>
            <option value="quantity">{tr("Quantity")}</option>
            <option value="product_name">{tr("Commodity")}</option>
          </select>
          <select
            aria-label={tr("Sort order")}
            value={order}
            onChange={(e) => {
              setOrder(e.target.value);
              setPage(1);
            }}
          >
            <option value="desc">{tr("Descending")}</option>
            <option value="asc">{tr("Ascending")}</option>
          </select>
        </div>
        {advanced && (
          <div className="filter-row">
            <label>
              {tr(" From date ")}
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              {tr(" To date ")}
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              {tr(" Currency ")}
              <select
                aria-label={tr("Currency")}
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  if (!e.target.value) {
                    setMin("");
                    setMax("");
                  }
                  setPage(1);
                }}
              >
                <option value="">{tr("All currencies")}</option>
                <option>{tr("UZS")}</option>
                <option>{tr("USD")}</option>
                <option>{tr("EUR")}</option>
                <option>{tr("RUB")}</option>
              </select>
            </label>
            <label>
              {tr(" Quoted price basis ")}
              <Input
                value={priceUnit}
                placeholder={tr("Any basis (e.g. t)")}
                maxLength={30}
                onChange={(e) => {
                  setPriceUnit(e.target.value);
                  if (!e.target.value) {
                    setMin("");
                    setMax("");
                  }
                  setPage(1);
                }}
              />
            </label>
            <label>
              {tr(" Reported quantity unit ")}
              <Input
                value={unit}
                placeholder={tr("Any unit (e.g. t)")}
                maxLength={30}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              {tr(" Contract type ")}
              <Input
                value={contractType}
                placeholder={tr("All types")}
                maxLength={64}
                onChange={(e) => {
                  setContractType(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              {tr(" Minimum unit price ")}
              <Input
                type="number"
                min="0"
                step="any"
                disabled={!currency || !priceUnit}
                value={min}
                onChange={(e) => {
                  setMin(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              {tr(" Maximum unit price ")}
              <Input
                type="number"
                min="0"
                step="any"
                disabled={!currency || !priceUnit}
                value={max}
                onChange={(e) => {
                  setMax(e.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
        )}
        {(currency || priceUnit || unit || contractType || exactId) && (
          <div className="active-trade-filters" role="status">
            {[
              currency && `Currency: ${currency}`,
              priceUnit && `Price basis: ${priceUnit}`,
              unit && `Quantity unit: ${unit}`,
              contractType && `Contract: ${contractType}`,
              exactId && `Record: ${exactId}`,
            ]
              .filter(Boolean)
              .map((label) => (
                <span key={String(label)}>{tr(String(label))}</span>
              ))}
          </div>
        )}
        {advanced && (
          <p className="filter-help">
            {tr(
              " Price ranges require a currency and quoted price basis. Sorting retains reported units; values with different units are not directly comparable. ",
            )}
          </p>
        )}
        <div className="results-bar">
          <span>
            <strong>{data?.total ?? tr("—")}</strong>
            {tr(" transactions")}
            {tr(" ")}
            <span className="muted">
              ·{tr(" ")}
              {search ||
              from ||
              to ||
              min ||
              max ||
              currency ||
              unit ||
              priceUnit ||
              contractType
                ? tr("Filtered results")
                : tr("All available records")}
            </span>
          </span>
          <button onClick={clear} className="text-link">
            <RotateCcw size={13} />
            {tr(" Clear filters ")}
          </button>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={retry} />
        ) : (
          data && <TradeTable rows={data.rows} />
        )}
        <div className="pagination">
          <span>
            {data?.total
              ? tr(
                  `${(page - 1) * 12 + 1}–${Math.min(page * 12, data.total)} of ${data.total}`,
                )
              : tr("0 records")}
          </span>
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft />
              {tr(" Previous ")}
            </Button>
            <span>
              {tr("Page ")}
              {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!data || page * 12 >= data.total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              {tr(" Next ")}
              <ChevronRight />
            </Button>
          </div>
        </div>
      </section>
      <p className="page-note">
        {tr(
          " Unit prices retain their original basis. Compare prices only across matching currencies and units. ",
        )}
      </p>
    </>
  );
}
