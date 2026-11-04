"use client";
import { useState } from "react";
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
import type { demoQuestions } from "@/lib/analytics/demo";
type Data = Analytics & {
  mode: string;
  latestImport: string | null;
  demo: ReturnType<typeof demoQuestions>;
};
export default function Dashboard() {
  const [range, setRange] = useState("all"),
    [metric, setMetric] = useState<"count" | "value" | "volume">("value"),
    [group, setGroup] = useState("");
  const query =
    range === "all"
      ? ""
      : range === "oct"
        ? "?from=2026-10-01&to=2026-10-30"
        : "?from=2026-10-24&to=2026-10-30";
  const { data, error, loading, retry } = useResource<Data>(
    "/api/analytics" + query,
  );
  const recent = useResource<{ rows: Trade[] }>(
    "/api/trades" + (query ? query + "&" : "?") + "pageSize=5",
  );
  const groups = data
    ? Object.keys(metric === "volume" ? data.quantities : data.values)
    : [];
  const selected = groups.includes(group) ? group : (groups[0] ?? "");
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Market overview
            <span className="heading-dot" />
          </h1>
          <p>Clarity in every transaction. Intelligence for every decision.</p>
        </div>
        <div className="heading-actions">
          <label className="date-select">
            <CalendarDays size={15} />
            <select
              aria-label="Dashboard date range"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="all">All available records</option>
              <option value="oct">October 2026</option>
              <option value="week">Oct 24 – 30, 2026</option>
            </select>
          </label>
          <Button asChild>
            <Link href="/assistant">
              <Sparkles />
              Ask AI
            </Link>
          </Button>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={retry} />
      ) : (
        data && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DataNotice mode={data.mode} latest={data.latest} />
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
                  sub: `${data.excluded} records excluded · unmatched basis`,
                },
                {
                  title: "Traded quantity",
                  icon: Boxes,
                  value:
                    Object.entries(data.quantities)
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
                    {k.title}
                    <k.icon size={16} />
                  </div>
                  <strong className="kpi-value">{k.value}</strong>
                  <small>{k.sub}</small>
                  <div className="kpi-bottom">
                    <span className="tiny-dot" />
                    Based on source records
                  </div>
                </section>
              ))}
            </div>
            <div className="analytics-grid">
              <section className="panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Transaction activity</h2>
                    <p>
                      {metric === "value"
                        ? "Trade value"
                        : metric === "volume"
                          ? "Traded quantity"
                          : "Transaction count"}{" "}
                      over time ·{" "}
                      {metric === "count" ? "transactions" : selected}
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
                          ? "Value"
                          : m === "volume"
                            ? "Volume"
                            : "Count"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="activity-summary">
                  <strong>
                    {metric === "count"
                      ? number(data.count)
                      : number(
                          (metric === "value" ? data.values : data.quantities)[
                            selected
                          ] ?? 0,
                          true,
                        )}
                  </strong>
                  <span>{metric === "count" ? "transactions" : selected}</span>
                  {metric !== "count" && groups.length > 1 && (
                    <select
                      aria-label="Chart unit or currency"
                      value={selected}
                      onChange={(e) => setGroup(e.target.value)}
                    >
                      {groups.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  )}
                  <span className="chart-period">Selected period</span>
                </div>
                <ActivityChart
                  data={data}
                  metric={metric}
                  group={metric === "count" ? "transactions" : selected}
                />
                <div className="chart-foot">
                  <span>
                    <i />{" "}
                    {metric === "value"
                      ? "Transaction value"
                      : metric === "volume"
                        ? "Quantity"
                        : "Transaction count"}
                  </span>
                  <span>Daily aggregates · no currency conversion</span>
                </div>
              </section>
              <section className="panel commodity-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Commodity mix</h2>
                    <p>Share of transaction count</p>
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
                    <h2>Recent transactions</h2>
                    <p>The latest activity in your dataset</p>
                  </div>
                  <Link className="text-link" href="/trades">
                    View all <ArrowUpRight size={14} />
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
                    <Sparkles size={17} className="mint" /> Intelligence brief
                  </h2>
                  <span className="ai-chip">DATA INSIGHTS</span>
                </div>
                <div className="insight">
                  <span className="insight-icon">
                    <Activity size={15} />
                  </span>
                  <div>
                    <strong>
                      {data.products[0]?.name ?? "No activity"} is among the
                      most active
                    </strong>
                    <p>
                      {data.products[0]?.count ?? 0} transactions, representing{" "}
                      {data.count
                        ? Math.round(
                            ((data.products[0]?.count ?? 0) / data.count) * 100,
                          )
                        : 0}
                      % of all records in this period.
                    </p>
                  </div>
                </div>
                <div className="insight">
                  <span className="insight-icon blue">
                    <CalendarDays size={15} />
                  </span>
                  <div>
                    <strong>Understand the full picture</strong>
                    <p>
                      Latest record: {data.latest ?? "none"}. Imported records
                      may not represent the entire exchange.
                    </p>
                  </div>
                </div>
                <Link className="insight-cta" href="/assistant">
                  Explore these insights with AI
                  <ChevronRight size={16} />
                </Link>
              </section>
            </div>
            <div className="bottom-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Daily transaction count</h2>
                    <p>Number of records per trading date</p>
                  </div>
                </div>
                <DailyBars data={data} />
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Most active commodities</h2>
                    <p>Ranked by number of transactions</p>
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
