import { SearchX, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
export function Loading() {
  return (
    <div aria-label="Loading data" className="loading-grid">
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
  return (
    <div className="empty-state" role="alert">
      <AlertCircle />
      <h3>Couldn’t load the data</h3>
      <p>{message}</p>
      <Button variant="outline" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
export function EmptyState() {
  return (
    <div className="empty-state">
      <SearchX />
      <h3>No matching transactions</h3>
      <p>Try a different commodity or a wider date range.</p>
    </div>
  );
}
