"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowUpRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkspaceData } from "@/lib/analytics/service";
import type { explainFacts } from "@/lib/ai/report-explanations";
import { sourceLink } from "@/lib/analytics/source-links";
type Commentary = Awaited<ReturnType<typeof explainFacts>>;
export function InsightsPanel({ data }: { data: WorkspaceData }) {
  const { t: tr } = usePreferences();
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
            {tr(" AI Insights ")}
          </h2>
          <p>
            {tr("Calculated facts first. Gemini can explain their context.")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={explain} disabled={busy}>
          {busy ? <LoaderCircle className="spin" /> : <Sparkles />}
          {tr("Explain calculated facts ")}
        </Button>
      </div>
      {view.facts.length ? (
        view.facts.map((f) => (
          <article className="fact-row" key={f.id}>
            <span className="ai-chip">{tr("CALCULATED OBSERVATION")}</span>
            <p>{tr(f.statement)}</p>
            {result?.commentary.items
              .filter((i) => i.factId === f.id)
              .map((item, i) => (
                <p className="fact-explanation" key={i}>
                  {tr(item.text)}
                </p>
              ))}
            <div className="fact-evidence">
              <span>
                {tr(" Metric ")}
                {f.value}
                {tr(" \u00B7 baseline ")}
                {f.baseline} {f.unit}
              </span>
              <span>
                {tr(" Coverage ")}
                {f.coverage.from} → {f.coverage.to} ·{tr(" ")}
                {f.coverage.records}
                {tr(" records ")}
              </span>
              <Link href={sourceLink(view.selection, f.filters)}>
                {tr(" Inspect supporting trades ")}
                <ArrowUpRight size={12} />
              </Link>
            </div>
          </article>
        ))
      ) : (
        <div className="empty-source">
          {tr(" No observations can be supported by this selection. ")}
        </div>
      )}
      {result && (
        <p
          className="workspace-warning"
          role={result.commentary.warning ? "status" : undefined}
        >
          {result.commentary.warning
            ? tr(result.commentary.warning)
            : tr(
                "Gemini selected the explanatory framing. All figures remain calculated from records.",
              )}
        </p>
      )}
      {error && (
        <p className="workspace-warning" role="alert">
          {tr(error)}
        </p>
      )}
      <p className="panel-footnote">
        {tr(
          " Dataset observations describe available records and are not independent financial advice. ",
        )}
      </p>
    </section>
  );
}
