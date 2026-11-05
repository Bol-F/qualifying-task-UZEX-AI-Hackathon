"use client";
import { useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { useRouter } from "next/navigation";
import type { WorkspaceData } from "@/lib/analytics/service";
import { number } from "@/lib/utils";
const colors = ["#15d6a0", "#3b82f6", "#a78bfa"];
export function ComparisonBars({ data }: { data: WorkspaceData }) {
  const view = data.comparison;
  if (!view) return null;
  const points = [
    {
      name: "Baseline",
      value: view.baseline.value === null ? null : Number(view.baseline.value),
    },
    {
      name: "Selected",
      value: view.current.value === null ? null : Number(view.current.value),
    },
  ];
  return (
    <div aria-label="Selection and baseline comparison chart">
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={points} margin={{ left: 20, right: 20 }}>
          <CartesianGrid vertical={false} stroke="#233046" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            allowDecimals={data.selection.metric !== "count"}
            tickFormatter={(v) => number(v, true)}
          />
          <Tooltip
            contentStyle={{
              background: "#17243a",
              border: "1px solid #304058",
            }}
          />
          <Bar
            dataKey="value"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function MarketSeries({
  data,
  drill = true,
  onReady,
}: {
  data: WorkspaceData;
  drill?: boolean;
  onReady?: () => void;
}) {
  useEffect(() => {
    let second = 0;
    const frame = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => onReady?.());
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(second);
    };
  }, [data.fingerprint, onReady]);
  const router = useRouter();
  if (
    !data.selectedCount ||
    data.series.every((series) =>
      series.points.every((point) => point.value === null),
    )
  )
    return (
      <div className="pattern-empty">
        <h3>No chart observations available</h3>
        <p>Unavailable observations are not plotted as zero.</p>
      </div>
    );
  const dates = [
    ...new Set(data.series.flatMap((s) => s.points.map((p) => p.label))),
  ].sort();
  const points = dates.map((date) =>
    Object.fromEntries([
      ["date", date],
      ...data.series.map((s, i) => [
        `series${i}`,
        s.points.find((p) => p.label === date)?.value ?? null,
      ]),
    ]),
  );
  return (
    <div className="market-series" aria-label="Commodity comparison chart">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={points}
          margin={{ top: 15, right: 18, bottom: 5, left: 8 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#233046"
            strokeDasharray="3 4"
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            minTickGap={30}
          />
          <YAxis
            allowDecimals={data.selection.metric !== "count"}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(v) => number(v, true)}
            width={58}
          />
          <Tooltip
            contentStyle={{
              background: "#17243a",
              border: "1px solid #304058",
              borderRadius: 8,
            }}
            formatter={(value, name) => [
              value === null ? "Unavailable" : number(String(value)),
              name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} />
          {data.series.map((series, i) => (
            <Line
              key={series.name}
              dataKey={`series${i}`}
              name={series.name}
              stroke={colors[i]}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
              dot={{ r: 2, strokeWidth: 0, fill: colors[i] }}
              activeDot={{
                r: 6,
                onClick: (_event: unknown, payload: unknown) => {
                  const point = payload as { payload?: { date?: string } };
                  if (drill && point.payload?.date) {
                    const p = new URLSearchParams({
                      productName: series.name,
                      from: point.payload.date,
                      to: point.payload.date,
                      ...(data.selection.currency
                        ? { currency: data.selection.currency }
                        : {}),
                      ...(data.selection.unit
                        ? { unit: data.selection.unit }
                        : {}),
                      ...(data.selection.contractType
                        ? { contractType: data.selection.contractType }
                        : {}),
                    });
                    router.push("/trades?" + p);
                  }
                },
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {drill && (
        <p className="chart-help">
          Select an active chart point to open its source trades. Exact
          observations are also linked in the table below.
        </p>
      )}
    </div>
  );
}
