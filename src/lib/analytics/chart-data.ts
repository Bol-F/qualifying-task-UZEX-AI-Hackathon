import type { Analytics } from "./calculations";
export function dashboardPoints(
  data: Analytics,
  metric: "count" | "value" | "volume",
  group: string,
) {
  return data.daily.flatMap((d, i) => {
    const value =
      metric === "count"
        ? String(d.count)
        : metric === "value"
          ? d.values[group]
          : d.quantities[group];
    const point = {
      date: d.date,
      value: value === undefined ? null : Number(value),
    };
    const previous = data.daily[i - 1];
    if (
      previous &&
      Date.parse(d.date) - Date.parse(previous.date) > 7 * 86400000
    ) {
      return [
        {
          date: new Date(Date.parse(previous.date) + 86400000)
            .toISOString()
            .slice(0, 10),
          value: null,
        },
        point,
      ];
    }
    return [point];
  });
}
