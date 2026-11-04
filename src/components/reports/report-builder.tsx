"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  FileText,
  Printer,
  Sparkles,
  LoaderCircle,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataNotice } from "@/components/layout/data-notice";
import { TradeTable } from "@/components/trades/trade-table";
import { useResource } from "@/hooks/use-resource";
import type { WorkspaceData } from "@/lib/analytics/service";
import type { explainFacts } from "@/lib/ai/report-explanations";
import { number } from "@/lib/utils";
const MarketSeries = dynamic(
  () =>
    import("@/components/analytics/market-series").then((m) => m.MarketSeries),
  { ssr: false },
);
type Report = {
  snapshot: WorkspaceData;
  commentary: Awaited<ReturnType<typeof explainFacts>>;
};
export function ReportBuilder() {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [products, setProducts] = useState<string[]>([]),
    [baselineFrom, setBaselineFrom] = useState(""),
    [baselineTo, setBaselineTo] = useState(""),
    [report, setReport] = useState<Report | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [chartReady, setChartReady] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const chartMounted = useCallback(() => setChartReady(true), []);
  const { data: available } = useResource<WorkspaceData>(
    "/api/analytics/explore",
  );
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has("from")) setFrom(p.get("from")!);
    if (p.has("to")) setTo(p.get("to")!);
    if (p.has("product")) setProducts(p.getAll("product").slice(0, 3));
    if (p.has("compareFrom")) setBaselineFrom(p.get("compareFrom")!);
    if (p.has("compareTo")) setBaselineTo(p.get("compareTo")!);
    setInteractive(true);
  }, []);
  async function generate(calculated = false) {
    setBusy(true);
    setChartReady(false);
    setError("");
    try {
      const response = await fetch(
        "/api/reports" + (calculated ? "?commentary=calculated" : ""),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metric: "count",
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),
            products,
            ...(baselineFrom ? { compareFrom: baselineFrom } : {}),
            ...(baselineTo ? { compareTo: baselineTo } : {}),
          }),
          signal: AbortSignal.timeout(35000),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading no-print">
        <div>
          <h1>Analytics reports</h1>
          <p>Turn verified observations into a clear, shareable briefing.</p>
        </div>
        <Button
          variant="outline"
          disabled={!report || busy || !chartReady}
          onClick={() => window.print()}
        >
          <Printer />
          Print / Save PDF
        </Button>
      </div>
      <section className="panel report-controls no-print">
        <div className="workspace-filters">
          <label>
            Report from
            <Input
              type="date"
              disabled={!interactive}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Report to
            <Input
              type="date"
              disabled={!interactive}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label>
            Compare from
            <Input
              type="date"
              disabled={!interactive}
              value={baselineFrom}
              onChange={(e) => setBaselineFrom(e.target.value)}
            />
          </label>
          <label>
            Compare to
            <Input
              type="date"
              disabled={!interactive}
              value={baselineTo}
              onChange={(e) => setBaselineTo(e.target.value)}
            />
          </label>
        </div>
        <fieldset className="commodity-picker">
          <legend>
            Report commodities{" "}
            <span>Up to three; none includes all available records</span>
          </legend>
          {available?.options.products.map((p) => (
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
        <div className="report-generate">
          <p>
            Calculations and evidence are captured as one snapshot. AI
            commentary is clearly identified.
          </p>
          <Button disabled={busy || !interactive} onClick={() => generate()}>
            {busy ? <LoaderCircle className="spin" /> : <Sparkles />}
            {busy ? "Generating report…" : "Generate AI Report"}
          </Button>
        </div>
      </section>
      {error && (
        <div className="workspace-warning" role="alert">
          {error}{" "}
          <button className="text-link" onClick={() => generate()}>
            Try again
          </button>
          <button className="text-link" onClick={() => generate(true)}>
            Generate calculated report
          </button>
        </div>
      )}
      {!report && !busy && (
        <div className="report-empty">
          <FileText size={36} />
          <h2>A briefing built on evidence.</h2>
          <p>
            Select a period and generate a report. Download it with your
            browser’s Print / Save as PDF.
          </p>
          <span>Coverage · activity · comparisons · insights · sources</span>
        </div>
      )}
      {report && (
        <article className="analytics-report">
          <div className="report-title">
            <div>
              <span className="report-wordmark">UZEX INSIGHT AI</span>
              <h1>Commodity intelligence briefing</h1>
              <p>
                Generated{" "}
                {new Date(report.snapshot.generatedAt).toLocaleString("en-GB", {
                  timeZone: "Asia/Tashkent",
                })}{" "}
                UZT
              </p>
            </div>
            <FileText size={30} />
          </div>
          <DataNotice
            mode={report.snapshot.mode}
            latest={report.snapshot.coverage.to}
          />
          <section>
            <h2>Executive summary</h2>
            <p>
              This selection contains{" "}
              <strong>{number(report.snapshot.selectedCount)}</strong> stored
              transaction records across{" "}
              <strong>{report.snapshot.summary.products.length}</strong>{" "}
              commodity categories. It describes available source records and
              does not represent complete exchange activity.
            </p>
          </section>
          <section>
            <h2>Dataset coverage</h2>
            <dl className="report-coverage">
              <div>
                <dt>Dataset dates</dt>
                <dd>
                  {report.snapshot.coverage.from ?? "Unavailable"} →{" "}
                  {report.snapshot.coverage.to ?? "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Selected period</dt>
                <dd>
                  {report.snapshot.selection.from || "All available dates"} →{" "}
                  {report.snapshot.selection.to || "Latest available"}
                </dd>
              </div>
              <div>
                <dt>Source import observed</dt>
                <dd>
                  {report.snapshot.coverage.latestImport ?? "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Snapshot</dt>
                <dd>{report.snapshot.fingerprint.slice(0, 24)}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h2>Trading activity overview</h2>
            <div className="report-kpis">
              <div>
                <span>Stored records</span>
                <strong>{report.snapshot.selectedCount}</strong>
              </div>
              {Object.entries(report.snapshot.summary.values).map(
                ([currency, value]) => (
                  <div key={currency}>
                    <span>Valid value · {currency}</span>
                    <strong>{number(value, true)}</strong>
                    <small>
                      Exact: {value} {currency}
                    </small>
                  </div>
                ),
              )}
              {Object.entries(report.snapshot.summary.quantities).map(
                ([unit, value]) => (
                  <div key={unit}>
                    <span>Quantity · {unit}</span>
                    <strong>{number(value, true)}</strong>
                    <small>
                      Exact: {value} {unit}
                    </small>
                  </div>
                ),
              )}
            </div>
            <MarketSeries
              data={report.snapshot}
              drill={false}
              onReady={chartMounted}
            />
          </section>
          <section>
            <h2>Commodity breakdown</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <th>Stored records</th>
                    <th>Source filters</th>
                  </tr>
                </thead>
                <tbody>
                  {report.snapshot.summary.products.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>{p.count}</td>
                      <td>
                        <Link
                          className="text-link"
                          href={
                            "/trades?" +
                            new URLSearchParams({
                              productName: p.name,
                              ...(report.snapshot.selection.from
                                ? { from: report.snapshot.selection.from }
                                : {}),
                              ...(report.snapshot.selection.to
                                ? { to: report.snapshot.selection.to }
                                : {}),
                            })
                          }
                        >
                          Inspect source
                          <ArrowUpRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2>Period comparison</h2>
            {report.snapshot.comparison ? (
              <>
                <p>
                  Selected count{" "}
                  {report.snapshot.comparison.current.value ?? "unavailable"} ·
                  baseline count{" "}
                  {report.snapshot.comparison.baseline.value ?? "unavailable"} ·
                  difference{" "}
                  {report.snapshot.comparison.difference ?? "unavailable"} ·
                  change{" "}
                  {report.snapshot.comparison.percent === null
                    ? "unavailable"
                    : report.snapshot.comparison.percent + "%"}
                  .
                </p>
                <p className="muted">
                  Baseline:{" "}
                  {report.snapshot.selection.compareFrom ?? "same start"} →{" "}
                  {report.snapshot.selection.compareTo ?? "same end"}. Missing
                  observations remain unavailable.
                </p>
              </>
            ) : (
              <p>
                No comparison period was selected. No market comparison has been
                inferred.
              </p>
            )}
          </section>
          <section>
            <h2>
              {report.commentary.mode === "gemini-guided"
                ? "Gemini-guided observations"
                : "Calculated observations"}
            </h2>
            {report.commentary.warning && (
              <p className="workspace-warning" role="status">
                {report.commentary.warning}
              </p>
            )}
            {report.snapshot.facts.map((f) => (
              <div className="report-fact" key={f.id}>
                <p>
                  <strong>Verified calculation:</strong> {f.statement}
                </p>
                {report.commentary.items
                  .filter((item) => item.factId === f.id)
                  .map((item, i) => (
                    <p key={i}>
                      <strong>
                        {report.commentary.mode === "gemini-guided"
                          ? "AI-selected interpretation"
                          : "Deterministic context"}
                        :
                      </strong>{" "}
                      {item.text}
                    </p>
                  ))}
                <small>
                  Metric {f.value}; baseline {f.baseline}; {f.coverage.records}{" "}
                  records. Filters{" "}
                  {Object.entries(f.filters)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                  .
                </small>
              </div>
            ))}
          </section>
          <section>
            <h2>Source references</h2>
            <p>
              First {report.snapshot.rows.length} matching records of{" "}
              {report.snapshot.selectedCount}. Full filtered records remain
              available in Trade Explorer.
            </p>
            <TradeTable rows={report.snapshot.rows} compact />
            <div className="report-source-list">
              {report.snapshot.rows.map((t) => (
                <div key={t.id}>
                  {t.id} · {t.external_id ?? "No external ID"} · {t.data_source}
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2>Data limitations</h2>
            <ul>
              {[
                ...report.snapshot.warnings,
                ...(report.snapshot.comparison?.warnings ?? []),
                `Excluded from valid-value calculation: ${report.snapshot.summary.excluded} records with unknown currency or incompatible price basis.`,
                "No currency or quantity-unit conversion is performed. Pending records are activity, not settled cash flows.",
                "Observations are not financial advice or evidence of wrongdoing.",
              ].map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>
          <div className="report-footer">
            UZEX Insight AI · Source snapshot {report.snapshot.fingerprint}
          </div>
        </article>
      )}
    </>
  );
}
