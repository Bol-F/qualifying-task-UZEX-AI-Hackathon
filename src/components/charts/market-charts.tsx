"use client";
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
  "#15d6a0",
  "#3b82f6",
  "#a78bfa",
  "#38bdf8",
  "#fbbf24",
  "#fb7185",
  "#64748b",
  "#cbd5e1",
];
const tooltip = {
  contentStyle: {
    background: "#17243a",
    border: "1px solid #2a3a50",
    borderRadius: 8,
    color: "#f1f5f9",
  },
  labelStyle: { color: "#94a3b8" },
  itemStyle: { color: "#15d6a0" },
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
  const points = dashboardPoints(data, metric, group);
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart
        data={points}
        margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15d6a0" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#15d6a0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="#233046"
          strokeDasharray="3 4"
        />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => String(v).slice(5)}
          tick={{ fill: "#7f91aa", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          tick={{ fill: "#7f91aa", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => number(v, true)}
          width={54}
          allowDecimals={metric !== "count"}
        />
        <Tooltip
          {...tooltip}
          formatter={(v) => [
            v === null ? "Unavailable" : `${number(String(v))} ${group}`,
            metric === "count"
              ? "Transactions"
              : metric === "value"
                ? "Trade value"
                : "Quantity",
          ]}
        />
        <Area
          isAnimationActive={false}
          connectNulls={false}
          type="monotone"
          dataKey="value"
          stroke="#15d6a0"
          strokeWidth={2.5}
          fill="url(#activity-fill)"
          activeDot={{ r: 5, stroke: "#0b1120", strokeWidth: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
export function CommodityChart({ data }: { data: Analytics }) {
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
          <small>commodities</small>
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
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart
        data={data.daily.map((d) => ({
          date: d.date.slice(5),
          count: d.count,
        }))}
      >
        <CartesianGrid vertical={false} stroke="#233046" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#7f91aa", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          minTickGap={35}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "#7f91aa", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={25}
        />
        <Tooltip {...tooltip} />
        <Bar
          isAnimationActive={false}
          dataKey="count"
          name="Transactions"
          fill="#3b82f6"
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
