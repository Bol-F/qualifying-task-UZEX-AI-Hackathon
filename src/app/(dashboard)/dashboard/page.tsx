"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  ArrowLeftRight,
  Wallet,
  Boxes,
  Layers3,
  Sparkles,
  ChevronRight,
  CalendarDays,
  Activity,
} from "lucide-react";
import { useResource } from "@/hooks/use-resource";
import { DataNotice } from "@/components/layout/data-notice";
import { Loading, ErrorState } from "@/components/layout/resource-state";
import {
  ActivityChart,
  CommodityChart,
  DailyBars,
} from "@/components/charts/market-charts";
import { TradeTable } from "@/components/trades/trade-table";
import { Button } from "@/components/ui/button";
import type { Analytics } from "@/lib/analytics/calculations";
import type { Trade } from "@/types";
import { number } from "@/lib/utils";
import { GuidedDemo } from "@/components/dashboard/guided-demo";
import { Input } from "@/components/ui/input";
import { dashboardPoints } from "@/lib/analytics/chart-data";
import type { demoQuestions } from "@/lib/analytics/demo";
type Data = Analytics & {
  mode: string;
  latestImport: string | null;
  demo: ReturnType<typeof demoQuestions>;
};
export default function Dashboard() {
  const { t: tr, formatDate } = usePreferences();
  const [range, setRange] = useState("all"),
    [commodity, setCommodity] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [catalog, setCatalog] = useState<Data | null>(null),
    [quantityUnit, setQuantityUnit] = useState(""),
    [metric, setMetric] = useState<"count" | "value" | "volume">("value"),
    [group, setGroup] = useState("");
  const latestDates = catalog?.daily.slice(-7) ?? [];
  const params = new URLSearchParams({
    ...(commodity ? { productName: commodity } : {}),
    ...(range === "latest" && latestDates.length
      ? { from: latestDates[0].date, to: latestDates.at(-1)!.date }
      : {}),
    ...(range === "custom" && from ? { from } : {}),
    ...(range === "custom" && to ? { to } : {}),
  });
  const query = params.size ? "?" + params : "";
  const { data, error, loading, retry } = useResource<Data>(
    "/api/analytics" + query,
  );
  const recent = useResource<{
    rows: Trade[];
  }>("/api/trades" + (query ? query + "&" : "?") + "pageSize=5");
  useEffect(() => {
    if (data && !query) setCatalog(data);
  }, [data, query]);
  const groups = data
    ? Object.keys(metric === "volume" ? data.quantities : data.values)
    : [];
  const selected = groups.includes(group) ? group : (groups[0] ?? "");
  const quantityUnits = Object.keys(data?.quantities ?? {});
  const selectedQuantityUnit = quantityUnits.includes(quantityUnit)
    ? quantityUnit
    : (quantityUnits[0] ?? "");
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {tr(" Market overview ")}
            <span className="heading-dot" />
          </h1>
          <p>
            {tr(
              "Review activity, filter by date or product, and inspect the source records.",
            )}
          </p>
        </div>
        <div className="heading-actions">
          <label className="date-select">
            <CalendarDays size={15} />
            <select
              aria-label={tr("Dashboard date range")}
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="all">{tr("All available records")}</option>
              <option value="latest" disabled={!catalog?.daily.length}>
                {tr(" Latest 7 available trading days ")}
              </option>
              <option value="custom">{tr("Custom date range")}</option>
            </select>
          </label>
          <select
            aria-label={tr("Dashboard commodity")}
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
          >
            <option value="">{tr("All commodities")}</option>
            {(catalog?.products ?? data?.products ?? []).map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <Button asChild>
            <Link href="/assistant">
              <Sparkles />
              {tr(" Ask AI ")}
            </Link>
          </Button>
        </div>
      </div>
      {range === "custom" && (
        <div className="panel dashboard-date-fields">
          <label>
            {tr(" Dashboard from ")}
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            {tr(" Dashboard to ")}
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <Button
            variant="ghost"
            onClick={() => {
              setRange("all");
              setCommodity("");
              setFrom("");
              setTo("");
            }}
          >
            {tr(" Reset selection ")}
          </Button>
        </div>
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={retry} />
      ) : (
        data && (
          <motion.div
            className="dashboard-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DataNotice mode={data.mode} latest={data.latest} />
            <p className="dataset-coverage">
              {tr(" Selected coverage: ")}
              {data.daily[0]?.date
                ? formatDate(data.daily[0].date)
                : tr("No records")}{" "}
              →{tr(" ")}
              {data.latest ? formatDate(data.latest) : tr("unavailable")}
              {tr(" \u00B7 Source import:")}
              {tr(" ")}
              {data.latestImport
                ? formatDate(data.latestImport, true)
                : tr("unavailable")}
              {tr(
                ". Latest available dates describe this dataset, not a live market feed. ",
              )}
            </p>
            {data.mode === "local" && (
              <p className="registry-accounting">
                {tr(
                  "Cancelled records: {count}. Excluded from value and volume; retained in registry counts.",
                  { count: data.cancelled },
                )}
                {data.convertedValueUZS !== null && (
                  <>
                    {" "}
                    {tr(
                      "Value in UZS at each trade date's exchange rate:",
                    )}{" "}
                    <strong title={data.convertedValueUZS}>
                      {number(data.convertedValueUZS, true)} UZS
                    </strong>
                    .
                  </>
                )}
              </p>
            )}
            <GuidedDemo demo={data.demo} mode={data.mode} />
            <div className="kpi-grid">
              {[
                {
                  title: "Total transactions",
                  icon: ArrowLeftRight,
                  value: number(data.count),
                  sub: "Records in selected period",
                },
                {
                  title: "Total trade value",
                  icon: Wallet,
                  value:
                    Object.entries(data.values)
                      .map(([c, v]) => `${number(v, true)} ${c}`)
                      .join(" · ") || "Unavailable",
                  sub: tr(
                    data.mode === "local"
                      ? "{count} records excluded · cancelled or unmatched basis"
                      : "{count} records excluded · unmatched basis",
                    {
                      count: data.excluded,
                    },
                  ),
                },
                {
                  title: "Traded quantity",
                  icon: Boxes,
                  value:
                    quantityUnits.length > 2
                      ? `${number(data.quantities[selectedQuantityUnit], true)} ${selectedQuantityUnit}`
                      : Object.entries(data.quantities)
                          .map(([u, v]) => `${number(v, true)} ${u}`)
                          .join(" · ") || "—",
                  sub: "Grouped by measurement unit",
                },
                {
                  title: "Active commodities",
                  icon: Layers3,
                  value: number(data.products.length),
                  sub: "Unique products in this period",
                },
              ].map((k) => (
                <section className="kpi" key={k.title}>
                  <div className="kpi-title">
                    {tr(k.title)}
                    <k.icon size={16} />
                  </div>
                  <strong className="kpi-value">{k.value}</strong>
                  {k.title === "Traded quantity" &&
                    quantityUnits.length > 2 && (
                      <select
                        aria-label={tr("Quantity summary unit")}
                        value={selectedQuantityUnit}
                        onChange={(e) => setQuantityUnit(e.target.value)}
                      >
                        {quantityUnits.map((unit) => (
                          <option key={unit}>{unit}</option>
                        ))}
                      </select>
                    )}
                  <small>{tr(k.sub)}</small>
                  <div className="kpi-bottom">
                    <span className="tiny-dot" />
                    {tr(" Based on source records ")}
                  </div>
                </section>
              ))}
            </div>
            <div className="analytics-grid">
              <section className="panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <h2>{tr("Transaction activity")}</h2>
                    <p>
                      {metric === "value"
                        ? tr("Trade value")
                        : metric === "volume"
                          ? tr("Traded quantity")
                          : tr("Transaction count")}
                      {tr(" ")}
                      {tr(" over time \u00B7")}
                      {tr(" ")}
                      {metric === "count" ? tr("transactions") : selected}
                    </p>
                  </div>
                  <div className="chart-switch">
                    {(["value", "volume", "count"] as const).map((m) => (
                      <button
                        key={m}
                        className={metric === m ? "selected" : ""}
                        onClick={() => {
                          setMetric(m);
                          setGroup("");
                        }}
                      >
                        {m === "value"
                          ? tr("Value")
                          : m === "volume"
                            ? tr("Volume")
                            : tr("Count")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="activity-summary">
                  <strong
                    title={
                      metric === "count"
                        ? String(data.count)
                        : (metric === "value" ? data.values : data.quantities)[
                            selected
                          ]
                    }
                  >
                    {metric === "count"
                      ? number(data.count)
                      : (metric === "value" ? data.values : data.quantities)[
                            selected
                          ] === undefined
                        ? tr("Unavailable")
                        : number(
                            (metric === "value"
                              ? data.values
                              : data.quantities)[selected],
                            true,
                          )}
                  </strong>
                  <span>
                    {metric === "count" ? tr("transactions") : selected}
                  </span>
                  {metric !== "count" && groups.length > 1 && (
                    <select
                      aria-label={tr("Chart unit or currency")}
                      value={selected}
                      onChange={(e) => setGroup(e.target.value)}
                    >
                      {groups.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  )}
                  <span className="chart-period">{tr("Selected period")}</span>
                </div>
                {dashboardPoints(data, metric, selected).some(
                  (p) => p.value !== null,
                ) ? (
                  <ActivityChart
                    data={data}
                    metric={metric}
                    group={metric === "count" ? "transactions" : selected}
                  />
                ) : (
                  <div className="chart-empty" role="status">
                    {tr(
                      " No compatible chart observations are available. Missing data is not plotted as zero. ",
                    )}
                  </div>
                )}
                <div className="chart-foot">
                  <span>
                    <i />
                    {tr(" ")}
                    {metric === "value"
                      ? tr("Transaction value")
                      : metric === "volume"
                        ? tr("Quantity")
                        : tr("Transaction count")}
                  </span>
                  <span>
                    {tr("Daily aggregates \u00B7 no currency conversion")}
                  </span>
                </div>
              </section>
              <section className="panel commodity-panel">
                <div className="panel-heading">
                  <div>
                    <h2>{tr("Commodity mix")}</h2>
                    <p>{tr("Share of transaction count")}</p>
                  </div>
                  <Layers3 size={16} className="muted" />
                </div>
                <CommodityChart data={data} />
              </section>
            </div>
            <div className="lower-grid">
              <section className="panel recent-panel">
                <div className="panel-heading">
                  <div>
                    <h2>{tr("Recent transactions")}</h2>
                    <p>{tr("The latest activity in your dataset")}</p>
                  </div>
                  <Link className="text-link" href="/trades">
                    {tr(" View all ")}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
                {recent.error ? (
                  <ErrorState message={recent.error} retry={recent.retry} />
                ) : (
                  recent.data && <TradeTable rows={recent.data.rows} compact />
                )}
              </section>
              <section className="panel insights-panel">
                <div className="panel-heading">
                  <h2>
                    <Sparkles size={17} className="mint" />
                    {tr(" Intelligence brief ")}
                  </h2>
                  <span className="ai-chip">{tr("DATA INSIGHTS")}</span>
                </div>
                <div className="insight">
                  <span className="insight-icon">
                    <Activity size={15} />
                  </span>
                  <div>
                    <strong>
                      {data.count ? (
                        <>
                          {data.products[0]?.name ?? tr("No activity")}
                          {tr(" is among the most active ")}
                        </>
                      ) : (
                        tr("No supported activity observation")
                      )}
                    </strong>
                    <p>
                      {data.count ? (
                        <>
                          {data.products[0]?.count ?? 0}
                          {tr(" transactions, representing")}
                          {tr(" ")}
                          {data.count
                            ? Math.round(
                                ((data.products[0]?.count ?? 0) / data.count) *
                                  100,
                              )
                            : 0}
                          {tr(" % of all records in this period. ")}
                        </>
                      ) : (
                        tr(
                          "No records match the selection. This does not establish that no trading occurred on the exchange.",
                        )
                      )}
                    </p>
                  </div>
                </div>
                <div className="insight">
                  <span className="insight-icon blue">
                    <CalendarDays size={15} />
                  </span>
                  <div>
                    <strong>{tr("Understand the full picture")}</strong>
                    <p>
                      {tr(" Latest record: ")}
                      {data.latest ?? tr("none")}
                      {tr(
                        ". Imported records may not represent the entire exchange. ",
                      )}
                    </p>
                  </div>
                </div>
                <Link className="insight-cta" href="/assistant">
                  {tr(" Explore these insights with AI ")}
                  <ChevronRight size={16} />
                </Link>
              </section>
            </div>
            <div className="bottom-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>{tr("Daily transaction count")}</h2>
                    <p>{tr("Number of records per trading date")}</p>
                  </div>
                </div>
                <DailyBars data={data} />
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>{tr("Most active commodities")}</h2>
                    <p>{tr("Ranked by number of transactions")}</p>
                  </div>
                </div>
                <div className="ranking">
                  {data.products.slice(0, 4).map((p, i) => (
                    <Link
                      href={"/trades?search=" + encodeURIComponent(p.name)}
                      key={p.name}
                    >
                      <span className="muted">0{i + 1}</span>
                      <strong>{p.name}</strong>
                      <div>
                        <i
                          style={{
                            width: `${(p.count / (data.products[0]?.count || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span>{p.count}</span>
                      <ArrowUpRight size={14} />
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        )
      )}
    </>
  );
}
