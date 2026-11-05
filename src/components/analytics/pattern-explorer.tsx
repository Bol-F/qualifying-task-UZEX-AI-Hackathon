import Link from "next/link";
import { ScanLine, ArrowUpRight } from "lucide-react";
import type { WorkspaceData } from "@/lib/analytics/service";
import { sourceLink } from "@/lib/analytics/source-links";
export function PatternExplorer({ data }: { data: WorkspaceData }) {
  return (
    <section className="panel pattern-explorer">
      <div className="panel-heading">
        <div>
          <h2>
            <ScanLine size={17} className="mint" />
            Trade Pattern Explorer <span className="ai-chip">EXPERIMENTAL</span>
          </h2>
          <p>
            Transparent checks across {data.patterns.checkedRecords} selected
            records
          </p>
        </div>
        <strong className="pattern-count">
          {data.patterns.findings.length}
        </strong>
      </div>
      <details className="method-details">
        <summary>View statistical methods and thresholds</summary>
        <ul>
          {data.patterns.methods.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </details>
      {data.patterns.findings.length ? (
        data.patterns.findings.map((f) => (
          <article className="pattern-row" key={f.id}>
            <small>{f.type}</small>
            <h3>{f.title}</h3>
            <p>{f.reason}</p>
            <p className="muted">{f.method}</p>
            <div className="pattern-links">
              <Link href={sourceLink(data.selection, f.filters)}>
                Inspect matching records
                <ArrowUpRight size={12} />
              </Link>
              {f.recordIds.slice(0, 3).map((id) => (
                <Link key={id} href={"/trades?id=" + encodeURIComponent(id)}>
                  {id}
                </Link>
              ))}
            </div>
          </article>
        ))
      ) : (
        <div className="pattern-empty">
          <ScanLine />
          <h3>No observations flagged under these thresholds</h3>
          <p>
            The selected records did not trigger the defined checks. This is not
            a guarantee of completeness or data quality.
          </p>
        </div>
      )}
      {data.patterns.limited && (
        <p className="workspace-warning">
          Only the first 50 findings are shown. Narrow the selection.
        </p>
      )}
      <p className="panel-footnote">
        These are statistical observations and data-quality warnings, not
        findings of fraud or manipulation.
      </p>
    </section>
  );
}
