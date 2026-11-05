"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
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
import { sourceLink } from "@/lib/analytics/source-links";
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
  const { t: tr } = usePreferences();
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [products, setProducts] = useState<string[]>([]),
    [baselineFrom, setBaselineFrom] = useState(""),
    [baselineTo, setBaselineTo] = useState(""),
    [contractType, setContractType] = useState(""),
    [compareContractType, setCompareContractType] = useState(""),
    [compareProduct, setCompareProduct] = useState(""),
    [report, setReport] = useState<Report | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [chartReady, setChartReady] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const chartMounted = useCallback(() => setChartReady(true), []);
  const { data: available, error: optionsError } = useResource<WorkspaceData>(
    "/api/analytics/explore",
  );
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has("from")) setFrom(p.get("from")!);
    if (p.has("to")) setTo(p.get("to")!);
    if (p.has("product")) setProducts(p.getAll("product").slice(0, 3));
    if (p.has("compareFrom")) setBaselineFrom(p.get("compareFrom")!);
    if (p.has("compareTo")) setBaselineTo(p.get("compareTo")!);
    if (p.has("contractType")) setContractType(p.get("contractType")!);
    if (p.has("compareContractType"))
      setCompareContractType(p.get("compareContractType")!);
    if (p.has("compareProduct")) setCompareProduct(p.get("compareProduct")!);
    setInteractive(true);
  }, []);
  async function generate(calculated = false) {
    setBusy(true);
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
            ...(contractType ? { contractType } : {}),
            ...(compareContractType ? { compareContractType } : {}),
            compareProducts: compareProduct ? [compareProduct] : [],
            ...(baselineFrom ? { compareFrom: baselineFrom } : {}),
            ...(baselineTo ? { compareTo: baselineTo } : {}),
          }),
          signal: AbortSignal.timeout(35000),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setChartReady(false);
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
          <h1>{tr("Reports")}</h1>
          <p>{tr("Choose a period. Generate a report. Save it as PDF.")}</p>
        </div>
        <Button
          variant="outline"
          disabled={!report || busy || !chartReady}
          onClick={() => window.print()}
        >
          <Printer />
          {tr(" Print / Save PDF ")}
        </Button>
      </div>
      <section className="panel report-controls no-print">
        {optionsError && (
          <p className="workspace-warning" role="status">
            {tr(" Commodity options are unavailable: ")}
            {tr(optionsError)}
            {tr(
              " You can still choose a narrow date range and generate a report. ",
            )}
          </p>
        )}
        <div className="workspace-filters">
          <label>
            {tr(" Report from ")}
            <Input
              type="date"
              disabled={!interactive}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            {tr(" Report to ")}
            <Input
              type="date"
              disabled={!interactive}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <fieldset className="commodity-picker">
          <legend>
            {tr(" Report commodities")}
            {tr(" ")}
            <span>
              {tr("Up to three; none includes all available records")}
            </span>
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
        <details className="report-options report-contract-controls no-print">
          <summary>
            {tr("Comparison and contract filters (optional)")}
            {[
              baselineFrom,
              baselineTo,
              contractType,
              compareProduct,
              compareContractType,
            ].some(Boolean) && (
              <span className="optional-active">{tr("Filters applied")}</span>
            )}
          </summary>
          <div className="workspace-filters">
            <label>
              {tr(" Compare from ")}
              <Input
                type="date"
                disabled={!interactive}
                value={baselineFrom}
                onChange={(e) => setBaselineFrom(e.target.value)}
              />
            </label>
            <label>
              {tr(" Compare to ")}
              <Input
                type="date"
                disabled={!interactive}
                value={baselineTo}
                onChange={(e) => setBaselineTo(e.target.value)}
              />
            </label>

            <label>
              {tr(" Report contract type ")}
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
              >
                <option value="">{tr("All types")}</option>
                {available?.options.contractTypes.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              {tr(" Baseline commodity ")}
              <select
                value={compareProduct}
                onChange={(e) => setCompareProduct(e.target.value)}
              >
                <option value="">{tr("Same commodities")}</option>
                {available?.options.products.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              {tr(" Baseline contract type ")}
              <select
                value={compareContractType}
                onChange={(e) => setCompareContractType(e.target.value)}
              >
                <option value="">{tr("Same contract types")}</option>
                {available?.options.contractTypes.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="filter-help">
            {tr(
              " Report comparisons use transaction counts. Values remain grouped by currency and reported quantities by unit. ",
            )}
          </p>
        </details>
        <div className="report-generate">
          <p>
            {tr(
              " Calculations and evidence are captured as one snapshot. AI commentary is clearly identified. ",
            )}
          </p>
          <Button disabled={busy || !interactive} onClick={() => generate()}>
            {busy ? <LoaderCircle className="spin" /> : <Sparkles />}
            {busy ? tr("Generating report…") : tr("Generate AI Report")}
          </Button>
        </div>
      </section>

      {error && (
        <div className="workspace-warning" role="alert">
          {tr(error)}
          {tr(" ")}
          <button className="text-link" onClick={() => generate()}>
            {tr(" Try again ")}
          </button>
          <button className="text-link" onClick={() => generate(true)}>
            {tr(" Generate calculated report ")}
          </button>
        </div>
      )}
      {!report && !busy && (
        <div className="report-empty">
          <FileText size={36} />
          <h2>{tr("A briefing built on evidence.")}</h2>
          <p>
            {tr(
              " Select a period and generate a report. Download it with your browser\u2019s Print / Save as PDF. ",
            )}
          </p>
          <span>
            {tr(
              "Coverage \u00B7 activity \u00B7 comparisons \u00B7 insights \u00B7 sources",
            )}
          </span>
        </div>
      )}
      {report && (
        <article className="analytics-report">
          <div className="report-title">
            <div>
              <span className="report-wordmark">{tr("UZEX INSIGHT AI")}</span>
              <h1>{tr("Commodity intelligence briefing")}</h1>
              <p>
                {tr(" Generated")}
                {tr(" ")}
                {new Date(report.snapshot.generatedAt).toLocaleString("en-GB", {
                  timeZone: "Asia/Tashkent",
                })}
                {tr(" ")}
                {tr(" UZT ")}
              </p>
            </div>
            <FileText size={30} />
          </div>
          <DataNotice
            mode={report.snapshot.mode}
            latest={report.snapshot.coverage.to}
          />
          <section>
            <h2>{tr("Executive summary")}</h2>
            <p>
              {tr(" This selection contains")}
              {tr(" ")}
              <strong>{number(report.snapshot.selectedCount)}</strong>
              {tr(" stored transaction records across")}
              {tr(" ")}
              <strong>{report.snapshot.summary.products.length}</strong>
              {tr(" ")}
              {tr(
                " commodity categories. It describes available source records and does not represent complete exchange activity. ",
              )}
            </p>
          </section>
          <section>
            <h2>{tr("Dataset coverage")}</h2>
            <p className="report-applied-filters">
              {tr(" Selected commodities:")}
              {tr(" ")}
              {report.snapshot.selection.products.join(", ") ||
                tr("All available commodities")}
              {tr(" ")}
              {tr(" \u00B7 Contract type:")}
              {tr(" ")}
              {report.snapshot.selection.contractType || tr("All types")}.
            </p>
            <dl className="report-coverage">
              <div>
                <dt>{tr("Dataset dates")}</dt>
                <dd>
                  {report.snapshot.coverage.from ?? tr("Unavailable")} →
                  {tr(" ")}
                  {report.snapshot.coverage.to ?? tr("Unavailable")}
                </dd>
              </div>
              <div>
                <dt>{tr("Selected period")}</dt>
                <dd>
                  {report.snapshot.selection.from || tr("All available dates")}{" "}
                  →{tr(" ")}
                  {report.snapshot.selection.to || tr("Latest available")}
                </dd>
              </div>
              <div>
                <dt>{tr("Source import observed")}</dt>
                <dd>
                  {report.snapshot.coverage.latestImport ?? tr("Unavailable")}
                </dd>
              </div>
              <div>
                <dt>{tr("Snapshot")}</dt>
                <dd>{report.snapshot.fingerprint.slice(0, 24)}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h2>{tr("Trading activity overview")}</h2>
            <div className="report-kpis">
              <div>
                <span>{tr("Stored records")}</span>
                <strong>{report.snapshot.selectedCount}</strong>
              </div>
              {Object.entries(report.snapshot.summary.values).map(
                ([currency, value]) => (
                  <div key={currency}>
                    <span>
                      {tr("Valid value \u00B7 ")}
                      {currency}
                    </span>
                    <strong>{number(value, true)}</strong>
                    <small>
                      {tr(" Exact: ")}
                      {value} {currency}
                    </small>
                  </div>
                ),
              )}
              {Object.entries(report.snapshot.summary.quantities).map(
                ([unit, value]) => (
                  <div key={unit}>
                    <span>
                      {tr("Quantity \u00B7 ")}
                      {unit}
                    </span>
                    <strong>{number(value, true)}</strong>
                    <small>
                      {tr(" Exact: ")}
                      {value} {unit}
                    </small>
                  </div>
                ),
              )}
            </div>
            <MarketSeries
              key={report.snapshot.generatedAt}
              data={report.snapshot}
              drill={false}
              onReady={chartMounted}
            />
          </section>
          <section>
            <h2>{tr("Commodity breakdown")}</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{tr("Commodity")}</th>
                    <th>{tr("Stored records")}</th>
                    <th>{tr("Source filters")}</th>
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
                          href={sourceLink(report.snapshot.selection, {
                            productName: p.name,
                          })}
                        >
                          {tr(" Inspect source ")}
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
            <h2>{tr("Period comparison")}</h2>
            {report.snapshot.comparison ? (
              <>
                <p>
                  {tr(" Selected count")}
                  {tr(" ")}
                  {report.snapshot.comparison.current.value ??
                    tr("unavailable")}
                  {tr(" \u00B7 baseline count")}
                  {tr(" ")}
                  {report.snapshot.comparison.baseline.value ??
                    tr("unavailable")}
                  {tr(" \u00B7 difference")}
                  {tr(" ")}
                  {report.snapshot.comparison.difference ?? tr("unavailable")}
                  {tr(" \u00B7 change")}
                  {tr(" ")}
                  {report.snapshot.comparison.percent === null
                    ? tr("unavailable")
                    : report.snapshot.comparison.percent + "%"}
                  .
                </p>
                <p className="muted">
                  {tr(" Baseline commodities:")}
                  {tr(" ")}
                  {report.snapshot.selection.compareProducts.join(", ") ||
                    report.snapshot.selection.products.join(", ") ||
                    tr("All available commodities")}
                  {tr(" ")}
                  {tr(" \u00B7 Baseline contract type:")}
                  {tr(" ")}
                  {report.snapshot.selection.compareContractType ||
                    report.snapshot.selection.contractType ||
                    tr("All types")}
                  {tr(" . Baseline:")}
                  {tr(" ")}
                  {report.snapshot.selection.compareFrom ?? tr("same start")} →
                  {tr(" ")}
                  {report.snapshot.selection.compareTo ?? tr("same end")}
                  {tr(". Missing observations remain unavailable. ")}
                </p>
              </>
            ) : (
              <p>
                {tr(
                  " No comparison period was selected. No market comparison has been inferred. ",
                )}
              </p>
            )}
          </section>
          <section>
            <h2>
              {report.commentary.mode === "gemini-guided"
                ? tr("Gemini-guided observations")
                : tr("Calculated observations")}
            </h2>
            {report.commentary.warning && (
              <p className="workspace-warning" role="status">
                {tr(report.commentary.warning)}
              </p>
            )}
            {report.snapshot.facts.map((f) => (
              <div className="report-fact" key={f.id}>
                <p>
                  <strong>{tr("Verified calculation:")}</strong>{" "}
                  {tr(f.statement)}
                </p>
                {report.commentary.items
                  .filter((item) => item.factId === f.id)
                  .map((item, i) => (
                    <p key={i}>
                      <strong>
                        {report.commentary.mode === "gemini-guided"
                          ? tr("AI-selected interpretation")
                          : tr("Deterministic context")}
                        :
                      </strong>
                      {tr(" ")}
                      {tr(item.text)}
                    </p>
                  ))}
                <small>
                  {tr(" Metric ")}
                  {f.value}
                  {tr("; baseline ")}
                  {f.baseline}; {f.coverage.records}
                  {tr(" ")}
                  {tr(" records. Filters")}
                  {tr(" ")}
                  {Object.entries(f.filters)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                  .
                </small>
              </div>
            ))}
          </section>
          <section>
            <h2>{tr("Source references")}</h2>
            <p>
              {tr(" First ")}
              {report.snapshot.rows.length}
              {tr(" matching records of")}
              {tr(" ")}
              {report.snapshot.selectedCount}
              {tr(
                ". Full filtered records remain available in Trade Explorer. ",
              )}
            </p>
            <TradeTable rows={report.snapshot.rows} compact />
            <div className="report-source-list">
              {report.snapshot.rows.map((t) => (
                <div key={t.id}>
                  {t.id} · {t.external_id ?? tr("No external ID")} ·{" "}
                  {t.data_source}
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2>{tr("Data limitations")}</h2>
            <ul>
              {[
                ...report.snapshot.warnings,
                ...(report.snapshot.comparison?.warnings ?? []),
                `Excluded from valid-value calculation: ${report.snapshot.summary.excluded} records with unknown currency or incompatible price basis.`,
                "No currency or quantity-unit conversion is performed. Pending records are activity, not settled cash flows.",
                "Observations are not financial advice or evidence of wrongdoing.",
              ].map((w) => (
                <li key={w}>{tr(w)}</li>
              ))}
            </ul>
          </section>
          <div className="report-footer">
            {tr(" UZEX Insight AI \u00B7 Source snapshot ")}
            {report.snapshot.fingerprint}
          </div>
        </article>
      )}
    </>
  );
}
