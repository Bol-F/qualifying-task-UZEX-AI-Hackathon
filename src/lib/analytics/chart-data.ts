import type { Analytics } from "./calculations";
export function dashboardPoints(
  data: Analytics,
  metric: "count" | "value" | "volume",
  group: string,
) {
  return data.daily.map((d) => {
    const value =
      metric === "count"
        ? String(d.count)
        : metric === "value"
          ? d.values[group]
          : d.quantities[group];
    return { date: d.date, value: value === undefined ? null : Number(value) };
  });
}
