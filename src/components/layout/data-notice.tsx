"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
import { FlaskConical, Database } from "lucide-react";
import { useResource } from "@/hooks/use-resource";
import type { RegistryManifest } from "@/lib/registry/database";
function RegistryNotice() {
  const { t: tr } = usePreferences();
  const { data, error } = useResource<RegistryManifest>("/api/dataset");
  return (
    <details className="registry-notice">
      <summary>{tr("Dataset completeness and source files")}</summary>
      {error ? (
        <p role="alert">{tr(error)}</p>
      ) : !data ? (
        <p>{tr("Loading…")}</p>
      ) : (
        <>
          <p>
            {tr(
              "{count} synthetic records loaded. Expected complete dataset: 500,000.",
              { count: data.total.toLocaleString() },
            )}
          </p>
          {data.missingYears.length > 0 && (
            <p>
              {tr(
                "Missing source years: {years}. Missing data does not mean zero trading.",
                { years: data.missingYears.join(", ") },
              )}
            </p>
          )}
          {data.missingBrokers && (
            <p>
              {tr(
                "Broker directory is missing. Original broker codes are retained; names are unavailable.",
              )}
            </p>
          )}
          <p>
            {tr(
              "Files are identified by their columns because supplied filenames do not match their contents.",
            )}
          </p>
          <ul>
            {data.files.map((file) => (
              <li key={file.name}>
                {file.name} → {tr(file.kind)} · {file.rows.toLocaleString()}
              </li>
            ))}
          </ul>
        </>
      )}
    </details>
  );
}
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
    <>
      <div className={`data-notice ${mode === "live" ? "live" : ""}`}>
        {mode === "demo" ? <FlaskConical size={15} /> : <Database size={15} />}
        <strong>
          {mode === "local"
            ? tr("SYNTHETIC CSV DATA")
            : mode === "demo"
              ? tr("DEMO DATA MODE")
              : tr("IMPORTED DATA")}
        </strong>
        <span>
          {mode === "demo" || mode === "local"
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
      {mode === "local" && <RegistryNotice />}
    </>
  );
}
