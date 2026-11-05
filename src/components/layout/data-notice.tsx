"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
import { FlaskConical, Database } from "lucide-react";
export function DataNotice({
  mode = "unknown",
  latest,
}: {
  mode?: string;
  latest?: string | null;
}) {
  const { t: tr, formatDate } = usePreferences();
  if (mode === "unknown")
    return (
      <div className="data-notice">
        <Database size={15} />
        <strong>{tr("DATA SOURCE")}</strong>
        <span>{tr("Waiting for verified source information.")}</span>
      </div>
    );
  return (
    <div className={`data-notice ${mode === "live" ? "live" : ""}`}>
      {mode === "demo" ? <FlaskConical size={15} /> : <Database size={15} />}
      <strong>
        {mode === "demo" ? tr("DEMO DATA MODE") : tr("IMPORTED DATA")}
      </strong>
      <span>
        {mode === "demo"
          ? tr(
              "Synthetic records for demonstration. These are not real UZEX transactions.",
            )
          : tr(
              "Analytics reflect your imported records, not a live exchange feed.",
            )}
      </span>
      {latest && (
        <small>
          {tr("Latest record: ")}
          {formatDate(latest)}
        </small>
      )}
    </div>
  );
}
