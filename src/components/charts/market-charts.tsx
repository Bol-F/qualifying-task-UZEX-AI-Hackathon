"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import type { Analytics } from "@/lib/analytics/calculations";
import { number } from "@/lib/utils";
import { dashboardPoints } from "@/lib/analytics/chart-data";
const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-axis)",
  "var(--chart-7)",
];
const tooltip = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--chart-axis)" },
  itemStyle: { color: "var(--chart-1)" },
};
export function ActivityChart({
  data,
  metric,
  group,
}: {
  data: Analytics;
  metric: "count" | "value" | "volume";
  group: string;
}) {
  const { t: tr } = usePreferences();
  const points = dashboardPoints(data, metric, group);
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart
        data={points}
        margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="var(--chart-grid)"
          strokeDasharray="3 4"
        />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => String(v).slice(5)}
          tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => number(v, true)}
          width={54}
          allowDecimals={metric !== "count"}
        />
        <Tooltip
          {...tooltip}
          formatter={(v) => [
            v === null
              ? tr("Unavailable")
              : `${number(String(v))} ${tr(group)}`,
            tr(
              metric === "count"
                ? "Transactions"
                : metric === "value"
                  ? "Trade value"
                  : "Quantity",
            ),
          ]}
        />
        <Area
          isAnimationActive={false}
          connectNulls={false}
          type="monotone"
          dataKey="value"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          fill="url(#activity-fill)"
          activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
export function CommodityChart({ data }: { data: Analytics }) {
  const { t: tr } = usePreferences();
  return (
    <>
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height={185}>
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={data.products}
              dataKey="count"
              nameKey="name"
              innerRadius={62}
              outerRadius={84}
              paddingAngle={3}
              stroke="none"
            >
              {data.products.map((p, i) => (
                <Cell key={p.name} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>{data.products.length}</strong>
          <small>{tr("commodities")}</small>
        </div>
      </div>
      <div className="chart-legend">
        {data.products.map((p, i) => (
          <div key={p.name}>
            <span style={{ background: colors[i % colors.length] }} />
            <label>{p.name}</label>
            <strong>
              {data.count ? Math.round((p.count / data.count) * 100) : 0}%
            </strong>
          </div>
        ))}
      </div>
    </>
  );
}
export function DailyBars({ data }: { data: Analytics }) {
  const { t: tr } = usePreferences();
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart
        data={data.daily.map((d) => ({
          date: d.date.slice(5),
          count: d.count,
        }))}
      >
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          minTickGap={35}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={25}
        />
        <Tooltip {...tooltip} />
        <Bar
          isAnimationActive={false}
          dataKey="count"
          name={tr("Transactions")}
          fill="var(--chart-2)"
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
