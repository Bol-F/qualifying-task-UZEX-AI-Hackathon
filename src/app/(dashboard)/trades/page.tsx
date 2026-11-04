"use client";
import { useEffect, useState } from "react";
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
    [currency, setCurrency] = useState("UZS"),
    [sort, setSort] = useState("trade_date"),
    [order, setOrder] = useState("desc"),
    [page, setPage] = useState(1),
    [advanced, setAdvanced] = useState(false),
    [exactProduct, setExactProduct] = useState(""),
    [unit, setUnit] = useState(""),
    [contractType, setContractType] = useState("");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("search");
    if (value) setSearch(value);
    const p = new URLSearchParams(window.location.search);
    if (p.get("from")) setFrom(p.get("from")!);
    if (p.get("to")) setTo(p.get("to")!);
    if (p.get("productName")) {
      setExactProduct(p.get("productName")!);
      setSearch(p.get("productName")!);
    }
    if (p.get("currency")) setCurrency(p.get("currency")!);
    if (p.get("unit")) setUnit(p.get("unit")!);
    if (p.get("contractType")) setContractType(p.get("contractType")!);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({
    search: exactProduct ? "" : debounced,
    ...(exactProduct ? { productName: exactProduct } : {}),
    ...(unit ? { unit } : {}),
    ...(contractType ? { contractType } : {}),
    ...(currency && unit ? { currency } : {}),
    page: String(page),
    pageSize: "12",
    sort,
    order,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(min ? { minPrice: min, currency } : {}),
    ...(max ? { maxPrice: max, currency } : {}),
  });
  const { data, error, loading, retry } = useResource<{
    rows: Trade[];
    total: number;
    mode: string;
  }>("/api/trades?" + params);
  function clear() {
    setSearch("");
    setExactProduct("");
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
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Trade explorer</h1>
          <p>Every transaction. Every detail. One clear view.</p>
        </div>
        <Button variant="outline" onClick={download}>
          <Download />
          Export CSV
        </Button>
      </div>
      <DataNotice mode={data?.mode ?? "unknown"} />
      <section className="panel explorer">
        <div className="explorer-toolbar">
          <div className="search-field">
            <Search size={17} />
            <Input
              aria-label="Search trades"
              placeholder="Search commodity, transaction or contract…"
              value={search}
              onChange={(e) => {
                setExactProduct("");
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
              Price currency
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  setPage(1);
                }}
              >
                <option>UZS</option>
                <option>USD</option>
                <option>EUR</option>
                <option>RUB</option>
              </select>
            </label>
            <label>
              Minimum unit price
              <Input
                type="number"
                min="0"
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
                value={max}
                onChange={(e) => {
                  setMax(e.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
        )}
        <div className="results-bar">
          <span>
            <strong>{data?.total ?? "—"}</strong> transactions{" "}
            <span className="muted">
              ·{" "}
              {search || from || to || min || max
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
