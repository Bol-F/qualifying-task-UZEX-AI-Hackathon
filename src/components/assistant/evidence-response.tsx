"use client";
import dynamic from "next/dynamic";
import { Copy, Database, ExternalLink, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { TradeTable } from "@/components/trades/trade-table";
import type { AgentAnswer } from "@/lib/ai/contracts";
import { number } from "@/lib/utils";
const EvidenceChart = dynamic(
  () => import("./evidence-chart").then((m) => m.EvidenceChart),
  { ssr: false, loading: () => <p className="muted">Loading chart…</p> },
);
export function EvidenceResponse({ answer }: { answer: AgentAnswer }) {
  return (
    <div className="evidence-response">
      <div className="evidence-toolbar">
        <span>
          <ShieldCheck size={13} />
          Evidence mode ·{" "}
          {answer.evidence.every((e) => e.knowledge)
            ? "Approved knowledge collection"
            : answer.evidence[0]?.mode === "demo"
              ? "Synthetic records"
              : "Imported records"}
        </span>
        <button
          aria-label="Copy answer"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                [
                  answer.text,
                  ...answer.evidence.flatMap((e) =>
                    e.metrics.map((m) => `${m.label}: ${m.value} ${m.unit}`),
                  ),
                ].join("\n"),
              );
              toast.success("Answer copied");
            } catch {
              toast.error("Unable to copy answer");
            }
          }}
        >
          <Copy size={13} />
          Copy
        </button>
      </div>
      {answer.evidence.map((e) => (
        <section className="evidence-block" key={e.id}>
          <h4>{e.title}</h4>
          {e.metrics.length > 0 && (
            <div className="answer-metrics">
              {e.metrics.map((m, i) => (
                <div key={i}>
                  <span>{m.label}</span>
                  <strong title={m.value ?? "Unavailable"}>
                    {m.value === null ? "Unavailable" : number(m.value, true)}
                    <small>{m.unit}</small>
                  </strong>
                  <details>
                    <summary>Exact value</summary>
                    <code>
                      {m.value} {m.unit}
                    </code>
                  </details>
                </div>
              ))}
            </div>
          )}
          <div className="applied-filters">
            <span>Applied filters</span>
            {Object.entries(e.filters).length ? (
              Object.entries(e.filters).map(([k, v]) => (
                <span key={k}>
                  {k}: <strong>{String(v)}</strong>
                </span>
              ))
            ) : (
              <span>All available records</span>
            )}
          </div>
          <div className="coverage-line">
            {e.selection &&
              Object.entries(e.selection).map(([key, value]) => (
                <span key={key}>
                  {key}: {value}{" "}
                </span>
              ))}
          </div>
          {e.periods?.map((period, i) => (
            <div className="coverage-line" key={i}>
              Period {i === 0 ? "A" : "B"}: {period.from} → {period.to}
            </div>
          ))}
          <div className="coverage-line">
            <Clock size={12} />
            <span>
              Dataset: {e.coverage.from ?? "no records"} →{" "}
              {e.coverage.to ?? "no records"} · {number(e.coverage.total)}{" "}
              stored records
            </span>
          </div>
          {e.coverage.latestImport && (
            <div className="coverage-line">
              Latest observed source import:{" "}
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
                  {s.title}
                  <ExternalLink size={12} />
                  <small>Reviewed {s.checkedAt}</small>
                </a>
              ))}
            </div>
          )}
          <details className="source-details">
            <summary>
              <Database size={13} />
              Supporting records · {e.rows.length} shown / {e.matchedRecords}{" "}
              matched
            </summary>
            {e.rows.length > 0 ? (
              <TradeTable rows={e.rows} compact />
            ) : (
              <p className="empty-source">
                {e.knowledge
                  ? "This explanation uses the approved knowledge collection."
                  : "No source records match these constraints."}
              </p>
            )}
            <div className="source-metadata">
              <span>Calculation: {e.fingerprint.slice(0, 16)}</span>
              <span>Evidence: {e.id}</span>
              <span>Source IDs: {e.recordIds.join(", ") || "none"}</span>
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
          <p key={w}>{w}</p>
        ))}
      </div>
      <p className="interpretation-label">
        Values and comparisons are calculated from matched source records.
        Charts use the same verified aggregates.
      </p>
    </div>
  );
}
