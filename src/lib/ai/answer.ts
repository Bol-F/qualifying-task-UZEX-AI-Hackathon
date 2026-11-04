import "server-only";
import { allTrades } from "@/lib/db/queries";
import { dataMode } from "@/lib/db/client";
import { summarize } from "@/lib/analytics/calculations";
import type { QueryPlan } from "./tools";
import type { Language } from "@/lib/i18n";
const glossary = {
  spot: {
    ru: "Спот — договор с поставкой в короткий срок, определённый условиями контракта.",
    uz: "Spot — shartnomada belgilangan qisqa muddatda yetkazib beriladigan savdo.",
  },
  forward: {
    ru: "Форвард — договор на будущую поставку по согласованным условиям.",
    uz: "Forvard — kelajakda kelishilgan shartlar asosida yetkazib berish shartnomasi.",
  },
  quantity: {
    ru: "Объём учитывается отдельно по каждой единице измерения. Тонны и м³ не суммируются.",
    uz: "Hajm har bir o‘lchov birligi uchun alohida hisoblanadi. Tonna va m³ qo‘shilmaydi.",
  },
  price_basis: {
    ru: "База цены — единица, к которой относится цена. Стоимость вычисляется только при совпадении базы цены и единицы количества.",
    uz: "Narx bazasi — narx tegishli bo‘lgan birlik. Qiymat faqat narx va miqdor birliklari mos kelganda hisoblanadi.",
  },
  exchange: {
    ru: "Товарная биржа организует торги по установленным правилам. Конкретные условия определяются договором.",
    uz: "Tovar birjasi belgilangan qoidalar asosida savdoni tashkil etadi. Aniq shartlar shartnomada belgilanadi.",
  },
};
export async function answer(plan: QueryPlan, lang: Language) {
  const mode = dataMode();
  const prefix =
    mode === "demo"
      ? lang === "ru"
        ? "**ДЕМО: синтетические данные, не реальные сделки UZEX.**"
        : "**DEMO: sun’iy ma’lumotlar, haqiqiy UZEX bitimlari emas.**"
      : lang === "ru"
        ? "**Источник: импортированные записи.**"
        : "**Manba: import qilingan yozuvlar.**";
  if (plan.intent === "glossary")
    return { text: glossary[plan.term ?? "exchange"][lang], rows: [], mode };
  if (plan.intent === "unsupported")
    return {
      text:
        lang === "ru"
          ? "Данные недоступны для этого запроса. Спросите о количестве сделок, карбамиде, активных товарах или сравнении двух дат (ГГГГ-ММ-ДД). Без Gemini доступны только эти шаблоны."
          : "Bu so‘rov uchun ma’lumot mavjud emas. Bitimlar soni, karbamid, faol mahsulotlar yoki ikki sana (YYYY-MM-DD) haqida so‘rang. Gemini sozlanmaganda faqat ushbu so‘rovlar ishlaydi.",
      rows: [],
      mode,
    };
  if (plan.intent === "compare" && plan.dates) {
    const result = await Promise.all(
      plan.dates.map(async (date) => ({
        date,
        count: (await allTrades({ from: date, to: date, search: plan.search }))
          .length,
      })),
    );
    return {
      text: `${prefix}\n\n| ${lang === "ru" ? "Дата | Сделки" : "Sana | Bitimlar"} |\n|---|---:|\n${result.map((r) => `| ${r.date} | ${r.count} |`).join("\n")}\n\n${lang === "ru" ? "Разница" : "Farq"}: ${result[1].count - result[0].count}`,
      rows: [],
      mode,
    };
  }
  const rows = await allTrades({
      search: plan.search,
      from: plan.from,
      to: plan.to,
    }),
    stats = summarize(rows);
  const scope = `${plan.from ?? "…"} → ${plan.to ?? "…"}`;
  const text = rows.length
    ? `${prefix}\n\n### ${lang === "ru" ? "Результаты анализа" : "Tahlil natijalari"}\n\n${lang === "ru" ? "Период" : "Davr"}: ${scope}\n\n**${stats.count}** ${lang === "ru" ? "сделок найдено" : "ta bitim topildi"}.\n\n${
        plan.intent === "active"
          ? `| ${lang === "ru" ? "Товар | Сделки" : "Mahsulot | Bitimlar"} |\n|---|---:|\n${stats.products.map((p) => `| ${p.name} | ${p.count} |`).join("\n")}`
          : `${lang === "ru" ? "Стоимость по валютам" : "Valyuta bo‘yicha qiymat"}: ${
              Object.entries(stats.values)
                .map(([c, v]) => `${v} ${c}`)
                .join("; ") || "—"
            }\n\n${lang === "ru" ? "Количество по единицам" : "Birlik bo‘yicha miqdor"}: ${Object.entries(
              stats.quantities,
            )
              .map(([u, v]) => `${v} ${u}`)
              .join("; ")}`
      }`
    : `${prefix}\n\n${lang === "ru" ? `За период ${scope} записей не найдено. Это не подтверждает отсутствие торгов на бирже.` : `${scope} davrida yozuvlar topilmadi. Bu birjada savdo bo‘lmaganini tasdiqlamaydi.`}`;
  return {
    text,
    rows: rows.slice(0, 5),
    mode,
    total: rows.length,
    scope,
    excluded: stats.excluded,
  };
}
