"use client";
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
  const [visible, setVisible] = useState(false);
  useEffect(
    () => setVisible(localStorage.getItem("uzex-demo-dismissed") !== "yes"),
    [],
  );
  if (!visible)
    return (
      <button className="reopen-demo" onClick={() => setVisible(true)}>
        Show guided demo
        <ArrowUpRight size={12} />
      </button>
    );
  return (
    <section className="guided-demo">
      <div className="guided-heading">
        <div>
          <h2>Your first insight starts here.</h2>
          <p>
            {mode === "demo"
              ? "Explore a clearly labeled synthetic dataset."
              : "Explore your imported source records."}{" "}
            {demo.date
              ? `This walkthrough uses available records from ${demo.date}.`
              : "No stored records are currently available."}
          </p>
        </div>
        <button
          aria-label="Dismiss guided demo"
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
              <strong>{item.label}</strong>
              <small>{item.caption}</small>
            </div>
            <ArrowUpRight size={15} />
          </Link>
        ))}
      </div>
      <div className="judge-question">
        <span>JUDGE WALKTHROUGH</span>
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
