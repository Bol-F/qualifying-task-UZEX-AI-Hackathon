"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  X,
  ArrowLeftRight,
  Sparkles,
  ChartNoAxesCombined,
} from "lucide-react";
import type { demoQuestions } from "@/lib/analytics/demo";
export function GuidedDemo({
  demo,
  mode,
}: {
  demo: ReturnType<typeof demoQuestions>;
  mode: string;
}) {
  const { t: tr } = usePreferences();
  const [visible, setVisible] = useState(false);
  useEffect(
    () => setVisible(localStorage.getItem("uzex-demo-dismissed") !== "yes"),
    [],
  );
  if (!visible)
    return (
      <button className="reopen-demo" onClick={() => setVisible(true)}>
        {tr(" Show guided demo ")}
        <ArrowUpRight size={12} />
      </button>
    );
  return (
    <section className="guided-demo">
      <div className="guided-heading">
        <div>
          <h2>{tr("Your first insight starts here.")}</h2>
          <p>
            {tr(
              " UZEX Insight AI turns exchange records into searchable analytics, bilingual answers and source-backed reports. ",
            )}
          </p>
          <p>
            {mode === "demo"
              ? tr("Explore a clearly labeled synthetic dataset.")
              : tr("Explore your imported source records.")}
            {tr(" ")}
            {demo.date
              ? tr("This walkthrough uses records from {date}.", {
                  date: demo.date,
                })
              : tr("No stored records are currently available.")}
          </p>
        </div>
        <button
          aria-label={tr("Dismiss guided demo")}
          onClick={() => {
            setVisible(false);
            localStorage.setItem("uzex-demo-dismissed", "yes");
          }}
        >
          <X size={16} />
        </button>
      </div>
      <div className="guided-actions">
        {[
          {
            label: "Explore exchange transactions",
            caption: "Search, filter and inspect the source.",
            href: "/trades",
            icon: ArrowLeftRight,
          },
          {
            label: "Ask AI a question in Uzbek",
            caption: "Start with an evidence-backed answer.",
            href: "/assistant?question=" + encodeURIComponent(demo.uzbek),
            icon: Sparkles,
          },
          {
            label: "Generate an analytics chart",
            caption: "Visualize the most active commodities.",
            href: "/assistant?question=" + encodeURIComponent(demo.chart),
            icon: ChartNoAxesCombined,
          },
        ].map((item, i) => (
          <Link key={item.label} href={item.href}>
            <span className="guided-number">0{i + 1}</span>
            <item.icon size={17} />
            <div>
              <strong>{tr(item.label)}</strong>
              <small>{tr(item.caption)}</small>
            </div>
            <ArrowUpRight size={15} />
          </Link>
        ))}
      </div>
      <div className="judge-question">
        <span>{tr("JUDGE WALKTHROUGH")}</span>
        <Link
          href={"/assistant?question=" + encodeURIComponent(demo.questions[0])}
        >
          {demo.questions[0]}
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </section>
  );
}
