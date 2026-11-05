"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
import dynamic from "next/dynamic";
import { Copy, Database, ExternalLink, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { TradeTable } from "@/components/trades/trade-table";
import type { AgentAnswer } from "@/lib/ai/contracts";
import { number } from "@/lib/utils";
import { fieldLabel } from "@/lib/i18n/field-labels";
function ChartLoading() {
  const { t } = usePreferences();
  return <p className="muted">{t("Loading chart…")}</p>;
}
const EvidenceChart = dynamic(
  () => import("./evidence-chart").then((m) => m.EvidenceChart),
  { ssr: false, loading: ChartLoading },
);
export function EvidenceResponse({ answer }: { answer: AgentAnswer }) {
  const { t: tr } = usePreferences();
  return (
    <div className="evidence-response">
      <div className="evidence-toolbar">
        <span>
          <ShieldCheck size={13} />
          {tr(" Evidence mode \u00B7")}
          {tr(" ")}
          {answer.evidence.every((e) => e.knowledge)
            ? tr("Approved knowledge collection")
            : answer.evidence[0]?.mode === "demo"
              ? tr("Synthetic records")
              : tr("Imported records")}
        </span>
        <button
          aria-label={tr("Copy answer")}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                [
                  answer.text,
                  ...answer.evidence.flatMap((e) =>
                    e.metrics.map(
                      (m) => `${m.label}: ${m.value} ${tr(m.unit)}`,
                    ),
                  ),
                ].join("\n"),
              );
              toast.success(tr("Answer copied"));
            } catch {
              toast.error(tr("Unable to copy answer"));
            }
          }}
        >
          <Copy size={13} />
          {tr(" Copy ")}
        </button>
      </div>
      {answer.evidence.map((e) => (
        <section className="evidence-block" key={e.id}>
          <h4>{tr(e.title)}</h4>
          {e.metrics.length > 0 && (
            <div className="answer-metrics">
              {e.metrics.map((m, i) => (
                <div key={i}>
                  <span>{tr(m.label)}</span>
                  <strong title={m.value ?? tr("Unavailable")}>
                    {m.value === null
                      ? tr("Unavailable")
                      : number(m.value, true)}
                    <small>{tr(m.unit)}</small>
                  </strong>
                  <details>
                    <summary>{tr("Exact value")}</summary>
                    <code>
                      {m.value} {tr(m.unit)}
                    </code>
                  </details>
                </div>
              ))}
            </div>
          )}
          <div className="applied-filters">
            <span>{tr("Applied filters")}</span>
            {Object.entries(e.filters).length ? (
              Object.entries(e.filters).map(([k, v]) => (
                <span key={k}>
                  {tr(fieldLabel(k))}: <strong>{String(v)}</strong>
                </span>
              ))
            ) : (
              <span>{tr("All available records")}</span>
            )}
          </div>
          <div className="coverage-line">
            {e.selection &&
              Object.entries(e.selection).map(([key, value]) => (
                <span key={key}>
                  {tr(fieldLabel(key))}: {value}
                  {tr(" ")}
                </span>
              ))}
          </div>
          {e.periods?.map((period, i) => (
            <div className="coverage-line" key={i}>
              {tr(" Period ")}
              {i === 0 ? tr("A") : tr("B")}: {period.from} → {period.to}
            </div>
          ))}
          <div className="coverage-line">
            <Clock size={12} />
            <span>
              {tr(" Dataset: ")}
              {e.coverage.from ?? tr("no records")} →{tr(" ")}
              {e.coverage.to ?? tr("no records")} · {number(e.coverage.total)}
              {tr(" ")}
              {tr(" stored records ")}
            </span>
          </div>
          {e.coverage.latestImport && (
            <div className="coverage-line">
              {tr(" Latest observed source import:")}
              {tr(" ")}
              {e.coverage.latestImport.slice(0, 10)}
            </div>
          )}
          {e.knowledge && (
            <div className="knowledge-sources">
              <p>{e.knowledge.scope}</p>
              {e.knowledge.sources.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tr(s.title)}
                  <ExternalLink size={12} />
                  <small>
                    {tr("Reviewed ")}
                    {s.checkedAt}
                  </small>
                </a>
              ))}
            </div>
          )}
          <details className="source-details">
            <summary>
              <Database size={13} />
              {tr(" Supporting records \u00B7 ")}
              {e.rows.length}
              {tr(" shown / ")}
              {e.matchedRecords}
              {tr(" ")}
              {tr(" matched ")}
            </summary>
            {e.rows.length > 0 ? (
              <TradeTable rows={e.rows} compact />
            ) : (
              <p className="empty-source">
                {e.knowledge
                  ? tr(
                      "This explanation uses the approved knowledge collection.",
                    )
                  : tr("No source records match these constraints.")}
              </p>
            )}
            <div className="source-metadata">
              <span>
                {tr("Calculation: ")}
                {e.fingerprint.slice(0, 16)}
              </span>
              <span>
                {tr("Evidence: ")}
                {e.id}
              </span>
              <span>
                {tr("Source IDs: ")}
                {e.recordIds.join(", ") || tr("none")}
              </span>
            </div>
          </details>
        </section>
      ))}
      {answer.chart && (
        <EvidenceChart
          chart={answer.chart}
          filters={
            answer.evidence.find((e) => e.id === answer.chart?.evidenceId)
              ?.filters
          }
        />
      )}
      <div className="answer-warnings">
        {answer.warnings.map((w) => (
          <p key={w}>{tr(w)}</p>
        ))}
      </div>
      <p className="interpretation-label">
        {tr(
          " Values and comparisons are calculated from matched source records. Charts use the same verified aggregates. ",
        )}
      </p>
    </div>
  );
}
