export type Language = "uz" | "ru";
export function detectLanguage(
  text: string,
  fallback: Language = "uz",
): Language {
  if (/на узбек|answer.*uzbek|o[‘'’`]?zbek(?:cha)?|ўзбекча/i.test(text))
    return "uz";
  if (/на русском|ruscha|русча|answer.*russian/i.test(text)) return "ru";
  if (/[ўқғҳ]|энди|бешта|кўрсат|савдо|битим|нечта|катта/i.test(text))
    return "uz";
  if (
    /\b(bugun|bitim|qaysi|savdo|mahsulot|ko.rsat|nechta|endi|katta|bo.yicha|solishtir)\b/i.test(
      text,
    )
  )
    return "uz";
  return /[а-яё]/i.test(text)
    ? "ru"
    : /\b(bugun|bitim|qaysi|savdo|mahsulot|ko.rsat|nechta)\b/i.test(text)
      ? "uz"
      : fallback;
}
export const copy = {
  uz: {
    hello: "Bozorni yaxshiroq tushuning.",
    sub: "Savolingizni bering. Javoblarni ma’lumotlardan topamiz.",
    placeholder: "Bitimlar, mahsulotlar yoki savdo natijalari haqida so‘rang…",
    questions: [
      "Eng faol mahsulotlar qaysilar?",
      "Karbamid bo‘yicha bitimlarni ko‘rsat.",
      "Bugun nechta bitim tuzilgan?",
      "2026-10-29 va 2026-10-30 kunlarini solishtir.",
    ],
  },
  ru: {
    hello: "Понимайте рынок глубже.",
    sub: "Задайте вопрос. Найдём ответ в данных.",
    placeholder: "Спросите о сделках, товарах или результатах торгов…",
    questions: [
      "Какие товары торговались наиболее активно?",
      "Покажи сделки по карбамиду.",
      "Сколько сделок было заключено сегодня?",
      "Сравни 2026-10-29 и 2026-10-30.",
    ],
  },
};
