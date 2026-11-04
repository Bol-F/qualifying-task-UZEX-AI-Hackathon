import { FlaskConical, Database } from "lucide-react";
export function DataNotice({
  mode = "unknown",
  latest,
}: {
  mode?: string;
  latest?: string | null;
}) {
  if (mode === "unknown")
    return (
      <div className="data-notice">
        <Database size={15} />
        <strong>DATA SOURCE</strong>
        <span>Waiting for verified source information.</span>
      </div>
    );
  return (
    <div className={`data-notice ${mode === "live" ? "live" : ""}`}>
      {mode === "demo" ? <FlaskConical size={15} /> : <Database size={15} />}
      <strong>{mode === "demo" ? "DEMO DATA MODE" : "IMPORTED DATA"}</strong>
      <span>
        {mode === "demo"
          ? "Synthetic records for demonstration. These are not real UZEX transactions."
          : "Analytics reflect your imported records, not a live exchange feed."}
      </span>
      {latest && <small>Latest record: {latest}</small>}
    </div>
  );
}
