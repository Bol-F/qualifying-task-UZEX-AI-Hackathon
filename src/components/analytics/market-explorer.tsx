"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowUpRight,
  FileText,
  RefreshCw,
  ChartNoAxesCombined,
} from "lucide-react";
import { useResource } from "@/hooks/use-resource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataNotice } from "@/components/layout/data-notice";
import { Loading, ErrorState } from "@/components/layout/resource-state";
import { TradeTable } from "@/components/trades/trade-table";
import { InsightsPanel } from "./insights-panel";
import { PatternExplorer } from "./pattern-explorer";
import type { WorkspaceData } from "@/lib/analytics/service";
import { number } from "@/lib/utils";
const MarketSeries = dynamic(
  () => import("./market-series").then((m) => m.MarketSeries),
  { ssr: false },
);
const ComparisonBars = dynamic(
  () => import("./market-series").then((m) => m.ComparisonBars),
  { ssr: false },
);
export function MarketExplorer() {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [products, setProducts] = useState<string[]>([]),
    [metric, setMetric] = useState<"count" | "value" | "quantity">("count"),
    [currency, setCurrency] = useState(""),
    [unit, setUnit] = useState(""),
    [contract, setContract] = useState(""),
    [compare, setCompare] = useState(false),
    [compareFrom, setCompareFrom] = useState(""),
    [compareTo, setCompareTo] = useState(""),
    [compareProduct, setCompareProduct] = useState(""),
    [compareContract, setCompareContract] = useState(""),
    [tab, setTab] = useState("market");
  const params = new URLSearchParams({
    metric,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(currency ? { currency } : {}),
    ...(unit ? { unit } : {}),
    ...(contract ? { contractType: contract } : {}),
    ...(compare
      ? {
          ...(compareFrom ? { compareFrom } : {}),
          ...(compareTo ? { compareTo } : {}),
          ...(compareProduct ? { compareProduct } : {}),
          ...(compareContract ? { compareContractType: compareContract } : {}),
        }
      : {}),
  });
  products.forEach((p) => params.append("product", p));
  const resource = useResource<WorkspaceData>(
    "/api/analytics/explore?" + params,
  );
  const data = resource.data;
  function changeMetric(value: typeof metric) {
    setMetric(value);
    if (value === "count") {
      setCurrency("");
      setUnit("");
    }
    if (value === "value") {
      setUnit("");
      setCurrency(currency || data?.options.currencies[0] || "UZS");
    }
    if (value === "quantity") {
      setCurrency("");
      setUnit(unit || data?.options.units[0] || "t");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Market explorer
            <span className="heading-dot" />
          </h1>
          <p>Compare what matters. Follow every observation to its source.</p>
        </div>
        <div className="heading-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
              setProducts([]);
              setMetric("count");
              setCurrency("");
              setUnit("");
              setContract("");
              setCompare(false);
            }}
          >
            Reset analysis
          </Button>
          <Button size="sm" variant="outline" onClick={resource.retry}>
            <RefreshCw />
            Refresh
          </Button>
          <Button asChild>
            <Link href={"/reports?" + params}>
              <FileText />
              Generate AI Report
            </Link>
          </Button>
        </div>
      </div>
      <DataNotice mode={data?.mode ?? "unknown"} latest={data?.coverage.to} />
      <section className="panel market-controls">
        <div
          className="workspace-tabs"
          role="tablist"
          aria-label="Analytics sections"
        >
          {[
            ["market", "Market analysis"],
            ["insights", "AI Insights"],
            ["patterns", "Pattern Explorer"],
          ].map(([key, label]) => (
            <button
              role="tab"
              aria-selected={tab === key}
              key={key}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="workspace-filters">
          <label>
            From date
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To date
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label>
            Analysis metric
            <select
              value={metric}
              onChange={(e) => changeMetric(e.target.value as typeof metric)}
            >
              <option value="count">Transaction count</option>
              <option value="value">Valid trade value</option>
              <option value="quantity">Reported volume</option>
            </select>
          </label>
          {metric === "value" && (
            <label>
              Value currency
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {(data?.options.currencies.length
                  ? data.options.currencies
                  : ["UZS"]
                ).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
          {metric === "quantity" && (
            <label>
              Measurement unit
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {(data?.options.units.length ? data.options.units : ["t"]).map(
                  (u) => (
                    <option key={u}>{u}</option>
                  ),
                )}
              </select>
            </label>
          )}
          <label>
            Contract type
            <select
              aria-label="Contract type"
              value={contract}
              onChange={(e) => setContract(e.target.value)}
            >
              <option value="">All types</option>
              {data?.options.contractTypes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="commodity-picker">
          <legend>
            Compare commodities{" "}
            <span>
              Choose up to three · none selects the leading available series
            </span>
          </legend>
          {data?.options.products.map((p) => (
            <label key={p}>
              <input
                type="checkbox"
                checked={products.includes(p)}
                disabled={!products.includes(p) && products.length >= 3}
                onChange={(e) =>
                  setProducts((prev) =>
                    e.target.checked
                      ? [...prev, p]
                      : prev.filter((n) => n !== p),
                  )
                }
              />
              {p}
            </label>
          ))}
        </fieldset>
        <div className="comparison-toggle">
          <label>
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => {
                setCompare(e.target.checked);
                if (!compareFrom && data?.options.dates.length) {
                  const day =
                    data.options.dates.at(-2) ?? data.options.dates.at(-1)!;
                  setCompareFrom(day);
                  setCompareTo(day);
                }
              }}
            />
            Compare against a baseline
          </label>
          <span>
            Selected − baseline; percentage is unavailable for missing or zero
            baselines.
          </span>
        </div>
        {compare && (
          <div className="workspace-filters baseline-filters">
            <label>
              Baseline from
              <Input
                type="date"
                value={compareFrom}
                onChange={(e) => setCompareFrom(e.target.value)}
              />
            </label>
            <label>
              Baseline to
              <Input
                type="date"
                value={compareTo}
                onChange={(e) => setCompareTo(e.target.value)}
              />
            </label>
            <label>
              Baseline commodity
              <select
                value={compareProduct}
                onChange={(e) => setCompareProduct(e.target.value)}
              >
                <option value="">Same commodities</option>
                {data?.options.products.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              Baseline contract type
              <select
                value={compareContract}
                onChange={(e) => setCompareContract(e.target.value)}
              >
                <option value="">Same contract types</option>
                {data?.options.contractTypes.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.retry} />
      ) : (
        data && (
          <div className="workspace-content">
            {tab === "patterns" ? (
              <PatternExplorer data={data} />
            ) : tab === "insights" ? (
              <InsightsPanel key={data.fingerprint} data={data} />
            ) : (
              <>
                <div className="workspace-stat-strip">
                  <div>
                    <span>Selected metric</span>
                    <strong>
                      {data.measure.value === null
                        ? "Unavailable"
                        : number(data.measure.value, true)}{" "}
                      <small>{data.measure.unit}</small>
                    </strong>
                  </div>
                  <div>
                    <span>Underlying records</span>
                    <strong>{number(data.selectedCount)}</strong>
                  </div>
                  <div>
                    <span>Source updated</span>
                    <strong className="date-value">
                      {data.coverage.latestImport
                        ? new Date(data.coverage.latestImport).toLocaleString(
                            "en-GB",
                            { timeZone: "Asia/Tashkent" },
                          )
                        : "Not available"}
                    </strong>
                  </div>
                </div>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        <ChartNoAxesCombined size={17} className="mint" />
                        Commodity activity
                      </h2>
                      <p>{data.definition}</p>
                    </div>
                  </div>
                  <MarketSeries data={data} />
                  <details className="workspace-data-table">
                    <summary>
                      Inspect chart observations and source links
                    </summary>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Commodity</th>
                            <th>Date</th>
                            <th>Value ({data.measure.unit})</th>
                            <th>Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.series.flatMap((s) =>
                            s.points.map((p) => (
                              <tr key={s.name + p.label}>
                                <td>{s.name}</td>
                                <td>{p.label}</td>
                                <td>{p.value ?? "Unavailable"}</td>
                                <td>
                                  <Link
                                    className="text-link"
                                    href={
                                      "/trades?" +
                                      new URLSearchParams({
                                        from: p.label,
                                        to: p.label,
                                        productName: s.name,
                                        ...(currency ? { currency } : {}),
                                        ...(unit ? { unit } : {}),
                                        ...(contract
                                          ? { contractType: contract }
                                          : {}),
                                      })
                                    }
                                  >
                                    Source trades
                                    <ArrowUpRight size={13} />
                                  </Link>
                                </td>
                              </tr>
                            )),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </section>
                {data.comparison && (
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Selection vs baseline</h2>
                        <p>
                          Absolute and relative change from stored, comparable
                          observations.
                        </p>
                      </div>
                    </div>
                    <div className="comparison-metrics">
                      {[
                        ["Selected", data.comparison.current.value],
                        ["Baseline", data.comparison.baseline.value],
                        ["Difference", data.comparison.difference],
                        [
                          "Change",
                          data.comparison.percent === null
                            ? null
                            : data.comparison.percent + "%",
                        ],
                      ].map(([name, value]) => (
                        <div key={name}>
                          <span>{name}</span>
                          <strong>
                            {value === null ? "Unavailable" : value}
                          </strong>
                        </div>
                      ))}
                    </div>
                    <p className="panel-footnote">
                      Counts: {data.comparison.current.records} selected /{" "}
                      {data.comparison.baseline.records} baseline records.
                    </p>
                    {data.comparison.warnings.map((w) => (
                      <p className="workspace-warning" key={w}>
                        {w}
                      </p>
                    ))}
                  </section>
                )}
                <div className="workspace-two-columns">
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Top commodities · {metric}</h2>
                    </div>
                    <div className="ranking">
                      {data.breakdown.map((p, i) => (
                        <Link
                          key={p.name}
                          href={
                            "/trades?productName=" +
                            encodeURIComponent(p.name) +
                            (from ? "&from=" + from : "") +
                            (to ? "&to=" + to : "")
                          }
                        >
                          <span>{i + 1}</span>
                          <strong>{p.name}</strong>
                          <span>
                            {p.value === null
                              ? "Unavailable"
                              : number(p.value, true)}{" "}
                            {p.unit}
                          </span>
                          <ArrowUpRight size={13} />
                        </Link>
                      ))}
                    </div>
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Analysis notes</h2>
                    </div>
                    {data.warnings.map((w) => (
                      <p className="workspace-warning" key={w}>
                        {w}
                      </p>
                    ))}
                    <p className="panel-footnote">
                      Snapshot {data.fingerprint.slice(0, 16)} · refreshed{" "}
                      {new Date(data.generatedAt).toLocaleTimeString()}
                    </p>
                  </section>
                </div>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>
                      Source sample · {data.rows.length} of {data.selectedCount}
                    </h2>
                  </div>
                  <ComparisonBars data={data} />
                  <TradeTable rows={data.rows} compact />
                </section>
              </>
            )}
          </div>
        )
      )}
    </>
  );
}
