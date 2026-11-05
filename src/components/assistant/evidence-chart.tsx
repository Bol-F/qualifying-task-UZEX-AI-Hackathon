"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { chartCsv, downloadCsv } from "@/lib/utils/csv";
import type { QueryScope } from "@/lib/ai/contracts";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { chartSchema, type AgentAnswer } from "@/lib/ai/contracts";
import { number } from "@/lib/utils";
const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];
export function EvidenceChart({
  chart,
  filters = {},
}: {
  chart: NonNullable<AgentAnswer["chart"]>;
  filters?: QueryScope;
}) {
  const { t: tr } = usePreferences();
  const [chosenType, setChosenType] = useState<string | null>(null);
  const parsed = chartSchema.safeParse(chart);
  if (!parsed.success) return null;
  const spec = { ...parsed.data, type: chosenType ?? parsed.data.type };
  const canDonut =
    spec.points.length <= 12 &&
    spec.points.every((p) => p.value !== null && Number(p.value) >= 0);
  const sourceLink = (label: string) => {
    const dates = label.match(/\d{4}-\d{2}-\d{2}/g);
    return (
      "/trades?" +
      new URLSearchParams({
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {}),
        ...(filters.search ? { search: filters.search } : {}),
        ...(dates ? { from: dates[0], to: dates.at(-1)! } : { search: label }),
        ...(filters.currency ? { currency: filters.currency } : {}),
        ...(filters.unit ? { unit: filters.unit } : {}),
      })
    );
  };
  const data = spec.points.map((p) => ({
    label: p.label,
    value: p.value === null ? null : Number(p.value),
  }));
  const tooltip = (
    <Tooltip
      contentStyle={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
      }}
      formatter={(v) => [number(String(v)), tr(spec.unit)]}
    />
  );
  const axes = (
    <>
      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
        minTickGap={30}
      />
      <YAxis
        allowDecimals={spec.unit !== "transactions" && spec.unit !== "days"}
        tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
        width={60}
        tickFormatter={(v) => number(v, true)}
      />
      {tooltip}
    </>
  );
  return (
    <figure
      className="evidence-chart"
      aria-label={tr(`${spec.title} · ${tr(spec.unit)}`)}
    >
      <figcaption>
        {tr(spec.title)}
        <span>
          {tr(spec.unit)}
          {tr(" \u00B7 deterministic calculation")}
        </span>
      </figcaption>
      <div className="chart-actions">
        <label>
          {tr(" Chart type ")}
          <select
            aria-label={tr("Chart type")}
            value={spec.type}
            onChange={(e) => setChosenType(e.target.value)}
          >
            <option value="line">{tr("Line")}</option>
            <option value="bar">{tr("Bar")}</option>
            <option value="area">{tr("Area")}</option>
            {canDonut && <option value="donut">{tr("Donut")}</option>}
          </select>
        </label>
        <button
          onClick={() =>
            downloadCsv(chartCsv(spec.points, spec.unit), "uzex-chart.csv")
          }
        >
          <Download size={13} />
          {tr(" Download chart CSV ")}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={230}>
        {spec.type === "donut" ? (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={55}
              outerRadius={85}
              isAnimationActive={false}
            >
              {data.map((p, i) => (
                <Cell key={p.label} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            {tooltip}
          </PieChart>
        ) : spec.type === "bar" ? (
          <BarChart data={data}>
            {axes}
            <Bar
              dataKey="value"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        ) : spec.type === "area" ? (
          <AreaChart data={data}>
            {axes}
            <Area
              type="monotone"
              dataKey="value"
              fill="var(--chart-1)"
              fillOpacity={0.12}
              stroke="var(--chart-1)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            {axes}
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={data.length < 12}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
      <details>
        <summary>
          {tr(" Underlying aggregate data \u00B7 ")}
          {spec.points.length}
          {tr(" points ")}
        </summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{tr("Period / commodity")}</th>
                <th className="numeric">{tr(spec.unit)}</th>
                <th>{tr("Source")}</th>
              </tr>
            </thead>
            <tbody>
              {spec.points.map((p) => (
                <tr key={p.label}>
                  <td>{tr(p.label)}</td>
                  <td className="numeric">{p.value ?? tr("Unavailable")}</td>
                  <td>
                    {p.value !== null && (
                      <Link className="text-link" href={sourceLink(p.label)}>
                        {tr(" Source trades ")}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
