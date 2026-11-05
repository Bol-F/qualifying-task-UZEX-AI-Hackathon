"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
import { SearchX, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
export function Loading() {
  const { t: tr } = usePreferences();
  return (
    <div aria-label={tr("Loading data")} className="loading-grid">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-36 w-full" />
      ))}
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  const { t: tr } = usePreferences();
  return (
    <div className="empty-state" role="alert">
      <AlertCircle />
      <h3>{tr("Couldn\u2019t load the data")}</h3>
      <p>{tr(message)}</p>
      <Button variant="outline" onClick={retry}>
        {tr(" Try again ")}
      </Button>
    </div>
  );
}
export function EmptyState() {
  const { t: tr } = usePreferences();
  return (
    <div className="empty-state">
      <SearchX />
      <h3>{tr("No matching transactions")}</h3>
      <p>{tr("Try a different commodity or a wider date range.")}</p>
    </div>
  );
}
