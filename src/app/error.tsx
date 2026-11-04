"use client";
import { ErrorState } from "@/components/layout/resource-state";
export default function Error({ reset }: { reset: () => void }) {
  return <ErrorState message="An unexpected error occurred." retry={reset} />;
}
