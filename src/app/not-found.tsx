"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
import Link from "next/link";
export default function NotFound() {
  const { t: tr } = usePreferences();
  return (
    <div className="empty-state">
      <h1>{tr("Page not found")}</h1>
      <Link href="/dashboard">{tr("Return to overview")}</Link>
    </div>
  );
}
