import type { Trade } from "@/types";
export function demoQuestions(rows: Trade[]) {
  const urea = rows.filter((t) =>
    /urea|karbam|карбам/i.test(t.normalized_product_name),
  );
  const selected = urea.length ? urea : rows;
  const dates = [...new Set(selected.map((t) => t.trade_date))].sort();
  const date = dates.at(-1) ?? null;
  const name = selected[0]?.product_name ?? null;
  const question =
    date && name
      ? `Покажи сделки по ${urea.length ? "карбамиду" : name} за ${date}.`
      : "Какие товары торговались наиболее активно?";
  return {
    date,
    commodity: name,
    previous: dates.at(-2) ?? null,
    questions: [
      question,
      "Endi eng katta 5 tasini ko'rsat.",
      "Построй график и сравни количество сделок с предыдущим доступным торговым днём.",
    ],
    uzbek: urea.length
      ? `Karbamid bo‘yicha ${date} bitimlarni ko‘rsat.`
      : "Eng faol mahsulotlar qaysilar?",
    chart: "Create a bar chart of the ten most active commodities.",
  };
}
