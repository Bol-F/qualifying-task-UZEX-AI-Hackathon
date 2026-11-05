"use client";
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
          <h1>Trade explorer</h1>
          <p>Every transaction. Every detail. One clear view.</p>
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
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>
      <DataNotice mode={data?.mode ?? "unknown"} />
      {sourceProducts.length > 0 && (
        <p className="dataset-coverage">
          Selected commodities: {sourceProducts.join(" · ")}. Clear filters to
          explore all records.
        </p>
      )}
      <section className="panel explorer">
        <div className="explorer-toolbar">
          <div className="search-field">
            <Search size={17} />
            <Input
              aria-label="Search trades"
              ref={searchInput}
              placeholder="Search commodity, transaction or contract…"
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
            Filters
          </Button>
          <select
            aria-label="Sort by"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="trade_date">Trade date</option>
            <option value="price">Unit price</option>
            <option value="quantity">Quantity</option>
            <option value="product_name">Commodity</option>
          </select>
          <select
            aria-label="Sort order"
            value={order}
            onChange={(e) => {
              setOrder(e.target.value);
              setPage(1);
            }}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
        {advanced && (
          <div className="filter-row">
            <label>
              From date
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
              To date
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
              Currency
              <select
                aria-label="Currency"
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
                <option value="">All currencies</option>
                <option>UZS</option>
                <option>USD</option>
                <option>EUR</option>
                <option>RUB</option>
              </select>
            </label>
            <label>
              Quoted price basis
              <Input
                value={priceUnit}
                placeholder="Any basis (e.g. t)"
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
              Reported quantity unit
              <Input
                value={unit}
                placeholder="Any unit (e.g. t)"
                maxLength={30}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Contract type
              <Input
                value={contractType}
                placeholder="All types"
                maxLength={64}
                onChange={(e) => {
                  setContractType(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Minimum unit price
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
              Maximum unit price
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
                <span key={String(label)}>{label}</span>
              ))}
          </div>
        )}
        {advanced && (
          <p className="filter-help">
            Price ranges require a currency and quoted price basis. Sorting
            retains reported units; values with different units are not directly
            comparable.
          </p>
        )}
        <div className="results-bar">
          <span>
            <strong>{data?.total ?? "—"}</strong> transactions{" "}
            <span className="muted">
              ·{" "}
              {search ||
              from ||
              to ||
              min ||
              max ||
              currency ||
              unit ||
              priceUnit ||
              contractType
                ? "Filtered results"
                : "All available records"}
            </span>
          </span>
          <button onClick={clear} className="text-link">
            <RotateCcw size={13} />
            Clear filters
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
              ? `${(page - 1) * 12 + 1}–${Math.min(page * 12, data.total)} of ${data.total}`
              : "0 records"}
          </span>
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft />
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!data || page * 12 >= data.total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight />
            </Button>
          </div>
        </div>
      </section>
      <p className="page-note">
        Unit prices retain their original basis. Compare prices only across
        matching currencies and units.
      </p>
    </>
  );
}
