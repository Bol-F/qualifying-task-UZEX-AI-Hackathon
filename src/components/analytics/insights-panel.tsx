"use client";
import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowUpRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkspaceData } from "@/lib/analytics/service";
import type { explainFacts } from "@/lib/ai/report-explanations";
type Commentary = Awaited<ReturnType<typeof explainFacts>>;
export function InsightsPanel({ data }: { data: WorkspaceData }) {
  const [result, setResult] = useState<{
      snapshot: WorkspaceData;
      commentary: Commentary;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const view = result?.snapshot ?? data;
  async function explain() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.selection),
        signal: AbortSignal.timeout(35000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Explanation unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel insights-workspace">
      <div className="panel-heading">
        <div>
          <h2>
            <Sparkles size={17} className="mint" />
            AI Insights
          </h2>
          <p>Calculated facts first. Gemini can explain their context.</p>
        </div>
        <Button variant="outline" size="sm" onClick={explain} disabled={busy}>
          {busy ? <LoaderCircle className="spin" /> : <Sparkles />}Explain
          calculated facts
        </Button>
      </div>
      {view.facts.length ? (
        view.facts.map((f) => (
          <article className="fact-row" key={f.id}>
            <span className="ai-chip">CALCULATED OBSERVATION</span>
            <p>{f.statement}</p>
            {result?.commentary.items
              .filter((i) => i.factId === f.id)
              .map((item, i) => (
                <p className="fact-explanation" key={i}>
                  {item.text}
                </p>
              ))}
            <div className="fact-evidence">
              <span>
                Metric {f.value} · baseline {f.baseline} {f.unit}
              </span>
              <span>
                Coverage {f.coverage.from} → {f.coverage.to} ·{" "}
                {f.coverage.records} records
              </span>
              <Link
                href={
                  "/trades?" +
                  new URLSearchParams({
                    ...(data.selection.from
                      ? { from: data.selection.from }
                      : {}),
                    ...(data.selection.to ? { to: data.selection.to } : {}),
                    ...f.filters,
                  })
                }
              >
                Inspect supporting trades
                <ArrowUpRight size={12} />
              </Link>
            </div>
          </article>
        ))
      ) : (
        <div className="empty-source">
          No observations can be supported by this selection.
        </div>
      )}
      {result && (
        <p
          className="workspace-warning"
          role={result.commentary.warning ? "status" : undefined}
        >
          {result.commentary.warning ??
            "Gemini selected the explanatory framing. All figures remain calculated from records."}
        </p>
      )}
      {error && (
        <p className="workspace-warning" role="alert">
          {error}
        </p>
      )}
      <p className="panel-footnote">
        Dataset observations describe available records and are not independent
        financial advice.
      </p>
    </section>
  );
}
